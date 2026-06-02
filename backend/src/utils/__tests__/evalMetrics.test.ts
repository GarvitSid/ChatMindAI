import { computeMetrics, QueryEvalResult } from '../evalMetrics.js';

describe('Evaluation Metrics Pure Math Unit Tests', () => {
  const syntheticDataset: QueryEvalResult[] = [
    // 3 In-scope: 2 high score (pass), 1 low score (fail)
    {
      id: 1,
      question: 'In-scope query 1',
      category: 'in-scope',
      expectedSource: 'admissions_2025.txt',
      topScore: 0.85,
      topSource: 'admissions_2025.txt',
      allScores: [0.85, 0.70, 0.60],
    },
    {
      id: 2,
      question: 'In-scope query 2',
      category: 'in-scope',
      expectedSource: 'tuition_and_fees.txt',
      topScore: 0.65,
      topSource: 'tuition_and_fees.txt',
      allScores: [0.65, 0.50, 0.40],
    },
    {
      id: 3,
      question: 'In-scope query 3 (under-retrieved)',
      category: 'in-scope',
      expectedSource: 'placements_report.txt',
      topScore: 0.45,
      topSource: 'placements_report.txt',
      allScores: [0.45, 0.40, 0.30],
    },
    // 3 Out-of-scope: 1 high score (false positive), 2 low score (true negatives)
    {
      id: 4,
      question: 'Out-of-scope query 1 (near-miss false positive)',
      category: 'out-of-scope',
      topScore: 0.55,
      topSource: 'admissions_2025.txt',
      allScores: [0.55, 0.45, 0.35],
    },
    {
      id: 5,
      question: 'Out-of-scope query 2 (refused)',
      category: 'out-of-scope',
      topScore: 0.30,
      topSource: 'hostel_and_campus_rules.txt',
      allScores: [0.30, 0.25, 0.20],
    },
    {
      id: 6,
      question: 'Out-of-scope query 3 (refused)',
      category: 'out-of-scope',
      topScore: 0.20,
      topSource: 'placements_report.txt',
      allScores: [0.20, 0.15, 0.10],
    },
  ];

  it('should correctly compute confusion matrix and gate metrics at threshold 0.50', () => {
    // At threshold = 0.50:
    // In-scope:
    // - id 1 (0.85 >= 0.50) -> TP (correct source)
    // - id 2 (0.65 >= 0.50) -> TP (correct source)
    // - id 3 (0.45 < 0.50) -> FN
    // Out-of-scope:
    // - id 4 (0.55 >= 0.50) -> FP
    // - id 5 (0.30 < 0.50) -> TN
    // - id 6 (0.20 < 0.50) -> TN
    const metrics = computeMetrics(syntheticDataset, 0.50);

    expect(metrics.total).toBe(6);
    expect(metrics.inScopeCount).toBe(3);
    expect(metrics.outOfScopeCount).toBe(3);

    expect(metrics.truePositives).toBe(2);
    expect(metrics.falseNegatives).toBe(1);
    expect(metrics.trueNegatives).toBe(2);
    expect(metrics.falsePositives).toBe(1);

    // Gate Precision = TP / (TP + FP) = 2 / (2 + 1) = 2/3 = 0.6667
    expect(metrics.gatePrecision).toBeCloseTo(0.6667, 3);

    // Gate Recall = TP / (TP + FN) = 2 / (2 + 1) = 2/3 = 0.6667
    expect(metrics.gateRecall).toBeCloseTo(0.6667, 3);

    // Gate Accuracy = (2 + 2) / 6 = 4/6 = 0.6667
    expect(metrics.gateAccuracy).toBeCloseTo(0.6667, 3);

    // F1 = 0.6667
    expect(metrics.gateF1).toBeCloseTo(0.6667, 3);

    // Top-1 Source Accuracy = 2 correct / 3 in-scope = 0.6667
    expect(metrics.top1SourceAccuracy).toBeCloseTo(0.6667, 3);

    // Zero quota savings = 2
    expect(metrics.zeroQuotaSavingsCount).toBe(2);
  });

  it('should eliminate False Positives when threshold is raised to 0.60', () => {
    // At threshold = 0.60:
    // In-scope: id 1 (0.85) -> TP, id 2 (0.65) -> TP, id 3 (0.45) -> FN
    // Out-of-scope: id 4 (0.55) -> TN, id 5 (0.30) -> TN, id 6 (0.20) -> TN
    const metrics = computeMetrics(syntheticDataset, 0.60);

    expect(metrics.truePositives).toBe(2);
    expect(metrics.falsePositives).toBe(0);
    expect(metrics.falseNegatives).toBe(1);
    expect(metrics.trueNegatives).toBe(3);

    // Gate Precision = 2 / (2 + 0) = 1.0 (100% precision!)
    expect(metrics.gatePrecision).toBe(1.0);

    // Gate Recall = 2 / 3 = 0.6667
    expect(metrics.gateRecall).toBeCloseTo(0.6667, 3);

    // Zero-quota savings: all 3 out-of-scope blocked
    expect(metrics.zeroQuotaSavingsCount).toBe(3);
  });
});
