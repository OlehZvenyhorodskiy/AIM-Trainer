export class AdaptiveDifficultyController {
  constructor(baseScenario, targetAccuracy = 0.72, windowSize = 8) {
    this.baseScenario = baseScenario;
    this.targetAccuracy = targetAccuracy;
    this.windowSize = windowSize;
    this.accuracyWindow = [];
    this.reactionWindow = [];
    this.difficultyMultiplier = 1.0;
    this.minMultiplier = 0.5;
    this.maxMultiplier = 2.0;
    this.adaptationHistory = [];
  }

  feedEvent(isHit, reactionMs, targetAngularError) {
    this.accuracyWindow.push(isHit ? 1 : 0);
    if (reactionMs > 0) this.reactionWindow.push(reactionMs);
    if (this.accuracyWindow.length > this.windowSize) {
      this.accuracyWindow.shift();
      if (this.reactionWindow.length > this.windowSize) this.reactionWindow.shift();
    }
    return this.evaluateAndAdapt();
  }

  evaluateAndAdapt() {
    if (this.accuracyWindow.length < this.windowSize * 0.5) return null;

    const currentAccuracy = this.accuracyWindow.reduce((a, b) => a + b, 0) / this.accuracyWindow.length;
    const currentReaction = this.reactionWindow.length 
      ? this.reactionWindow.reduce((a, b) => a + b, 0) / this.reactionWindow.length 
      : 400;

    const accuracyError = this.targetAccuracy - currentAccuracy;
    const reactionNorm = Math.max(0, Math.min(1, (currentReaction - 150) / 500));

    const adjustment = accuracyError * 0.3 + (reactionNorm - 0.5) * 0.15;
    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
    this.difficultyMultiplier = clamp(
      this.difficultyMultiplier - adjustment,
      this.minMultiplier,
      this.maxMultiplier
    );

    const adaptedParams = this.computeAdaptedParams();
    this.adaptationHistory.push({
      timestamp: performance.now(),
      multiplier: this.difficultyMultiplier,
      accuracy: currentAccuracy,
      reaction: currentReaction,
    });

    return adaptedParams;
  }

  computeAdaptedParams() {
    const m = this.difficultyMultiplier;
    return {
      spawnInterval: this.baseScenario.spawnInterval / Math.sqrt(m),
      expiry: this.baseScenario.expiry / m,
      radius: this.baseScenario.radius / Math.sqrt(Math.min(m, 1.4)),
      movementSpeed: m,
    };
  }
}
