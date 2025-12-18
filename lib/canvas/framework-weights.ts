/**
 * Framework Dimension Weights Configuration
 *
 * Defines the weight of each dimension for framework health score calculation.
 * Formula: Framework Health Score = Σ(Dimension Score × Weight)
 *
 * Weights must sum to 1.0 for each framework.
 */

export const FRAMEWORK_DIMENSION_WEIGHTS: Record<string, Record<string, number>> = {
  "lean-canvas": {
    problem: 0.15,
    solution: 0.15,
    "unique-value": 0.15,
    "customer-segments": 0.10,
    channels: 0.10,
    revenue: 0.10,
    cost: 0.10,
    "key-metrics": 0.10,
    "unfair-advantage": 0.05,
  },
  "design-thinking": {
    empathize: 0.25,
    define: 0.20,
    ideate: 0.20,
    prototype: 0.20,
    test: 0.15,
  },
  "business-canvas": {
    "key-partners": 0.10,
    "key-activities": 0.10,
    "key-resources": 0.10,
    "value-propositions": 0.15,
    "customer-relationships": 0.10,
    channels: 0.10,
    "customer-segments": 0.15,
    "cost-structure": 0.10,
    "revenue-streams": 0.10,
  },
  "okr-framework": {
    vision: 0.20,
    objectives: 0.30,
    "key-results": 0.30,
    initiatives: 0.20,
  },
  "jobs-to-be-done": {
    "job-statement": 0.25,
    "desired-outcomes": 0.25,
    "current-solutions": 0.20,
    "job-circumstances": 0.15,
    "job-constraints": 0.15,
  },
};

/**
 * Validate that all framework weights sum to 1.0
 * Throws an error if any framework has invalid weights
 */
export function validateFrameworkWeights(): void {
  const TOLERANCE = 0.01; // Allow 1% tolerance for floating point arithmetic

  for (const [frameworkId, weights] of Object.entries(FRAMEWORK_DIMENSION_WEIGHTS)) {
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);

    if (Math.abs(sum - 1.0) > TOLERANCE) {
      throw new Error(
        `Framework "${frameworkId}" weights sum to ${sum.toFixed(3)}, not 1.0 (tolerance: ${TOLERANCE})`
      );
    }
  }
}

/**
 * Get weights for a specific framework
 * Returns undefined if framework not found
 */
export function getFrameworkWeights(frameworkId: string): Record<string, number> | undefined {
  return FRAMEWORK_DIMENSION_WEIGHTS[frameworkId];
}

/**
 * Calculate weighted average score from dimension scores
 *
 * @param dimensionScores - Object mapping dimensionKey to score (0-100)
 * @param frameworkId - Framework ID to get weights from
 * @returns Weighted average score (0-100), or null if framework not found
 *
 * @example
 * ```ts
 * const scores = { problem: 85, solution: 90, "unique-value": 70, ... };
 * const total = calculateWeightedScore(scores, "lean-canvas");
 * // Returns: 74.25
 * ```
 */
export function calculateWeightedScore(
  dimensionScores: Record<string, number>,
  frameworkId: string
): number | null {
  const weights = getFrameworkWeights(frameworkId);
  if (!weights) {
    return null;
  }

  let totalScore = 0;
  let totalWeight = 0;

  for (const [dimensionKey, score] of Object.entries(dimensionScores)) {
    const weight = weights[dimensionKey];
    if (weight !== undefined) {
      totalScore += score * weight;
      totalWeight += weight;
    }
  }

  // Normalize if not all dimensions were provided
  return totalWeight > 0 ? (totalScore / totalWeight) * (totalWeight === 1.0 ? 1.0 : totalWeight) : 0;
}

// Validate weights on module load
validateFrameworkWeights();
