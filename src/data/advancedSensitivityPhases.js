export const ADVANCED_SENSITIVITY_PHASES = [
  // --- MICRO FLICK BLOCK ---
  {
    label: 'Micro Flick Low',
    focus: 'micro-flick',
    duration: 60,
    relativeSensitivity: 0.85,
    telemetryWeights: {
      overshootRatio: 0.35,      // key metric for micro
      correctionCount: 0.25,
      reactionTime: 0.15,
      accuracy: 0.25,
    },
    config: {
      targetType: 'sphere',
      concurrentTargets: 1,
      spawnInterval: 0.28,
      expiry: 1.0,
      radius: 0.12,
      movement: 'static',
      tags: ['center', 'micro'],
    },
  },
  {
    label: 'Micro Flick High',
    focus: 'micro-flick',
    duration: 60,
    relativeSensitivity: 1.15,
    telemetryWeights: { overshootRatio: 0.35, correctionCount: 0.25, reactionTime: 0.15, accuracy: 0.25 },
    config: {
      targetType: 'sphere', concurrentTargets: 1, spawnInterval: 0.28,
      expiry: 1.0, radius: 0.12, movement: 'static', tags: ['center', 'micro'],
    },
  },
  // --- WIDE FLICK BLOCK ---
  {
    label: 'Wide Flick Low',
    focus: 'wide-flick',
    duration: 60,
    relativeSensitivity: 0.80,
    telemetryWeights: {
      pathEfficiency: 0.30,
      reactionTime: 0.25,
      accuracy: 0.25,
      angularTravel: 0.20,
    },
    config: {
      targetType: 'sphere', concurrentTargets: 1, spawnInterval: 0.55,
      expiry: 1.4, radius: 0.28, movement: 'static', tags: ['wide-angle'],
    },
  },
  {
    label: 'Wide Flick High',
    focus: 'wide-flick',
    duration: 60,
    relativeSensitivity: 1.20,
    telemetryWeights: { pathEfficiency: 0.30, reactionTime: 0.25, accuracy: 0.25, angularTravel: 0.20 },
    config: {
      targetType: 'sphere', concurrentTargets: 1, spawnInterval: 0.55,
      expiry: 1.4, radius: 0.28, movement: 'static', tags: ['wide-angle'],
    },
  },
  // --- DIAGONAL FLICK BLOCK ---
  {
    label: 'Diagonal Flick Low',
    focus: 'diagonal-flick',
    duration: 60,
    relativeSensitivity: 0.88,
    telemetryWeights: {
      pathEfficiency: 0.35,
      stopPrecision: 0.25,
      correctionCount: 0.20,
      accuracy: 0.20,
    },
    config: {
      targetType: 'sphere', concurrentTargets: 1, spawnInterval: 0.45,
      expiry: 1.2, radius: 0.22, movement: 'diagonal-lane',
    },
  },
  {
    label: 'Diagonal Flick High',
    focus: 'diagonal-flick',
    duration: 60,
    relativeSensitivity: 1.12,
    telemetryWeights: { pathEfficiency: 0.35, stopPrecision: 0.25, correctionCount: 0.20, accuracy: 0.20 },
    config: {
      targetType: 'sphere', concurrentTargets: 1, spawnInterval: 0.45,
      expiry: 1.2, radius: 0.22, movement: 'diagonal-lane',
    },
  },
  // --- TRACKING BLOCK ---
  {
    label: 'Smooth Track Low',
    focus: 'tracking',
    duration: 75,
    relativeSensitivity: 0.90,
    telemetryWeights: {
      trackingStability: 0.40,
      timeOnTarget: 0.25,
      smoothnessScore: 0.20,
      accuracy: 0.15,
    },
    config: {
      targetType: 'tracking', interaction: 'hover', concurrentTargets: 1,
      spawnInterval: 0.2, trackHold: 1.0, radius: 0.32, movement: 'figure8',
    },
  },
  {
    label: 'Smooth Track High',
    focus: 'tracking',
    duration: 75,
    relativeSensitivity: 1.10,
    telemetryWeights: { trackingStability: 0.40, timeOnTarget: 0.25, smoothnessScore: 0.20, accuracy: 0.15 },
    config: {
      targetType: 'tracking', interaction: 'hover', concurrentTargets: 1,
      spawnInterval: 0.2, trackHold: 1.0, radius: 0.32, movement: 'figure8',
    },
  },
  // --- REACTIVE TRACKING BLOCK ---
  {
    label: 'Reactive Track Low',
    focus: 'reactive-tracking',
    duration: 75,
    relativeSensitivity: 0.92,
    telemetryWeights: {
      reacquisitionSpeed: 0.35,
      trackingStability: 0.25,
      correctionCount: 0.20,
      accuracy: 0.20,
    },
    config: {
      targetType: 'tracking', interaction: 'hover', concurrentTargets: 1,
      spawnInterval: 0.18, trackHold: 0.95, radius: 0.30, movement: 'reactive-track',
    },
  },
  {
    label: 'Reactive Track High',
    focus: 'reactive-tracking',
    duration: 75,
    relativeSensitivity: 1.08,
    telemetryWeights: { reacquisitionSpeed: 0.35, trackingStability: 0.25, correctionCount: 0.20, accuracy: 0.20 },
    config: {
      targetType: 'tracking', interaction: 'hover', concurrentTargets: 1,
      spawnInterval: 0.18, trackHold: 0.95, radius: 0.30, movement: 'reactive-track',
    },
  },
  // --- ENDURANCE BLOCK ---
  {
    label: 'Endurance Track',
    focus: 'endurance',
    duration: 120,
    relativeSensitivity: 1.0,
    telemetryWeights: {
      consistencyCV: 0.40,        // coefficient of variation
      trackingStability: 0.30,
      fatigueIndex: 0.30,         // performance in last 30s vs first 30s
    },
    config: {
      targetType: 'tracking', interaction: 'hover', concurrentTargets: 1,
      spawnInterval: 0.15, trackHold: 1.1, radius: 0.28, movement: 'lissajous',
    },
  },
  // --- ADAPTIVE MIXED (Dynamic difficulty) ---
  {
    label: 'Adaptive Mixed Final',
    focus: 'mixed-adaptive',
    duration: 90,
    relativeSensitivity: 1.0,
    adaptive: true,
    telemetryWeights: {
      adaptabilityScore: 0.30,    // how well player adapts to difficulty changes
      composite: 0.30,
      consistency: 0.20,
      pressureHandling: 0.20,
    },
    config: {
      targetType: 'challenge',
      concurrentTargets: 3,
      spawnInterval: 0.2,
      radius: 0.24,
      movement: 'mixed',
    },
  },
];
