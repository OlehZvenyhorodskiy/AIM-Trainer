const difficultyStars = {
  beginner: [1200, 2600, 4200],
  intermediate: [2000, 4200, 6800],
  advanced: [3200, 6200, 9200],
  pro: [4500, 8500, 12500],
};

function createScenario(id, category, title, difficulty, overrides = {}) {
  return {
    id,
    key: `scenario-${id}`,
    title,
    category,
    difficulty,
    description: overrides.description ?? '',
    duration: overrides.duration ?? 60,
    goal: overrides.goal ?? 'timer',
    weapon: overrides.weapon ?? 'pistol',
    targetType: overrides.targetType ?? 'sphere',
    concurrentTargets: overrides.concurrentTargets ?? 1,
    totalTargets: overrides.totalTargets ?? 20,
    spawnInterval: overrides.spawnInterval ?? 0.7,
    expiry: overrides.expiry ?? 0,
    movement: overrides.movement ?? 'static',
    interaction: overrides.interaction ?? 'shoot',
    radius: overrides.radius ?? 0.32,
    grid: overrides.grid ?? null,
    burst: overrides.burst ?? false,
    headshotOnly: overrides.headshotOnly ?? false,
    bodyOnly: overrides.bodyOnly ?? false,
    targetScale: overrides.targetScale ?? 1,
    trackHold: overrides.trackHold ?? 0,
    colorRule: overrides.colorRule ?? null,
    soundCue: overrides.soundCue ?? false,
    missEndsSession: overrides.missEndsSession ?? false,
    penaltyOnMiss: overrides.penaltyOnMiss ?? 0,
    botBehavior: overrides.botBehavior ?? 'idle',
    theme: overrides.theme ?? 'dark-room',
    popularity: overrides.popularity ?? 50,
    unlockAfter: overrides.unlockAfter !== undefined ? overrides.unlockAfter : (id > 1 ? id - 1 : null),
    starThresholds: overrides.starThresholds ?? difficultyStars[difficulty],
    tags: overrides.tags ?? [],
    sensitivityFinder: overrides.sensitivityFinder ?? false,
    spawnAngle: overrides.spawnAngle ?? 180,
    targetHp: overrides.targetHp ?? 0,
    centerReturn: overrides.centerReturn ?? false,
  };
}

