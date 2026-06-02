import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { getPineconeIndex } from '../config/pinecone.js';
import { RagService } from '../services/rag.service.js';
import { RAG_CONFIG } from '../config/rag.config.js';
import { EVAL_NAMESPACE } from './seedEvalNamespace.js';
import { computeMetrics, QueryEvalResult, MetricSummary } from '../utils/evalMetrics.js';

const QUESTIONS_PATH = path.resolve(process.cwd(), 'eval/questions.json');
const RESULTS_DIR = path.resolve(process.cwd(), 'eval/results');

async function evaluateQuestionSet(
  questions: any[],
  targetNamespace: any
): Promise<QueryEvalResult[]> {
  const results: QueryEvalResult[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    process.stdout.write(`\rEvaluating query [${i + 1}/${questions.length}]: "${q.question.slice(0, 45)}..."`);

    // Reuse production query embedding logic
    const queryVector = await RagService.getEmbeddingForQuery(q.question);

    // Query Pinecone scoped strictly to benchmark namespace
    const searchRes = await targetNamespace.query({
      vector: queryVector,
      topK: RAG_CONFIG.topK,
      includeMetadata: true,
    });

    const matches = searchRes.matches || [];
    const topScore = matches.length > 0 ? (matches[0].score ?? 0) : 0;
    const topSource = matches.length > 0 ? (matches[0].metadata?.filename as string) : undefined;
    const allScores = matches.map((m: any) => m.score ?? 0);

    results.push({
      id: q.id,
      question: q.question,
      category: q.category,
      isNearMiss: q.isNearMiss,
      expectedSource: q.expectedSource,
      topScore,
      topSource,
      allScores,
    });
  }

  process.stdout.write('\n');
  return results;
}

