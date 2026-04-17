function solve3x3(m, r) {
  // Gaussian elimination for 3x3
  const n = 3;
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxEl = Math.abs(m[i][i]), maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(m[k][i]) > maxEl) {
        maxEl = Math.abs(m[k][i]);
        maxRow = k;
      }
    }
    // Swap rows
    for (let k = i; k < n; k++) {
      const tmp = m[maxRow][k];
      m[maxRow][k] = m[i][k];
      m[i][k] = tmp;
    }
    const tmpR = r[maxRow];
    r[maxRow] = r[i];
    r[i] = tmpR;

    // Eliminate
    for (let k = i + 1; k < n; k++) {
      const c = -m[k][i] / m[i][i];
      for (let j = i; j < n; j++) {
        if (i === j) m[k][j] = 0;
        else m[k][j] += c * m[i][j];
      }
      r[k] += c * r[i];
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = r[i] / m[i][i];
    for (let k = i - 1; k >= 0; k--) {
      r[k] -= m[k][i] * x[i];
    }
  }
  return x;
}

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const roundTo = (n, digits = 2) => Number(n.toFixed(digits));

export class SensitivityOptimizer {
  static analyze(results, dpi = 800) {
    if (results.length < 4) return null;

    const n = results.length;
    const sumX = results.reduce((s, r) => s + r.valorantSensitivity, 0);
    const sumX2 = results.reduce((s, r) => s + r.valorantSensitivity ** 2, 0);
    const sumX3 = results.reduce((s, r) => s + r.valorantSensitivity ** 3, 0);
    const sumX4 = results.reduce((s, r) => s + r.valorantSensitivity ** 4, 0);
    const sumY = results.reduce((s, r) => s + r.compositeScore, 0);
    const sumXY = results.reduce((s, r) => s + r.valorantSensitivity * r.compositeScore, 0);
    const sumX2Y = results.reduce((s, r) => s + r.valorantSensitivity ** 2 * r.compositeScore, 0);

    const matrix = [
      [sumX4, sumX3, sumX2],
      [sumX3, sumX2, sumX],
      [sumX2, sumX,  n],
    ];
    const rhs = [sumX2Y, sumXY, sumY];
    const [a, b, c] = solve3x3(matrix, rhs);

    const optimalSens = a !== 0 ? -b / (2 * a) : sumX / n;
    const optimalScore = a * optimalSens ** 2 + b * optimalSens + c;

    const threshold = optimalScore * 0.95;
    const discriminant = b ** 2 - 4 * a * (c - threshold);
    let rangeMin = optimalSens * 0.8, rangeMax = optimalSens * 1.2;
    if (discriminant >= 0 && a !== 0) {
      rangeMin = (-b - Math.sqrt(discriminant)) / (2 * a);
      rangeMax = (-b + Math.sqrt(discriminant)) / (2 * a);
    }

    const pareto = this.computeParetoFrontier(results);
    const stabilityScore = results.reduce((s, r) => {
      return s + (r.avgCorrections < 1.5 ? 1 : r.avgCorrections < 3 ? 0.5 : 0);
    }, 0) / results.length;

    return {
      recommendedValorantSensitivity: roundTo(optimalSens),
      recommendedSiteSensitivity: roundTo(optimalSens), // Assuming 1:1 for simplicity if not provided conversion
      rangeMin: roundTo(Math.min(rangeMin, rangeMax)),
      rangeMax: roundTo(Math.max(rangeMin, rangeMax)),
      confidence: this.computeConfidence(a, results, optimalSens),
      stabilityScore,
      paretoFrontier: pareto,
      model: { a, b, c },
    };
  }

  static computeParetoFrontier(results) {
    const sorted = [...results].sort((a, b) => a.avgReaction - b.avgReaction);
    const frontier = [];
    let maxAccuracy = -1;
    for (const point of sorted) {
      if (point.accuracy > maxAccuracy) {
        frontier.push(point);
        maxAccuracy = point.accuracy;
      }
    }
    return frontier;
  }

  static computeConfidence(a, results, optimal) {
    if (a >= 0) return 0.35; 
    const curvature = Math.abs(a);
    const spread = results.reduce((s, r) => {
      return s + (r.valorantSensitivity - optimal) ** 2;
    }, 0) / results.length;
    return clamp(0.5 + curvature * 10 - spread * 2, 0.35, 0.96);
  }
}
