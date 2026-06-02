import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { getPineconeIndex } from '../config/pinecone.js';
import { RagService } from '../services/rag.service.js';
import { RAG_CONFIG } from '../config/rag.config.js';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export const EVAL_NAMESPACE = 'benchmark-eval';

const DOCS_DIR = path.resolve(process.cwd(), 'eval/docs');

export async function seedEvalNamespace(force = false) {
  console.log('====================================================');
  console.log(`[Eval Seeder] Seeding benchmark docs into namespace: "${EVAL_NAMESPACE}"`);
  console.log('====================================================');

  const pineconeIndex = getPineconeIndex();
  const targetNamespace = pineconeIndex.namespace(EVAL_NAMESPACE);

  // Check existing records in namespace
  const stats = await pineconeIndex.describeIndexStats();
  const existingCount = stats.namespaces?.[EVAL_NAMESPACE]?.recordCount || 0;
  console.log(`Current vectors in namespace "${EVAL_NAMESPACE}": ${existingCount}`);

  if (existingCount > 0 && !force) {
    console.log(`[Eval Seeder] Namespace already contains ${existingCount} vectors. Use --force to reseed.`);
    return existingCount;
  }

  if (!fs.existsSync(DOCS_DIR)) {
    throw new Error(`Docs directory not found: ${DOCS_DIR}`);
  }

  const docFiles = fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith('.txt'));
  if (docFiles.length === 0) {
    throw new Error(`No .txt benchmark documents found in ${DOCS_DIR}`);
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: RAG_CONFIG.chunkSize,
    chunkOverlap: RAG_CONFIG.chunkOverlap,
  });

  let totalUpserted = 0;

  for (const file of docFiles) {
    const filePath = path.join(DOCS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8').trim();

    console.log(`\nProcessing: ${file} (${content.length} characters)...`);
    const chunkDocs = await splitter.createDocuments([content], [{ filename: file }]);
    console.log(`  Split into ${chunkDocs.length} chunks.`);

    const chunkTexts = chunkDocs.map((c) => c.pageContent);
    const embeddings = await RagService.batchEmbedChunks(chunkTexts);

    const vectorsToUpsert = [];
    for (let i = 0; i < chunkDocs.length; i++) {
      vectorsToUpsert.push({
        id: `eval_${file.replace('.txt', '')}_chunk_${i}`,
        values: embeddings[i],
        metadata: {
          text: chunkDocs[i].pageContent,
          filename: file,
        },
      });
    }

    // Batch upsert to Pinecone namespace in batches of 50
    for (let i = 0; i < vectorsToUpsert.length; i += RAG_CONFIG.pineconeUpsertBatchSize) {
      const batch = vectorsToUpsert.slice(i, i + RAG_CONFIG.pineconeUpsertBatchSize);
      await targetNamespace.upsert(batch);
    }

    totalUpserted += vectorsToUpsert.length;
    console.log(`  Successfully upserted ${vectorsToUpsert.length} vectors to namespace "${EVAL_NAMESPACE}".`);
  }

  console.log('\n====================================================');
  console.log(`[Eval Seeder Complete] Total vectors indexed in "${EVAL_NAMESPACE}": ${totalUpserted}`);
  console.log('Zero MongoDB records were written. Production collections remain untouched.');
  console.log('====================================================\n');

  return totalUpserted;
}

// Execute directly if run as a script
if (process.argv[1]?.includes('seedEvalNamespace')) {
  const force = process.argv.includes('--force');
  seedEvalNamespace(force)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Eval Seeder Error]', err);
      process.exit(1);
    });
}