export async function runEvaluation() {
  console.log('\n========================================================================');
  console.log('CHATMIND AI - EMPIRICAL RAG RETRIEVAL & THRESHOLD EVALUATION');
  console.log(`Model: ${process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001'} (768-dim L2 normalized)`);
  console.log(`Pinecone Namespace: "${EVAL_NAMESPACE}" | Top-K: ${RAG_CONFIG.topK}`);
  console.log('========================================================================\n');

  // 1. Pre-flight check
  const pineconeIndex = getPineconeIndex();
  const stats = await pineconeIndex.describeIndexStats();
  const vectorCount = stats.namespaces?.[EVAL_NAMESPACE]?.recordCount || 0;

  if (vectorCount === 0) {
    console.error(`\n[ERROR] Namespace "${EVAL_NAMESPACE}" is empty (0 vectors found).`);
    console.error(`Please run "npm run eval:seed" first to ingest the benchmark documents.\n`);
    process.exit(1);
  }

  console.log(`[Pre-flight Check Passed] Found ${vectorCount} vectors in namespace "${EVAL_NAMESPACE}".\n`);

  if (!fs.existsSync(QUESTIONS_PATH)) {
    throw new Error(`Questions dataset not found at: ${QUESTIONS_PATH}`);
  }

  const dataset = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf-8'));
  const tuningQuestions = dataset.tuning || [];
  const heldOutQuestions = dataset.heldOut || [];

  const targetNamespace = pineconeIndex.namespace(EVAL_NAMESPACE);

  // 2. Evaluate Tuning Set (30 queries)
  console.log(`--- PHASE 1: EVALUATING TUNING SET (${tuningQuestions.length} queries) ---`);
  const tuningResults = await evaluateQuestionSet(tuningQuestions, targetNamespace);

  // Candidate thresholds to sweep
  const candidateThresholds = [0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70];
  const sweepTable: MetricSummary[] = [];

  for (const th of candidateThresholds) {
    sweepTable.push(computeMetrics(tuningResults, th));
  }

  console.log('\n--- TUNING THRESHOLD SWEEP SCORECARD ---');
  console.log('| Threshold | Recall | Near-Miss Refusal | Precision | F1-Score | Accuracy | Hit@1 Source | Zero-Quota Saved |');
  console.log('| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |');

  for (const row of sweepTable) {
    console.log(
      `|   ${row.threshold.toFixed(2)}    | ${(row.gateRecall * 100).toFixed(1)}% |      ${row.trueNegatives}/${row.outOfScopeCount} (${((row.trueNegatives / row.outOfScopeCount) * 100).toFixed(0)}%)      |   ${(row.gatePrecision * 100).toFixed(1)}%   |  ${row.gateF1.toFixed(3)}   |  ${(row.gateAccuracy * 100).toFixed(1)}%   |    ${(row.top1SourceAccuracy * 100).toFixed(1)}%     |      ${row.zeroQuotaSavingsCount}/${row.outOfScopeCount}       |`
    );
  }

  // Find optimal threshold (highest F1, tie-breaker: highest precision / zero-quota refusal)
  const sortedByF1 = [...sweepTable].sort((a, b) => b.gateF1 - a.gateF1 || b.gatePrecision - a.gatePrecision);
  const optimalRow = sortedByF1[0];
  const optimalThreshold = optimalRow.threshold;

  console.log(`\nOptimal Selected Threshold from Tuning: MIN_SIMILARITY = ${optimalThreshold.toFixed(2)} (F1: ${optimalRow.gateF1})`);

  // 3. Evaluate Held-Out Set (10 queries)
  console.log(`\n--- PHASE 2: EVALUATING HELD-OUT TEST SET (${heldOutQuestions.length} queries at threshold ${optimalThreshold}) ---`);
  const heldOutResults = await evaluateQuestionSet(heldOutQuestions, targetNamespace);
  const heldOutMetrics = computeMetrics(heldOutResults, optimalThreshold);

  console.log('\n--- HELD-OUT UNBIASED TEST SCORECARD ---');
  console.log(`Held-Out Test Size:       ${heldOutMetrics.total} questions (5 in-scope, 5 out-of-scope)`);
  console.log(`Optimal Threshold (θ*):   ${heldOutMetrics.threshold.toFixed(2)}`);
  console.log(`Gate Precision:           ${(heldOutMetrics.gatePrecision * 100).toFixed(1)}%`);
  console.log(`Gate Recall:              ${(heldOutMetrics.gateRecall * 100).toFixed(1)}%`);
  console.log(`Gate F1-Score:            ${heldOutMetrics.gateF1}`);
  console.log(`Gate Accuracy:            ${(heldOutMetrics.gateAccuracy * 100).toFixed(1)}%`);
  console.log(`Hit@1 Source Accuracy:    ${(heldOutMetrics.top1SourceAccuracy * 100).toFixed(1)}%`);
  console.log(`Zero-Quota Blocked:       ${heldOutMetrics.zeroQuotaSavingsCount}/${heldOutMetrics.outOfScopeCount} (${((heldOutMetrics.zeroQuotaSavingsCount / heldOutMetrics.outOfScopeCount) * 100).toFixed(0)}%)`);

  // 4. Save results to eval/results/
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const outPath = path.join(RESULTS_DIR, `eval_sweep_${dateStr}.json`);

  const outputPayload = {
    timestamp: new Date().toISOString(),
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
    dimensions: 768,
    topK: RAG_CONFIG.topK,
    namespace: EVAL_NAMESPACE,
    optimalThreshold,
    tuningMetrics: optimalRow,
    heldOutMetrics,
    sweepTable,
    tuningDetails: tuningResults,
    heldOutDetails: heldOutResults,
  };

  fs.writeFileSync(outPath, JSON.stringify(outputPayload, null, 2), 'utf-8');
  console.log(`\n[Saved] Detailed evaluation results exported to: ${outPath}\n`);

  return { optimalThreshold, optimalRow, heldOutMetrics };
}

if (process.argv[1]?.includes('runEval')) {
  runEvaluation()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Eval Runner Error]', err);
      process.exit(1);
    });
}