export const SCENARIOS = [
  createScenario(1, 'warmup', 'Static Spheres', 'beginner', { description: 'Clear 20 static spheres with no timer pressure.', goal: 'clear', duration: 0, totalTargets: 20, concurrentTargets: 1, radius: 0.42, spawnInterval: 0.2, theme: 'dark-room' }),
  createScenario(2, 'warmup', 'Slow Static', 'beginner', { description: 'Large spheres with a gentle pace and 60-second timer.', totalTargets: 20, radius: 0.45, spawnInterval: 1.2 }),
  createScenario(3, 'warmup', 'Wide Warmup', 'beginner', { description: 'Large targets spread across the full wall.', totalTargets: 30, concurrentTargets: 2, radius: 0.4, spawnInterval: 0.8 }),
  createScenario(4, 'warmup', 'Center Focus', 'beginner', { description: 'Targets cluster near center to train clean recenters.', totalTargets: 25, concurrentTargets: 1, radius: 0.36, spawnInterval: 0.55, tags: ['center'] }),
  createScenario(5, 'warmup', 'Easy Tracking', 'beginner', { description: 'Track slow movers by holding your aim on them.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 3, totalTargets: 12, movement: 'figure8', trackHold: 0.9, radius: 0.38 }),
  createScenario(6, 'warmup', 'Horizontal Sweep', 'beginner', { description: 'Targets sweep left to right in sequence.', totalTargets: 24, movement: 'horizontal-sequence', radius: 0.35 }),
  createScenario(7, 'warmup', 'Vertical Column', 'beginner', { description: 'Targets descend in a clean vertical flow.', totalTargets: 24, movement: 'vertical-sequence', radius: 0.35 }),
  createScenario(8, 'warmup', 'Close Range', 'beginner', { description: 'Big close targets for confidence and rhythm.', totalTargets: 24, radius: 0.48, tags: ['close-range'] }),
  createScenario(9, 'warmup', 'Far Range', 'intermediate', { description: 'Smaller, distant targets to build control.', totalTargets: 24, radius: 0.22, tags: ['far-range'] }),
  createScenario(10, 'warmup', 'Alternating Sides', 'intermediate', { description: 'Targets flip left and right to train balance.', totalTargets: 28, movement: 'alternate-sides', radius: 0.3 }),

  createScenario(11, 'gridshot', 'Classic GridShot', 'beginner', { description: 'Clear a live 2x3 grid with instant respawns.', weapon: 'pistol', concurrentTargets: 6, totalTargets: 45, spawnInterval: 0.05, grid: { rows: 2, cols: 3 }, goal: 'timer', duration: 45, radius: 0.3 }),
  createScenario(12, 'gridshot', 'GridShot Speed', 'intermediate', { description: 'Thirty seconds of rapid-fire GridShot.', weapon: 'rifle', concurrentTargets: 6, totalTargets: 60, spawnInterval: 0.03, grid: { rows: 2, cols: 3 }, duration: 30, radius: 0.28 }),
  createScenario(13, 'gridshot', 'Wide GridShot', 'intermediate', { description: 'A wider 3x4 grid rewards fast screen traversal.', concurrentTargets: 12, totalTargets: 72, spawnInterval: 0.05, grid: { rows: 3, cols: 4 }, radius: 0.24 }),
  createScenario(14, 'gridshot', 'Tiny GridShot', 'advanced', { description: 'A standard grid with tiny targets and tight timing.', concurrentTargets: 6, totalTargets: 54, spawnInterval: 0.04, grid: { rows: 2, cols: 3 }, radius: 0.18 }),
  createScenario(15, 'gridshot', 'Moving GridShot', 'advanced', { description: 'Grid targets drift in slow circles as they respawn.', concurrentTargets: 6, totalTargets: 54, spawnInterval: 0.05, grid: { rows: 2, cols: 3 }, radius: 0.25, movement: 'drift-circle' }),
  createScenario(16, 'gridshot', 'Random GridShot', 'intermediate', { description: 'Classic six-up pressure with random respawn placement.', concurrentTargets: 6, totalTargets: 56, spawnInterval: 0.04, radius: 0.27, movement: 'random-gridless' }),
  createScenario(17, 'gridshot', 'Score Chase GridShot', 'advanced', { description: 'Longer run built around streak multipliers and speed.', concurrentTargets: 6, totalTargets: 90, spawnInterval: 0.03, duration: 60, weapon: 'rifle', radius: 0.26 }),
  createScenario(18, 'gridshot', 'Precision GridShot', 'pro', { description: 'Tiny targets and a miss penalty punish loose shots.', concurrentTargets: 6, totalTargets: 60, spawnInterval: 0.04, radius: 0.16, penaltyOnMiss: -50 }),
  createScenario(19, 'gridshot', 'Burst GridShot', 'advanced', { description: 'Clear each full batch before the next one appears.', concurrentTargets: 6, totalTargets: 48, burst: true, grid: { rows: 2, cols: 3 }, radius: 0.27, goal: 'clear', duration: 0 }),
  createScenario(20, 'gridshot', 'Infinite GridShot', 'intermediate', { description: 'A three-minute score chase with no downtime.', concurrentTargets: 6, totalTargets: 999, duration: 180, spawnInterval: 0.03, radius: 0.27 }),

  createScenario(21, 'flicking', 'Classic Flick', 'beginner', { description: 'One target at a time in random positions.', concurrentTargets: 1, totalTargets: 35, spawnInterval: 0.7, expiry: 2.0, radius: 0.3 }),
  createScenario(22, 'flicking', 'Speed Flick', 'intermediate', { description: 'One-second windows with fast respawns.', concurrentTargets: 1, totalTargets: 45, spawnInterval: 0.45, expiry: 1.0, radius: 0.28 }),
  createScenario(23, 'flicking', '180° Flick', 'advanced', { description: 'Targets appear on extreme angles for large turns.', concurrentTargets: 1, totalTargets: 35, spawnInterval: 0.75, expiry: 1.8, radius: 0.28, tags: ['wide-angle'] }),
  createScenario(24, 'flicking', 'Micro Flick', 'advanced', { description: 'Tiny near-center flicks that demand micro-corrections.', concurrentTargets: 1, totalTargets: 50, spawnInterval: 0.38, expiry: 1.2, radius: 0.17, tags: ['center'] }),
  createScenario(25, 'flicking', 'Vertical Flick', 'intermediate', { description: 'Targets appear only on a vertical lane.', concurrentTargets: 1, totalTargets: 40, spawnInterval: 0.55, expiry: 1.4, movement: 'vertical-lane', radius: 0.27 }),
  createScenario(26, 'flicking', 'Horizontal Flick', 'intermediate', { description: 'Targets appear only on a horizontal lane.', concurrentTargets: 1, totalTargets: 40, spawnInterval: 0.55, expiry: 1.4, movement: 'horizontal-lane', radius: 0.27 }),
  createScenario(27, 'flicking', 'Diagonal Flick', 'advanced', { description: 'Diagonal offsets force clean pathing between shots.', concurrentTargets: 1, totalTargets: 40, spawnInterval: 0.5, expiry: 1.25, movement: 'diagonal-lane', radius: 0.24 }),
  createScenario(28, 'flicking', 'Combo Flick', 'advanced', { description: 'Two targets must be cleared before the next pair appears.', concurrentTargets: 2, totalTargets: 40, spawnInterval: 0.35, expiry: 1.5, radius: 0.25 }),
  createScenario(29, 'flicking', 'Reaction Flick', 'pro', { description: 'Pure visual reaction with half-second visibility.', concurrentTargets: 1, totalTargets: 38, spawnInterval: 0.55, expiry: 0.5, radius: 0.22 }),
  createScenario(30, 'flicking', 'Marathon Flick', 'advanced', { description: 'A long five-minute flick endurance session.', concurrentTargets: 1, totalTargets: 999, duration: 300, spawnInterval: 0.65, expiry: 1.8, radius: 0.29 }),

  createScenario(31, 'tracking', 'Smooth Tracking', 'beginner', { description: 'Follow a single target moving in a smooth figure eight.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 1, totalTargets: 10, movement: 'figure8', trackHold: 1.25, radius: 0.35 }),
  createScenario(32, 'tracking', 'Jitter Tracking', 'intermediate', { description: 'A single target jitters with small random offsets.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 1, totalTargets: 12, movement: 'jitter', trackHold: 1.15, radius: 0.32 }),
  createScenario(33, 'tracking', 'Strafe Tracking', 'intermediate', { description: 'Track a target strafing left and right.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 1, totalTargets: 12, movement: 'horizontal', trackHold: 1.0, radius: 0.34 }),
  createScenario(34, 'tracking', 'Circle Tracking', 'intermediate', { description: 'Keep contact on a target orbiting the center.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 1, totalTargets: 10, movement: 'circle', trackHold: 1.15, radius: 0.33 }),
  createScenario(35, 'tracking', 'Spiral Tracking', 'advanced', { description: 'A target spirals away from the center over time.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 1, totalTargets: 12, movement: 'spiral', trackHold: 1.1, radius: 0.3 }),
  createScenario(36, 'tracking', 'Speed Tracking', 'advanced', { description: 'Target speed ramps up as the round continues.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 1, totalTargets: 14, movement: 'horizontal-fast', trackHold: 1.0, radius: 0.3 }),
  createScenario(37, 'tracking', 'Multi Tracking', 'advanced', { description: 'Track three moving targets and clear them one by one.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 3, totalTargets: 18, movement: 'figure8', trackHold: 0.85, radius: 0.28 }),
  createScenario(38, 'tracking', 'Color Tracking', 'advanced', { description: 'Only the red tracking target counts toward score.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 3, totalTargets: 15, movement: 'circle', trackHold: 0.9, radius: 0.28, colorRule: 'red-only' }),
  createScenario(39, 'tracking', 'Predict Tracking', 'pro', { description: 'Targets move through hidden arcs and reward prediction.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 1, totalTargets: 15, movement: 'peek-track', trackHold: 0.9, radius: 0.26 }),
  createScenario(40, 'tracking', 'Reactive Tracking', 'pro', { description: 'Tracking targets change direction when you lose them.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 1, totalTargets: 15, movement: 'reactive-track', trackHold: 0.95, radius: 0.28 }),

  createScenario(41, 'precision', 'Headshot Only', 'advanced', { description: 'Humanoid bots where only the head counts.', targetType: 'bot', weapon: 'rifle', concurrentTargets: 2, totalTargets: 24, headshotOnly: true, botBehavior: 'idle' }),
  createScenario(42, 'precision', 'Tiny Dots', 'advanced', { description: 'Extremely small sphere targets to sharpen precision.', concurrentTargets: 1, totalTargets: 40, radius: 0.09, expiry: 1.6, spawnInterval: 0.5 }),
  createScenario(43, 'precision', 'No Miss Challenge', 'pro', { description: 'One miss ends the session instantly.', concurrentTargets: 1, totalTargets: 35, missEndsSession: true, expiry: 1.8, radius: 0.24 }),
  createScenario(44, 'precision', 'One Shot One Kill', 'pro', { description: 'A one-by-one duel where every shot must count.', targetType: 'bot', weapon: 'pistol', concurrentTargets: 1, totalTargets: 40, missEndsSession: true, headshotOnly: false, botBehavior: 'idle' }),
  createScenario(45, 'precision', 'Sniper Range', 'advanced', { description: 'Far targets paired with a deliberate sniper cadence.', weapon: 'sniper', concurrentTargets: 1, totalTargets: 22, radius: 0.2, spawnInterval: 1.1, expiry: 2.8, tags: ['far-range'] }),
  createScenario(46, 'precision', 'Pixel Perfect', 'pro', { description: 'Needle-small targets at game resolution scale.', concurrentTargets: 1, totalTargets: 28, radius: 0.065, expiry: 1.6 }),
  createScenario(47, 'precision', 'Precision Flick', 'advanced', { description: 'Small flick targets where headshots bring the real score.', targetType: 'bot', weapon: 'rifle', concurrentTargets: 1, totalTargets: 26, radius: 0.2, expiry: 1.3, botBehavior: 'strafe', headshotOnly: true }),
  createScenario(48, 'precision', 'Controlled Burst', 'advanced', { description: 'Auto fire is allowed, but discipline wins the round.', weapon: 'rifle', concurrentTargets: 2, totalTargets: 40, spawnInterval: 0.3, radius: 0.25, tags: ['burst-control'] }),
  createScenario(49, 'precision', 'Calm and Aim', 'intermediate', { description: 'Low-pressure accuracy focus with a long timer.', concurrentTargets: 1, totalTargets: 50, duration: 120, spawnInterval: 0.9, radius: 0.26 }),
  createScenario(50, 'precision', 'Perfection Mode', 'pro', { description: 'Clean every wave perfectly to keep going.', concurrentTargets: 3, totalTargets: 36, burst: true, missEndsSession: true, radius: 0.22 }),

  createScenario(51, 'speed', 'Speed Click', 'beginner', { description: 'Large targets for pure click speed over 30 seconds.', concurrentTargets: 2, totalTargets: 60, duration: 30, spawnInterval: 0.18, radius: 0.36 }),
  createScenario(52, 'speed', 'Reaction Speed', 'advanced', { description: 'Targets flash briefly and reward snap reactions.', concurrentTargets: 1, totalTargets: 40, duration: 30, spawnInterval: 0.4, expiry: 0.2, radius: 0.28 }),
  createScenario(53, 'speed', 'Burst Fire', 'intermediate', { description: 'Unload a rifle into as many targets as possible in ten seconds.', weapon: 'rifle', concurrentTargets: 3, totalTargets: 60, duration: 10, spawnInterval: 0.08, radius: 0.28 }),
  createScenario(54, 'speed', 'Double Time', 'advanced', { description: 'Double spawn speed and nonstop tempo.', concurrentTargets: 3, totalTargets: 60, duration: 35, spawnInterval: 0.15, radius: 0.28 }),
  createScenario(55, 'speed', 'Kill Streak Race', 'advanced', { description: 'Build to a ten-kill streak as quickly as possible.', concurrentTargets: 2, totalTargets: 50, goal: 'clear', duration: 0, spawnInterval: 0.25, radius: 0.27 }),
  createScenario(56, 'speed', 'Speed Run', 'advanced', { description: 'Clear 50 targets in the shortest time possible.', concurrentTargets: 2, totalTargets: 50, goal: 'clear', duration: 0, spawnInterval: 0.22, radius: 0.27 }),
  createScenario(57, 'speed', 'Rapid Fire Flick', 'pro', { description: 'New flick targets arrive every 300ms.', concurrentTargets: 1, totalTargets: 55, spawnInterval: 0.3, expiry: 0.85, radius: 0.24 }),
  createScenario(58, 'speed', 'Time Attack', 'advanced', { description: 'Can you kill 30 targets inside the 30-second limit?', concurrentTargets: 2, totalTargets: 30, duration: 30, goal: 'clear-or-time', spawnInterval: 0.24, radius: 0.28 }),
  createScenario(59, 'speed', 'Click Speed Test', 'intermediate', { description: 'A single static target measures raw click speed.', concurrentTargets: 1, totalTargets: 120, duration: 20, spawnInterval: 0.02, radius: 0.42 }),
  createScenario(60, 'speed', 'Lightning Round', 'pro', { description: 'Targets are only visible for 150ms.', concurrentTargets: 1, totalTargets: 42, duration: 30, spawnInterval: 0.34, expiry: 0.15, radius: 0.24 }),

  createScenario(61, 'valorant', 'Vandal Spray Control', 'advanced', { description: 'Full-auto rifle work focused on stable transfers.', weapon: 'rifle', concurrentTargets: 3, totalTargets: 55, duration: 45, spawnInterval: 0.18, targetType: 'bot', botBehavior: 'idle', theme: 'military-range' }),
  createScenario(62, 'valorant', 'Phantom Tap Fire', 'advanced', { description: 'Tap and short-burst discipline with a rifle.', weapon: 'rifle', concurrentTargets: 2, totalTargets: 40, duration: 45, spawnInterval: 0.35, targetType: 'bot', botBehavior: 'idle', theme: 'military-range' }),
  createScenario(63, 'valorant', 'Headshot Duel', 'advanced', { description: 'A pistol round duel where only headshots count.', weapon: 'pistol', targetType: 'bot', concurrentTargets: 1, totalTargets: 24, headshotOnly: true, botBehavior: 'idle', theme: 'military-range' }),
  createScenario(64, 'valorant', 'Peeking Angles', 'advanced', { description: 'Bots peek from angles and force quick reads.', weapon: 'rifle', targetType: 'bot', concurrentTargets: 2, totalTargets: 28, botBehavior: 'peek', expiry: 1.6, theme: 'military-range' }),
  createScenario(65, 'valorant', 'Counter-Strafe Practice', 'advanced', { description: 'Strafing bots reward controlled stop-and-shoot timing.', weapon: 'rifle', targetType: 'bot', concurrentTargets: 2, totalTargets: 32, botBehavior: 'strafe', theme: 'military-range' }),
  createScenario(66, 'valorant', 'Op (Operator) Flick', 'pro', { description: 'High-impact sniper flicks to crossing bots.', weapon: 'sniper', targetType: 'bot', concurrentTargets: 1, totalTargets: 20, botBehavior: 'cross', expiry: 1.3, theme: 'military-range' }),
  createScenario(67, 'valorant', 'Spray Transfer', 'pro', { description: 'Kill one bot and instantly transfer to the next.', weapon: 'rifle', targetType: 'bot', concurrentTargets: 2, totalTargets: 34, botBehavior: 'idle-pair', theme: 'military-range' }),
  createScenario(68, 'valorant', 'Micro-Adjust', 'advanced', { description: 'Tiny corrections on strafing bots build duel control.', weapon: 'rifle', targetType: 'bot', concurrentTargets: 1, totalTargets: 28, botBehavior: 'micro-strafe', radius: 0.2, theme: 'military-range' }),
  createScenario(69, 'valorant', 'Jiggle Peek Defense', 'pro', { description: 'Punish fast jiggle peeks with single-shot timing.', weapon: 'rifle', targetType: 'bot', concurrentTargets: 1, totalTargets: 22, botBehavior: 'jiggle', expiry: 1.0, theme: 'military-range' }),
  createScenario(70, 'valorant', 'On-Site Rush', 'advanced', { description: 'Five bots rush forward and need to be shut down quickly.', weapon: 'rifle', targetType: 'bot', concurrentTargets: 5, totalTargets: 30, botBehavior: 'rush', theme: 'military-range' }),
  createScenario(71, 'valorant', 'Eco Round Pistol', 'intermediate', { description: 'Pistol-only closeouts with limited room for misses.', weapon: 'pistol', targetType: 'bot', concurrentTargets: 2, totalTargets: 25, theme: 'military-range' }),
  createScenario(72, 'valorant', 'Knife Run', 'advanced', { description: 'Close bots approach fast and reward snap clicks.', weapon: 'shotgun', targetType: 'bot', concurrentTargets: 3, totalTargets: 24, botBehavior: 'approach', theme: 'military-range' }),
  createScenario(73, 'valorant', 'Clutch 1v3', 'pro', { description: 'Three bots at different angles inside a 10-second clutch.', weapon: 'rifle', targetType: 'bot', concurrentTargets: 3, totalTargets: 18, duration: 10, botBehavior: 'idle', theme: 'military-range' }),
  createScenario(74, 'valorant', 'Flank Defense', 'pro', { description: 'Threats spawn from side and rear angles for quick turns.', weapon: 'rifle', targetType: 'bot', concurrentTargets: 2, totalTargets: 24, botBehavior: 'flank', theme: 'military-range' }),
  createScenario(75, 'valorant', 'Long-Range Tap', 'advanced', { description: 'Long sightline taps with burst discipline.', weapon: 'rifle', targetType: 'bot', concurrentTargets: 1, totalTargets: 22, botBehavior: 'idle', radius: 0.18, theme: 'military-range' }),
  createScenario(76, 'valorant', 'Shotgun Close', 'intermediate', { description: 'Very close shotgun punish against charging bots.', weapon: 'shotgun', targetType: 'bot', concurrentTargets: 3, totalTargets: 21, botBehavior: 'approach', theme: 'military-range' }),
  createScenario(77, 'valorant', 'Rapid Re-Peak', 'advanced', { description: 'Repeat the same angle clear with quick reacquisition.', weapon: 'rifle', targetType: 'bot', concurrentTargets: 1, totalTargets: 25, botBehavior: 'peek-repeat', theme: 'military-range' }),
  createScenario(78, 'valorant', 'Angle Pre-Aim', 'advanced', { description: 'Bots walk into pre-aimed lines and reward crosshair prep.', weapon: 'rifle', targetType: 'bot', concurrentTargets: 1, totalTargets: 28, botBehavior: 'walk-in', theme: 'military-range' }),
  createScenario(79, 'valorant', 'Bomb Site Clear', 'pro', { description: 'A site clear with seven bots spread across the space.', weapon: 'rifle', targetType: 'bot', concurrentTargets: 4, totalTargets: 28, botBehavior: 'site-hold', theme: 'military-range' }),
  createScenario(80, 'valorant', 'Clutch Timer', 'pro', { description: 'Three bots and a seven-second pressure clock.', weapon: 'rifle', targetType: 'bot', concurrentTargets: 3, totalTargets: 18, duration: 7, botBehavior: 'idle', theme: 'military-range' }),

  createScenario(81, 'botCombat', 'AFK Bots Gallery', 'beginner', { description: 'Ten idle bots standing in a clean gallery.', targetType: 'bot', concurrentTargets: 4, totalTargets: 20, botBehavior: 'idle', theme: 'dark-room' }),
  createScenario(82, 'botCombat', 'Patrol Bots', 'intermediate', { description: 'Bots patrol horizontal lanes and test tracking control.', targetType: 'bot', concurrentTargets: 3, totalTargets: 24, botBehavior: 'patrol' }),
  createScenario(83, 'botCombat', 'Strafe Bots', 'advanced', { description: 'Rapid strafes punish slow crosshair corrections.', targetType: 'bot', concurrentTargets: 3, totalTargets: 26, botBehavior: 'strafe' }),
  createScenario(84, 'botCombat', 'Aggressive Bots', 'intermediate', { description: 'Bots slowly walk toward the camera.', targetType: 'bot', concurrentTargets: 3, totalTargets: 24, botBehavior: 'approach' }),
  createScenario(85, 'botCombat', 'Bot Rush', 'advanced', { description: 'Multiple approach vectors create a real rush feel.', targetType: 'bot', concurrentTargets: 5, totalTargets: 30, botBehavior: 'rush' }),
  createScenario(86, 'botCombat', 'Bodyshot Training', 'beginner', { description: 'Center-mass practice without headshot bonuses.', targetType: 'bot', concurrentTargets: 3, totalTargets: 24, bodyOnly: true, botBehavior: 'idle' }),
  createScenario(87, 'botCombat', 'Bot Gauntlet', 'advanced', { description: 'Twenty bots in sequence, all about speed and flow.', targetType: 'bot', concurrentTargets: 2, totalTargets: 20, goal: 'clear', duration: 0, botBehavior: 'patrol' }),
  createScenario(88, 'botCombat', 'Ambush Defense', 'pro', { description: 'Bots appear from four directions with little warning.', targetType: 'bot', concurrentTargets: 2, totalTargets: 24, botBehavior: 'ambush' }),
  createScenario(89, 'botCombat', 'Priority Targets', 'pro', { description: 'Red bots score big while blue decoys punish mistakes.', targetType: 'bot', concurrentTargets: 3, totalTargets: 26, botBehavior: 'priority', colorRule: 'priority-color' }),
  createScenario(90, 'botCombat', 'Bot Survival', 'pro', { description: 'Respawns accelerate every wave as long as you survive.', targetType: 'bot', concurrentTargets: 4, totalTargets: 999, duration: 120, botBehavior: 'rush' }),

  createScenario(91, 'reaction', 'Visual Reaction', 'advanced', { description: 'Only shoot when the target turns green.', targetType: 'reaction', concurrentTargets: 1, totalTargets: 30, spawnInterval: 0.7, expiry: 1.0, colorRule: 'green-only' }),
  createScenario(92, 'reaction', 'Sound Reaction', 'advanced', { description: 'A cue tone plays before the target becomes live.', targetType: 'reaction', concurrentTargets: 1, totalTargets: 28, spawnInterval: 0.85, expiry: 1.1, soundCue: true }),
  createScenario(93, 'reaction', 'Pattern Memory', 'advanced', { description: 'Briefly memorize spawn order, then replay the pattern.', targetType: 'reaction', concurrentTargets: 3, totalTargets: 24, spawnInterval: 0.9, colorRule: 'pattern-memory' }),
  createScenario(94, 'reaction', 'Anti-Aim', 'pro', { description: 'Gray fake targets appear with live red targets.', targetType: 'reaction', concurrentTargets: 2, totalTargets: 30, spawnInterval: 0.45, expiry: 0.85, colorRule: 'real-only' }),
  createScenario(95, 'reaction', 'Focus Training', 'intermediate', { description: 'A single slow target encourages steady concentration.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 1, totalTargets: 14, movement: 'horizontal', trackHold: 1.5, duration: 180 }),
  createScenario(96, 'reaction', 'Warm-Up Ramp', 'intermediate', { description: 'The pace ramps up every thirty seconds.', concurrentTargets: 1, totalTargets: 80, duration: 120, spawnInterval: 0.7, radius: 0.28 }),
  createScenario(97, 'reaction', 'Tilt Recovery', 'advanced', { description: 'Consistency matters more than peak bursts.', concurrentTargets: 2, totalTargets: 60, duration: 90, spawnInterval: 0.5, radius: 0.28 }),
  createScenario(98, 'reaction', 'Zen Mode', 'beginner', { description: 'Relaxed tracking with no score pressure.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 1, totalTargets: 12, duration: 180, movement: 'circle', trackHold: 1.8, radius: 0.38 }),
  createScenario(99, 'reaction', 'Endurance', 'pro', { description: 'A long mixed session of tracking and flick work.', targetType: 'challenge', concurrentTargets: 2, totalTargets: 160, duration: 600, movement: 'mixed', radius: 0.28 }),
  createScenario(100, 'reaction', 'AimForge Challenge', 'pro', { description: 'A randomized mix of every category in one final test.', targetType: 'challenge', concurrentTargets: 3, totalTargets: 120, duration: 180, movement: 'mixed', radius: 0.28, theme: 'cyber-grid' }),
  createScenario(101, 'valorant', 'Sensitivity Finder', 'advanced', {
    description:
      'Ten-minute Valorant-focused calibration that cycles through flicking, tracking, and bot duels while adjusting in-game sensitivity recommendations.',
    targetType: 'challenge',
    weapon: 'rifle',
    concurrentTargets: 2,
    totalTargets: 999,
    duration: 600,
    spawnInterval: 0.18,
    radius: 0.28,
    theme: 'military-range',
    popularity: 95,
    sensitivityFinder: true,
    unlockAfter: null,
    starThresholds: [6000, 9000, 12000],
  }),
  createScenario(102, 'warmup', 'Rhythm Warmup', 'beginner', { description: 'Center-heavy warmup that alternates easy and medium flicks to build rhythm.', concurrentTargets: 2, totalTargets: 36, duration: 60, spawnInterval: 0.42, radius: 0.33, tags: ['center'], popularity: 74, unlockAfter: null }),
  createScenario(103, 'warmup', 'Mirror Warmup', 'beginner', { description: 'Alternating left-right targets build relaxed recenter control.', totalTargets: 34, movement: 'alternate-sides', spawnInterval: 0.5, radius: 0.31, expiry: 1.8, unlockAfter: null }),
  createScenario(104, 'warmup', 'Zigzag Warmup Track', 'intermediate', { description: 'Soft zigzag tracking wakes up hand speed without overload.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 1, totalTargets: 14, movement: 'zigzag', trackHold: 1.0, radius: 0.34, duration: 75, unlockAfter: null }),

  createScenario(105, 'gridshot', 'Corner GridShot', 'intermediate', { description: 'Six targets sit wider toward the corners to force bigger screen sweeps.', concurrentTargets: 6, totalTargets: 66, spawnInterval: 0.04, grid: { rows: 2, cols: 3 }, radius: 0.26, tags: ['wide-angle'], unlockAfter: null }),
  createScenario(106, 'gridshot', 'Diagonal GridShot', 'advanced', { description: 'GridShot pacing plus dashing targets creates diagonal pressure.', concurrentTargets: 6, totalTargets: 68, spawnInterval: 0.04, grid: { rows: 2, cols: 3 }, radius: 0.23, movement: 'dash', unlockAfter: null }),
  createScenario(107, 'gridshot', 'Pulse GridShot', 'advanced', { description: 'A faster 2x4 grid that swings between micro and medium corrections.', weapon: 'rifle', concurrentTargets: 8, totalTargets: 84, spawnInterval: 0.03, grid: { rows: 2, cols: 4 }, radius: 0.22, unlockAfter: null }),

  createScenario(108, 'flicking', 'Wide Snap Ladder', 'advanced', { description: 'Large left-right angle changes with shorter visibility windows.', concurrentTargets: 1, totalTargets: 44, spawnInterval: 0.46, expiry: 1.0, radius: 0.24, tags: ['wide-angle'], unlockAfter: null }),
  createScenario(109, 'flicking', 'Triple Flick Chain', 'pro', { description: 'Three quick flicks per wave reward clean pathing and composure.', concurrentTargets: 3, totalTargets: 54, spawnInterval: 0.28, expiry: 1.15, radius: 0.21, burst: true, unlockAfter: null }),
  createScenario(110, 'flicking', 'Corner Pop', 'advanced', { description: 'Corner-biased popups punish lazy pre-aim and reward explosive turns.', concurrentTargets: 1, totalTargets: 42, spawnInterval: 0.5, expiry: 0.95, radius: 0.22, movement: 'diagonal-lane', tags: ['wide-angle'], unlockAfter: null }),

  createScenario(111, 'tracking', 'Zigzag Tracking', 'intermediate', { description: 'Track a target that snaps through a controlled zigzag path.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 1, totalTargets: 14, movement: 'zigzag', trackHold: 0.95, radius: 0.31, unlockAfter: null }),
  createScenario(112, 'tracking', 'Bounce Tracking', 'advanced', { description: 'Vertical bounces demand smoother hand braking and recovery.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 1, totalTargets: 14, movement: 'bounce', trackHold: 1.0, radius: 0.3, unlockAfter: null }),
  createScenario(113, 'tracking', 'Lissajous Tracking', 'pro', { description: 'Complex looped movement exposes shaky tracking lines.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 1, totalTargets: 16, movement: 'lissajous', trackHold: 0.9, radius: 0.28, unlockAfter: null }),

  createScenario(114, 'precision', 'Needle Headshots', 'pro', { description: 'Tiny head-only duel targets on wide strafes.', targetType: 'bot', weapon: 'rifle', concurrentTargets: 1, totalTargets: 24, headshotOnly: true, botBehavior: 'wide-strafe', expiry: 1.15, radius: 0.18, theme: 'military-range', unlockAfter: null }),
  createScenario(115, 'precision', 'Micro Burst Precision', 'advanced', { description: 'Small near-center bursts test micro adjustments under tempo.', concurrentTargets: 2, totalTargets: 48, spawnInterval: 0.28, radius: 0.14, tags: ['center'], expiry: 1.1, unlockAfter: null }),
  createScenario(116, 'precision', 'One Tap Peek', 'advanced', { description: 'Hold the angle, punish the peek, and keep the shot clean.', targetType: 'bot', weapon: 'rifle', concurrentTargets: 1, totalTargets: 28, headshotOnly: true, botBehavior: 'anchor-peek', expiry: 1.25, radius: 0.2, theme: 'military-range', unlockAfter: null }),

  createScenario(117, 'speed', 'Burst Ladder', 'advanced', { description: 'Rapid pulses of targets reward instant recentering and click speed.', concurrentTargets: 3, totalTargets: 72, duration: 25, spawnInterval: 0.12, radius: 0.26, movement: 'dash', unlockAfter: null }),
  createScenario(118, 'speed', 'Swap Speed', 'pro', { description: 'Fast bot transfers with burst strafes and almost no downtime.', targetType: 'bot', weapon: 'rifle', concurrentTargets: 3, totalTargets: 60, duration: 35, spawnInterval: 0.15, botBehavior: 'burst-strafe', radius: 0.24, unlockAfter: null }),
  createScenario(119, 'speed', 'Micro Rush', 'advanced', { description: 'Quick tiny targets pop near center to stress mouse stop control.', concurrentTargets: 2, totalTargets: 60, duration: 30, spawnInterval: 0.14, radius: 0.18, tags: ['center'], expiry: 0.75, unlockAfter: null }),

  createScenario(120, 'valorant', 'Sheriff Micro Duel', 'advanced', { description: 'Sheriff-style micro corrections where only precise headshots hold.', weapon: 'pistol', targetType: 'bot', concurrentTargets: 1, totalTargets: 26, headshotOnly: true, botBehavior: 'micro-strafe', theme: 'military-range', unlockAfter: null }),
  createScenario(121, 'valorant', 'Retake Clear', 'pro', { description: 'Retaking pressure with bots entering lanes in waves.', weapon: 'rifle', targetType: 'bot', concurrentTargets: 3, totalTargets: 32, botBehavior: 'retake', theme: 'military-range', unlockAfter: null }),
  createScenario(122, 'valorant', 'Wide Swing Transfer', 'pro', { description: 'Punish wide swings and snap onto the second player instantly.', weapon: 'rifle', targetType: 'bot', concurrentTargets: 2, totalTargets: 30, botBehavior: 'wide-strafe', theme: 'military-range', unlockAfter: null }),
  createScenario(123, 'valorant', 'Anchor Peek Clear', 'advanced', { description: 'Anchor a common angle and punish layered re-peeks.', weapon: 'rifle', targetType: 'bot', concurrentTargets: 2, totalTargets: 30, botBehavior: 'anchor-peek', expiry: 1.3, theme: 'military-range', unlockAfter: null }),

  createScenario(124, 'botCombat', 'Crossfire Arena', 'advanced', { description: 'Multiple bots take space at once and force target prioritization.', targetType: 'bot', concurrentTargets: 4, totalTargets: 36, botBehavior: 'wide-strafe', unlockAfter: null }),
  createScenario(125, 'botCombat', 'Burst Strafe Gallery', 'pro', { description: 'Erratic burst strafes punish greedy sprays and loose tracking.', targetType: 'bot', concurrentTargets: 3, totalTargets: 32, botBehavior: 'burst-strafe', unlockAfter: null }),

  // ─── HP Bar / DPS Tracking ─────────────────────────────
  createScenario(126, 'tracking', 'HP Drain Static', 'beginner', { description: 'Hold your crosshair on a stationary HP sphere to drain its health. Great for crosshair discipline.', targetType: 'hp-sphere', interaction: 'dps', concurrentTargets: 1, totalTargets: 15, movement: 'static', radius: 0.38, targetHp: 100, duration: 60, unlockAfter: null, popularity: 82 }),
  createScenario(127, 'tracking', 'HP Drain Strafe', 'intermediate', { description: 'Strafing HP targets test your smooth tracking while dealing continuous damage.', targetType: 'hp-sphere', interaction: 'dps', concurrentTargets: 1, totalTargets: 18, movement: 'horizontal', radius: 0.34, targetHp: 120, duration: 60, unlockAfter: null, popularity: 78 }),
  createScenario(128, 'tracking', 'HP Drain Jitter', 'advanced', { description: 'Jittering HP targets punish shaky aim and reward predictive mouse control.', targetType: 'hp-sphere', interaction: 'dps', concurrentTargets: 1, totalTargets: 20, movement: 'jitter', radius: 0.3, targetHp: 100, duration: 60, unlockAfter: null }),
  createScenario(129, 'tracking', 'HP Drain Multi', 'advanced', { description: 'Three HP spheres at once—prioritize and drain them before they expire.', targetType: 'hp-sphere', interaction: 'dps', concurrentTargets: 3, totalTargets: 24, movement: 'horizontal', radius: 0.3, targetHp: 80, expiry: 8, duration: 90, unlockAfter: null }),
  createScenario(130, 'tracking', 'HP Drain Circle', 'advanced', { description: 'Circle-moving HP target that demands constant smooth correction.', targetType: 'hp-sphere', interaction: 'dps', concurrentTargets: 1, totalTargets: 16, movement: 'circle', radius: 0.32, targetHp: 140, duration: 75, unlockAfter: null }),
  createScenario(131, 'tracking', 'HP Drain Speed', 'pro', { description: 'Fast horizontal HP target with high HP pool. Only pure tracking wins.', targetType: 'hp-sphere', interaction: 'dps', concurrentTargets: 1, totalTargets: 14, movement: 'horizontal-fast', radius: 0.28, targetHp: 180, duration: 90, unlockAfter: null }),

  // ─── Spidershot (Center-Return Flick) ───────────────────
  createScenario(132, 'flicking', 'Spidershot', 'beginner', { description: 'Classic Spidershot: flick to target, return to center, repeat. Builds neutral crosshair discipline.', concurrentTargets: 1, totalTargets: 40, spawnInterval: 0.35, expiry: 1.5, radius: 0.3, centerReturn: true, duration: 45, unlockAfter: null, popularity: 90 }),
  createScenario(133, 'flicking', 'Spidershot Speed', 'intermediate', { description: 'Faster Spidershot with shorter windows and tighter timing.', concurrentTargets: 1, totalTargets: 55, spawnInterval: 0.25, expiry: 0.9, radius: 0.26, centerReturn: true, duration: 40, unlockAfter: null, popularity: 85 }),
  createScenario(134, 'flicking', 'Spidershot Precision', 'advanced', { description: 'Tiny targets force clean flicks and crisp returns to center.', concurrentTargets: 1, totalTargets: 45, spawnInterval: 0.3, expiry: 1.1, radius: 0.16, centerReturn: true, duration: 45, unlockAfter: null }),
  createScenario(135, 'flicking', 'Spidershot Ultimate', 'pro', { description: 'Adaptive Spidershot—targets shrink as your streak grows, grow on miss.', concurrentTargets: 1, totalTargets: 60, spawnInterval: 0.28, expiry: 0.75, radius: 0.22, centerReturn: true, duration: 60, unlockAfter: null }),

  // ─── Microshot ──────────────────────────────────────────
  createScenario(136, 'precision', 'Microshot', 'intermediate', { description: 'Tiny targets spawn near your last hit—train micro-corrections and mouse stopping power.', concurrentTargets: 1, totalTargets: 60, spawnInterval: 0.22, expiry: 1.0, radius: 0.12, tags: ['center', 'micro-cluster'], duration: 40, unlockAfter: null, popularity: 80 }),
  createScenario(137, 'precision', 'Microshot Speed', 'advanced', { description: 'Even faster micro-flicks with tiny targets. Pure mouse control test.', concurrentTargets: 1, totalTargets: 80, spawnInterval: 0.16, expiry: 0.7, radius: 0.09, tags: ['center', 'micro-cluster'], duration: 35, unlockAfter: null }),
  createScenario(138, 'precision', 'Microshot Pro', 'pro', { description: 'Needle-small micro targets that test the absolute limits of your mouse control.', concurrentTargets: 1, totalTargets: 70, spawnInterval: 0.2, expiry: 0.6, radius: 0.065, tags: ['center', 'micro-cluster'], duration: 40, penaltyOnMiss: -30, unlockAfter: null }),

  // ─── Detection ──────────────────────────────────────────
  createScenario(139, 'reaction', 'Detection Basic', 'intermediate', { description: 'Multiple targets appear—only shoot the GREEN one. Wrong target = penalty.', concurrentTargets: 4, totalTargets: 30, spawnInterval: 0.6, expiry: 2.0, radius: 0.28, colorRule: 'detect-one', penaltyOnMiss: -100, duration: 60, unlockAfter: null, popularity: 72 }),
  createScenario(140, 'reaction', 'Detection Speed', 'advanced', { description: 'Faster detection with more decoys. Train your visual processing under pressure.', concurrentTargets: 6, totalTargets: 40, spawnInterval: 0.45, expiry: 1.2, radius: 0.25, colorRule: 'detect-one', penaltyOnMiss: -150, duration: 50, unlockAfter: null }),
  createScenario(141, 'reaction', 'Detection Pro', 'pro', { description: 'Eight targets, one real—reaction speed and visual clarity at their limit.', concurrentTargets: 8, totalTargets: 35, spawnInterval: 0.5, expiry: 0.9, radius: 0.22, colorRule: 'detect-one', penaltyOnMiss: -200, duration: 45, unlockAfter: null }),

  // ─── Switching ──────────────────────────────────────────
  createScenario(142, 'switching', 'Static Switch', 'beginner', { description: 'Two static targets at once—switch between them as fast as possible.', concurrentTargets: 2, totalTargets: 40, spawnInterval: 0.1, radius: 0.3, burst: true, duration: 45, unlockAfter: null, popularity: 70 }),
  createScenario(143, 'switching', 'Dynamic Switch', 'intermediate', { description: 'Two moving targets—track one, then switch to the other. Combines tracking and switching.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 2, totalTargets: 20, movement: 'horizontal', trackHold: 0.8, radius: 0.3, duration: 60, unlockAfter: null }),
  createScenario(144, 'switching', 'Triple Switch', 'advanced', { description: 'Three targets in a row—clear all three as a batch, then repeat.', concurrentTargets: 3, totalTargets: 45, spawnInterval: 0.08, radius: 0.26, burst: true, duration: 45, unlockAfter: null }),
  createScenario(145, 'switching', 'Switchtrack', 'advanced', { description: 'Track target A until its HP drains, then immediately switch to target B. Pure switching discipline.', targetType: 'hp-sphere', interaction: 'dps', concurrentTargets: 2, totalTargets: 24, movement: 'horizontal', radius: 0.3, targetHp: 60, duration: 75, unlockAfter: null, popularity: 76 }),
  createScenario(146, 'switching', 'Speed Switch', 'pro', { description: 'Five targets, rapid burst clear. The fastest switch times win the highest scores.', concurrentTargets: 5, totalTargets: 60, spawnInterval: 0.05, radius: 0.24, burst: true, duration: 40, unlockAfter: null }),
  createScenario(147, 'switching', 'Bot Switch', 'advanced', { description: 'Two bots strafe in opposite directions—switch between them for headshots.', targetType: 'bot', weapon: 'rifle', concurrentTargets: 2, totalTargets: 30, botBehavior: 'strafe', headshotOnly: true, duration: 45, unlockAfter: null }),

  // ─── Swarm Mode ─────────────────────────────────────────
  createScenario(148, 'speed', 'Swarm Static', 'intermediate', { description: 'Ten targets crammed in a small area—rapid clicking frenzy.', concurrentTargets: 10, totalTargets: 80, spawnInterval: 0.02, radius: 0.22, spawnAngle: 60, duration: 30, unlockAfter: null, popularity: 75 }),
  createScenario(149, 'speed', 'Swarm Moving', 'advanced', { description: 'Twelve targets in a tight cluster, all jittering. Pure chaos.', concurrentTargets: 12, totalTargets: 100, spawnInterval: 0.02, radius: 0.2, movement: 'jitter', spawnAngle: 70, duration: 35, unlockAfter: null }),
  createScenario(150, 'speed', 'Mega Swarm', 'pro', { description: 'Fifteen targets at once in a dense swarm. Max spawn pressure.', concurrentTargets: 15, totalTargets: 120, spawnInterval: 0.01, radius: 0.18, movement: 'jitter', spawnAngle: 50, duration: 40, unlockAfter: null }),

  // ─── Narrow Angle Scenarios ─────────────────────────────
  createScenario(151, 'flicking', 'Narrow Flick 90°', 'intermediate', { description: 'Targets only spawn within a 90° cone in front of you. Clean, focused flicks.', concurrentTargets: 1, totalTargets: 40, spawnInterval: 0.5, expiry: 1.4, radius: 0.28, spawnAngle: 90, duration: 45, unlockAfter: null, popularity: 68 }),
  createScenario(152, 'flicking', 'Tight Flick 45°', 'advanced', { description: 'Ultra-narrow 45° cone forces tiny precise flicks with minimal travel.', concurrentTargets: 1, totalTargets: 50, spawnInterval: 0.35, expiry: 1.0, radius: 0.22, spawnAngle: 45, duration: 40, unlockAfter: null }),
  createScenario(153, 'flicking', 'Wide Flick 120°', 'intermediate', { description: 'A comfortable 120° arc balances reach and speed.', concurrentTargets: 1, totalTargets: 38, spawnInterval: 0.55, expiry: 1.6, radius: 0.3, spawnAngle: 120, duration: 50, unlockAfter: null }),
  createScenario(154, 'gridshot', 'Narrow GridShot 90°', 'intermediate', { description: 'GridShot within a 90° cone—tighter angles, faster clears.', concurrentTargets: 6, totalTargets: 60, spawnInterval: 0.04, radius: 0.26, spawnAngle: 90, duration: 40, unlockAfter: null }),
  createScenario(155, 'tracking', 'Narrow Tracking 90°', 'intermediate', { description: 'Track targets within a restricted 90° field of view.', targetType: 'tracking', interaction: 'hover', concurrentTargets: 1, totalTargets: 14, movement: 'horizontal', trackHold: 1.0, radius: 0.32, spawnAngle: 90, duration: 60, unlockAfter: null }),
];

export const CATEGORY_ORDER = [
  'warmup',
  'gridshot',
  'flicking',
  'tracking',
  'switching',
  'precision',
  'speed',
  'valorant',
  'botCombat',
  'reaction',
];

export function getScenarioById(id) {
  return SCENARIOS.find((scenario) => scenario.id === id) ?? null;
}

export function getScenarioCategoryCount(category) {
  return SCENARIOS.filter((scenario) => scenario.category === category).length;
}

export function isScenarioLocked(scenarioId, completedScenarioIds) {
  const scenario = getScenarioById(scenarioId);
  if (!scenario || scenario.unlockAfter == null) return false;
  return !completedScenarioIds.includes(scenario.unlockAfter);
}

export function getScenarioStars(bestScore, scenario) {
  if (!bestScore) return 0;
  return scenario.starThresholds.filter((threshold) => bestScore >= threshold).length;
}

export function describeScenario(scenario, t) {
  const durationText =
    scenario.duration > 0 ? `${scenario.duration}s` : `${scenario.totalTargets} ${t('labels.totalTargets')}`;
  const detail = [
    `${t('labels.duration')}: ${durationText}`,
    `${t('labels.weapon')}: ${t(`weapons.${scenario.weapon}`)}`,
    `${t('labels.targetType')}: ${t(`targetTypes.${scenario.targetType}`)}`,
  ];

  if (scenario.headshotOnly) detail.push('Headshot only');
  if (scenario.trackHold) detail.push(`Track ${scenario.trackHold.toFixed(1)}s`);

  return `${scenario.description} ${detail.join(' • ')}`.trim();
}
