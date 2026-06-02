export interface QueryEvalResult {
  id: number;
  question: string;
  category: 'in-scope' | 'out-of-scope';
  isNearMiss?: boolean;
  expectedSource?: string;
  topScore: number;
  topSource?: string;
  allScores: number[];
}

export interface MetricSummary {
  threshold: number;
  total: number;
  inScopeCount: number;
  outOfScopeCount: number;
  truePositives: number; // in-scope & score >= threshold
  falseNegatives: number; // in-scope & score < threshold (over-refusal)
  trueNegatives: number; // out-of-scope & score < threshold (zero-quota blocked)
  falsePositives: number; // out-of-scope & score >= threshold (hallucination risk)
  gatePrecision: number; // TP / (TP + FP)
  gateRecall: number; // TP / (TP + FN)
  gateF1: number; // 2 * (P * R) / (P + R)
  gateAccuracy: number; // (TP + TN) / total
  top1SourceAccuracy: number; // fraction of in-scope where topSource === expectedSource
  zeroQuotaSavingsCount: number; // total TN queries
}

/**
 * Pure function computing retrieval-gate confusion matrix and source attribution accuracy.
 */
export function computeMetrics(results: QueryEvalResult[], threshold: number): MetricSummary {
  let truePositives = 0;
  let falseNegatives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;

  let inScopeCount = 0;
  let outOfScopeCount = 0;
  let correctSourceCount = 0;

  for (const item of results) {
    const passedGate = item.topScore >= threshold;

    if (item.category === 'in-scope') {
      inScopeCount++;
      if (passedGate) {
        truePositives++;
        // Check source attribution
        if (item.expectedSource && item.topSource === item.expectedSource) {
          correctSourceCount++;
        }
      } else {
        falseNegatives++;
      }
    } else {
      outOfScopeCount++;
      if (passedGate) {
        falsePositives++;
      } else {
        trueNegatives++;
      }
    }
  }

  const total = results.length;
  const precisionDenominator = truePositives + falsePositives;
  const gatePrecision = precisionDenominator > 0 ? truePositives / precisionDenominator : 0;

  const recallDenominator = truePositives + falseNegatives;
  const gateRecall = recallDenominator > 0 ? truePositives / recallDenominator : 0;

  const f1Denominator = gatePrecision + gateRecall;
  const gateF1 = f1Denominator > 0 ? (2 * gatePrecision * gateRecall) / f1Denominator : 0;

  const gateAccuracy = total > 0 ? (truePositives + trueNegatives) / total : 0;

  // Source attribution: accuracy on all in-scope queries
  const top1SourceAccuracy = inScopeCount > 0 ? correctSourceCount / inScopeCount : 0;

  return {
    threshold,
    total,
    inScopeCount,
    outOfScopeCount,
    truePositives,
    falseNegatives,
    trueNegatives,
    falsePositives,
    gatePrecision: Number(gatePrecision.toFixed(4)),
    gateRecall: Number(gateRecall.toFixed(4)),
    gateF1: Number(gateF1.toFixed(4)),
    gateAccuracy: Number(gateAccuracy.toFixed(4)),
    top1SourceAccuracy: Number(top1SourceAccuracy.toFixed(4)),
    zeroQuotaSavingsCount: trueNegatives,
  };
}
