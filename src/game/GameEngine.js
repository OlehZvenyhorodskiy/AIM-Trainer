import * as THREE from 'three';
import { SoundManager } from '../audio/SoundManager.js';
import { ParticlePool } from './ParticlePool.js';
import { createBot } from './BotFactory.js';
import { applyCrosshairStyles, createCrosshairMarkup } from './crosshair.js';
import { buildWeapon, WEAPON_STATS } from './WeaponBuilder.js';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getStreakMultiplier(streak) {
  if (streak >= 20) return 10;
  if (streak >= 15) return 5;
  if (streak >= 10) return 3;
  if (streak >= 5) return 2;
  return 1;
}

function qualitySegments(level) {
  if (level === 'low') return 10;
  if (level === 'medium') return 18;
  return 28;
}

function createMaterial(hex) {
  return new THREE.MeshStandardMaterial({
    color: hex,
    emissive: hex,
    emissiveIntensity: 0.2,
    roughness: 0.45,
    metalness: 0.08,
  });
}

function supportsTouch() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function roundTo(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function valorantSensitivityToSite(dpi, valorantSensitivity) {
  return clamp((dpi * valorantSensitivity) / 200, 0.35, 8);
}

const SENSITIVITY_COARSE_PHASES = [
  {
    label: 'Wide Flick Low',
    focus: 'flick',
    duration: 45,
    relativeSensitivity: 0.82,
    config: {
      targetType: 'sphere',
      weapon: 'pistol',
      concurrentTargets: 1,
      spawnInterval: 0.32,
      expiry: 1.25,
      radius: 0.25,
      movement: 'static',
      tags: ['wide-angle'],
    },
  },
  {
    label: 'Wide Flick High',
    focus: 'flick',
    duration: 45,
    relativeSensitivity: 1.18,
    config: {
      targetType: 'sphere',
      weapon: 'pistol',
      concurrentTargets: 1,
      spawnInterval: 0.32,
      expiry: 1.25,
      radius: 0.25,
      movement: 'static',
      tags: ['wide-angle'],
    },
  },
  {
    label: 'Micro Correction Low',
    focus: 'precision',
    duration: 45,
    relativeSensitivity: 0.92,
    config: {
      targetType: 'sphere',
      weapon: 'pistol',
      concurrentTargets: 1,
      spawnInterval: 0.24,
      expiry: 1.1,
      radius: 0.16,
      movement: 'static',
      tags: ['center'],
    },
  },
  {
    label: 'Micro Correction High',
    focus: 'precision',
    duration: 45,
    relativeSensitivity: 1.08,
    config: {
      targetType: 'sphere',
      weapon: 'pistol',
      concurrentTargets: 1,
      spawnInterval: 0.24,
      expiry: 1.1,
      radius: 0.16,
      movement: 'static',
      tags: ['center'],
    },
  },
];

const SENSITIVITY_REFINE_PHASES = [
  {
    label: 'Smooth Track Low',
    focus: 'tracking',
    duration: 70,
    relativeSensitivity: 0.94,
    config: {
      targetType: 'tracking',
      interaction: 'hover',
      weapon: 'rifle',
      concurrentTargets: 1,
      spawnInterval: 0.18,
      trackHold: 0.9,
      radius: 0.3,
      movement: 'horizontal-fast',
      tags: [],
    },
  },
  {
    label: 'Smooth Track High',
    focus: 'tracking',
    duration: 70,
    relativeSensitivity: 1.06,
    config: {
      targetType: 'tracking',
      interaction: 'hover',
      weapon: 'rifle',
      concurrentTargets: 1,
      spawnInterval: 0.18,
      trackHold: 0.9,
      radius: 0.3,
      movement: 'horizontal-fast',
      tags: [],
    },
  },
  {
    label: 'Strafe Transfer Low',
    focus: 'switch',
    duration: 70,
    relativeSensitivity: 0.97,
    config: {
      targetType: 'bot',
      weapon: 'rifle',
      concurrentTargets: 2,
      spawnInterval: 0.18,
      botBehavior: 'wide-strafe',
      radius: 0.24,
      tags: [],
    },
  },
  {
    label: 'Strafe Transfer High',
    focus: 'switch',
    duration: 70,
    relativeSensitivity: 1.03,
    config: {
      targetType: 'bot',
      weapon: 'rifle',
      concurrentTargets: 2,
      spawnInterval: 0.18,
      botBehavior: 'wide-strafe',
      radius: 0.24,
      tags: [],
    },
  },
  {
    label: 'Precision Validation',
    focus: 'precision',
    duration: 70,
    relativeSensitivity: 1,
    config: {
      targetType: 'bot',
      weapon: 'rifle',
      concurrentTargets: 1,
      spawnInterval: 0.22,
      expiry: 1.2,
      botBehavior: 'micro-strafe',
      headshotOnly: true,
      radius: 0.2,
      tags: [],
    },
  },
  {
    label: 'Pressure Mix',
    focus: 'mixed',
    duration: 70,
    relativeSensitivity: 1,
    config: {
      targetType: 'challenge',
      weapon: 'rifle',
      concurrentTargets: 3,
      spawnInterval: 0.16,
      radius: 0.24,
      movement: 'dash',
      botBehavior: 'burst-strafe',
      tags: [],
    },
  },
];

export class GameEngine {
  constructor({ mount, scenario, settings, i18n, previousBest, onEnd, onRestart, onExit }) {
    this.mount = mount;
    this.scenario = scenario;
    this.baseScenario = JSON.parse(JSON.stringify(scenario));
    this.settings = settings;
    this.i18n = i18n;
    this.previousBest = previousBest;
    this.callbacks = { onEnd, onRestart, onExit };

    this.sound = new SoundManager(settings);
    this.clock = new THREE.Clock();
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.environmentGroup = null;
    this.weapon = null;
    this.particles = null;
    this.raycaster = new THREE.Raycaster();
    this.screenShake = 0;
    this.listeners = [];
    this.popupItems = [];
    this.activeTargets = [];
    this.spherePool = [];
    this.botPool = [];
    this.firePressed = false;
    this.ads = false;
    this.pointerLocked = false;
    this.sessionStarted = false;
    this.paused = true;
    this.disposed = false;
    this.ended = false;
    this.lastShotAt = 0;
    this.lastSpawnAt = 0;
    this.lastCountdownSecond = null;
    this.spawnedCount = 0;
    this.resolvedTargets = 0;
    this.touchLook = { active: false, id: null, x: 0, y: 0 };
    this.movement = { forward: false, backward: false, left: false, right: false };
    this.pointer = { yaw: 0, pitch: 0 };
    this.lookTelemetry = { angularTravel: 0, samples: 0 };
    this.targetSequence = 0;
    this.velocity = new THREE.Vector3();
    this.centerReturnActive = false;
    this.hpBarItems = new Map();
    this.baseFov = settings.display.fov;
    this.currentWeaponType = scenario.weapon || settings.gameplay.weapon;
    this.weaponStats = WEAPON_STATS[this.currentWeaponType];
    this.ammo = this.weaponStats.magazineSize;
    this.reloading = false;
    this.reloadEndAt = 0;
    this.recoilKick = 0;
    this.scoreDisplay = 0;
    this.fps = 0;
    this.fpsAccumulator = 0;
    this.fpsFrames = 0;
    this.currentAimIntersections = [];
    this.currentTrackedTarget = null;
    this.tracers = [];
    this.stats = {
      score: 0,
      shots: 0,
      hits: 0,
      misses: 0,
      headshots: 0,
      streak: 0,
      streakMax: 0,
      reactionTimes: [],
    };
    this.actualElapsed = 0;
    this.remainingTime = scenario.duration;
    this.sensitivityFinder = scenario.sensitivityFinder
      ? this.createSensitivityFinderState(scenario.sensitivityProfile)
      : null;
  }

  createSensitivityFinderState(profile = {}) {
    const dpi = clamp(Number(profile?.dpi) || 800, 200, 6400);
    const initialValorantSensitivity = clamp(
      Number(profile?.valorantSensitivity) || 0.35,
      0.05,
      5,
    );
    const coarsePhases = this.buildSensitivityPhaseSet(
      SENSITIVITY_COARSE_PHASES,
      dpi,
      initialValorantSensitivity,
    );
    const refinePhases = this.buildSensitivityPhaseSet(
      SENSITIVITY_REFINE_PHASES,
      dpi,
      initialValorantSensitivity,
    );

    return {
      dpi,
      initialValorantSensitivity,
      provisionalAt: 180,
      coarsePhaseCount: coarsePhases.length,
      phaseIndex: -1,
      phases: [...coarsePhases, ...refinePhases],
      phaseStartedAt: 0,
      phaseStartStats: null,
      phaseResults: [],
      phaseTargetMetrics: [],
      refinementCenter: initialValorantSensitivity,
      provisionalRecommendation: null,
      finalRecommendation: null,
    };
  }

  buildSensitivityPhaseSet(templates, dpi, centerSensitivity) {
    return templates.map((template) => {
      const valorantSensitivity = roundTo(
        clamp(centerSensitivity * template.relativeSensitivity, 0.05, 5),
      );

      return {
        ...template,
        config: { ...template.config },
        valorantSensitivity,
        siteSensitivity: roundTo(
          valorantSensitivityToSite(dpi, valorantSensitivity),
          2,
        ),
      };
    });
  }

  configureSensitivityRefinement(centerSensitivity) {
    if (!this.sensitivityFinder) return;
    const clampedCenter = clamp(centerSensitivity, 0.05, 5);
    const refinePhases = this.buildSensitivityPhaseSet(
      SENSITIVITY_REFINE_PHASES,
      this.sensitivityFinder.dpi,
      clampedCenter,
    );

    this.sensitivityFinder.phases = [
      ...this.sensitivityFinder.phases.slice(0, this.sensitivityFinder.coarsePhaseCount),
      ...refinePhases,
    ];
    this.sensitivityFinder.refinementCenter = clampedCenter;
  }

  getAimAnglesForPosition(position) {
    const offset = position.clone().sub(this.camera.position);
    return {
      yaw: Math.atan2(offset.x, -offset.z),
      pitch: Math.atan2(offset.y, Math.hypot(offset.x, offset.z)),
    };
  }

  getAngularDistanceToPosition(position) {
    const { yaw, pitch } = this.getAimAnglesForPosition(position);
    return Math.hypot(normalizeAngle(yaw - this.pointer.yaw), pitch - this.pointer.pitch);
  }

  createTargetTelemetry(position) {
    const initialAngularError = this.camera
      ? this.getAngularDistanceToPosition(position)
      : 0;

    return {
      angularTravelStart: this.lookTelemetry.angularTravel,
      initialAngularError,
      bestAngularError: initialAngularError || 0.0001,
      firstAcquireAt: null,
      trackedTime: 0,
      lockEntries: 0,
      correctionSwitches: 0,
      lastError: null,
      lastErrorDelta: null,
      errorSum: 0,
      errorSamples: 0,
      isTracked: false,
    };
  }

  finalizeTargetTelemetry(target, resolvedWithHit) {
    if (!this.sensitivityFinder || !target?.telemetry) return;

    const lifetime = Math.max(1, performance.now() - target.spawnTime);
    const angularTravel = this.lookTelemetry.angularTravel - target.telemetry.angularTravelStart;
    const acquireTime = target.telemetry.firstAcquireAt
      ? target.telemetry.firstAcquireAt - target.spawnTime
      : lifetime;
    const pathEfficiency =
      target.telemetry.initialAngularError > 0.0001
        ? clamp(
            target.telemetry.initialAngularError /
              Math.max(angularTravel, target.telemetry.initialAngularError),
            0,
            1,
          )
        : 1;
    const trackingStability = clamp(target.telemetry.trackedTime / lifetime, 0, 1);

    this.sensitivityFinder.phaseTargetMetrics.push({
      resolvedWithHit,
      lifetime,
      acquireTime,
      pathEfficiency,
      trackingStability,
      corrections:
        Math.max(0, target.telemetry.lockEntries - 1) +
        target.telemetry.correctionSwitches * 0.5,
      bestAngularError: target.telemetry.bestAngularError,
      avgAngularError: target.telemetry.errorSamples
        ? target.telemetry.errorSum / target.telemetry.errorSamples
        : target.telemetry.bestAngularError,
    });
  }

  scoreSensitivityPhase(phase, phaseStats, targetMetrics) {
    const {
      reactions,
      shots,
      hits,
      misses,
      headshots,
      mouseTravel,
    } = phaseStats;
    const accuracy = shots > 0 ? (hits / shots) * 100 : 0;
    const avgReaction = average(reactions);
    const hitTargetMetrics = targetMetrics.filter((entry) => entry.resolvedWithHit);
    const avgAcquireTime = average(hitTargetMetrics.map((entry) => entry.acquireTime));
    const avgPathEfficiency = average(hitTargetMetrics.map((entry) => entry.pathEfficiency));
    const avgTrackingStability = average(targetMetrics.map((entry) => entry.trackingStability));
    const avgCorrections = average(targetMetrics.map((entry) => entry.corrections));
    const avgAngularError = average(targetMetrics.map((entry) => entry.avgAngularError));
    const accuracyNorm = clamp(accuracy / 100, 0, 1);
    const reactionNorm = avgReaction
      ? clamp((650 - avgReaction) / 400, 0, 1)
      : 0.42;
    const acquireNorm = avgAcquireTime
      ? clamp((550 - avgAcquireTime) / 400, 0, 1)
      : 0.4;
    const pathNorm = targetMetrics.length ? clamp(avgPathEfficiency, 0, 1) : 0.45;
    const trackingNorm = clamp(avgTrackingStability, 0, 1);
    const correctionNorm = clamp(1 / (1 + avgCorrections * 0.7), 0, 1);
    const precisionNorm = clamp(1 - avgAngularError / 0.14, 0, 1);
    const weightSets = {
      flick: { accuracy: 0.22, reaction: 0.2, acquire: 0.16, path: 0.24, correction: 0.1, precision: 0.08, tracking: 0 },
      precision: { accuracy: 0.26, reaction: 0.08, acquire: 0.14, path: 0.22, correction: 0.16, precision: 0.14, tracking: 0 },
      tracking: { accuracy: 0.14, reaction: 0.08, acquire: 0.08, path: 0.2, correction: 0.14, precision: 0.06, tracking: 0.3 },
      switch: { accuracy: 0.2, reaction: 0.12, acquire: 0.2, path: 0.2, correction: 0.16, precision: 0.06, tracking: 0.06 },
      mixed: { accuracy: 0.2, reaction: 0.12, acquire: 0.14, path: 0.2, correction: 0.12, precision: 0.08, tracking: 0.14 },
    };
    const weights = weightSets[phase.focus] ?? weightSets.mixed;
    const composite =
      accuracyNorm * weights.accuracy +
      reactionNorm * weights.reaction +
      acquireNorm * weights.acquire +
      pathNorm * weights.path +
      correctionNorm * weights.correction +
      precisionNorm * weights.precision +
      trackingNorm * weights.tracking;
    const score = Math.round(
      composite * 1000 +
        hits * 34 +
        headshots * 18 -
        misses * 16,
    );

    return {
      label: phase.label,
      focus: phase.focus,
      valorantSensitivity: phase.valorantSensitivity,
      siteSensitivity: phase.siteSensitivity,
      hits,
      shots,
      misses,
      headshots,
      accuracy,
      avgReaction,
      avgAcquireTime,
      avgPathEfficiency,
      avgTrackingStability,
      avgCorrections,
      mouseTravel: roundTo(mouseTravel, 3),
      compositeScore: composite,
      score,
    };
  }

  buildSensitivityNotes(
    results,
    initialSensitivity,
    recommendedSensitivity,
    confidence,
    rangeMin,
    rangeMax,
  ) {
    const notes = [];
    const lower = results.filter((result) => result.valorantSensitivity < recommendedSensitivity);
    const higher = results.filter((result) => result.valorantSensitivity > recommendedSensitivity);
    const lowerPath = average(lower.map((result) => result.avgPathEfficiency));
    const higherPath = average(higher.map((result) => result.avgPathEfficiency));
    const lowerTracking = average(lower.map((result) => result.avgTrackingStability));
    const higherTracking = average(higher.map((result) => result.avgTrackingStability));

    if (lowerPath > higherPath + 0.05) {
      notes.push('Lower candidates gave you cleaner flick paths and fewer over-corrections.');
    } else if (higherTracking > lowerTracking + 0.05) {
      notes.push('Slightly higher candidates improved tracking continuity on moving targets.');
    }

    if (recommendedSensitivity < initialSensitivity - 0.02) {
      notes.push('Your test data leaned toward a slightly lower Valorant sens than the starting point.');
    } else if (recommendedSensitivity > initialSensitivity + 0.02) {
      notes.push('Your test data leaned toward a slightly higher Valorant sens than the starting point.');
    }

    if (confidence < 0.58) {
      notes.push(`Your nearby candidates were close, so treat ${rangeMin}-${rangeMax} as the safe comfort window.`);
    } else {
      notes.push(`The winning range separated clearly enough that ${roundTo(recommendedSensitivity)} is a stable final pick.`);
    }

    return notes.slice(0, 3);
  }

  mountGame() {
    this.mount.innerHTML = `
      <div class="game-shell">
        <div class="game-shell__viewport"></div>
        <div class="hud">
          <div class="hud__panel hud__panel--left-top">
            <div class="hud__scenario">${this.scenario.title}</div>
            <div class="hud__meta">${this.i18n.t(`categories.${this.scenario.category}`)} • ${this.i18n.t(
              `weapons.${this.currentWeaponType}`,
            )}</div>
          </div>
          ${
            this.sensitivityFinder
              ? `
                <div class="hud__panel hud__panel--finder">
                  <div class="hud__finder-phase">Preparing calibration...</div>
                  <div class="hud__finder-sens">VAL sens --</div>
                  <div class="hud__finder-note">Provisional recommendation after ~3 minutes</div>
                </div>
              `
              : ''
          }
          <div class="hud__panel hud__panel--top-center">
            <div class="hud__timer-label">${this.i18n.t('labels.timer')}</div>
            <div class="hud__timer">00:00</div>
          </div>
          <div class="hud__panel hud__panel--right-top">
            <div class="hud__score">0</div>
            <div class="hud__accuracy">${this.i18n.t('labels.accuracy')}: 100%</div>
          </div>
          <div class="hud__panel hud__panel--left-bottom">
            <div class="hud__ammo">0 / 0</div>
            <div class="hud__weapon">${this.i18n.t(`weapons.${this.currentWeaponType}`)}</div>
          </div>
          <div class="hud__panel hud__panel--right-bottom">
            <div class="hud__streak">x1</div>
            <div class="hud__fps">FPS: 0</div>
          </div>
          <button class="hud__fullscreen" type="button" data-action="fullscreen" aria-label="${this.i18n.t(
            'hud.fullscreen',
          )}">${this.i18n.t('hud.fullscreen')}</button>
          <div class="hud__center-text"></div>
          <div class="hud__hitmarker">✕</div>
          <div class="crosshair game-crosshair" aria-hidden="true">${createCrosshairMarkup()}</div>
          <div class="hud__overlay" aria-live="polite"></div>
          <div class="touch-controls ${supportsTouch() ? 'touch-controls--visible' : ''}">
            <div class="touch-controls__pad" data-touch="look">
              <div class="touch-controls__nub"></div>
            </div>
            <button class="touch-controls__fire" type="button" data-touch="fire" aria-label="${this.i18n.t(
              'settings.shoot',
            )}">FIRE</button>
            <button class="touch-controls__ads" type="button" data-touch="ads" aria-label="ADS">ADS</button>
          </div>
        </div>
        <div class="pause-overlay is-visible">
          <div class="pause-overlay__card">
            <h2>${this.i18n.t('hud.paused')}</h2>
            <p>${this.i18n.t('hud.pointerLock')}</p>
            <div class="pause-overlay__controls">
              <button type="button" class="button button--primary" data-action="capture">${this.i18n.t(
                'hud.capture',
              )}</button>
              <button type="button" class="button" data-action="restart">${this.i18n.t('settings.restart')}</button>
              <button type="button" class="button" data-action="exit">${this.i18n.t('settings.backToMenu')}</button>
            </div>
            <details class="pause-settings">
              <summary>${this.i18n.t('nav.settings')}</summary>
              <div class="pause-settings__body">
                <label class="pause-settings__row">
                  <span>${this.i18n.t('settings.sensitivity')}</span>
                  <input type="range" min="0.1" max="10" step="0.1" value="${this.settings.input.sensitivity}" data-pause-setting="sensitivity" />
                  <span class="pause-settings__value">${this.settings.input.sensitivity}</span>
                </label>
                <label class="pause-settings__row">
                  <span>${this.i18n.t('settings.crosshairColor')}</span>
                  <input type="color" value="${this.settings.crosshair.color}" data-pause-setting="crosshairColor" />
                </label>
                <label class="pause-settings__row">
                  <span>${this.i18n.t('settings.crosshairSize')}</span>
                  <input type="range" min="4" max="32" step="1" value="${this.settings.crosshair.size}" data-pause-setting="crosshairSize" />
                  <span class="pause-settings__value">${this.settings.crosshair.size}</span>
                </label>
                <label class="pause-settings__row">
                  <span>${this.i18n.t('settings.masterVolume')}</span>
                  <input type="range" min="0" max="100" step="1" value="${this.settings.audio.masterVolume}" data-pause-setting="masterVolume" />
                  <span class="pause-settings__value">${this.settings.audio.masterVolume}</span>
                </label>
                <label class="pause-settings__row">
                  <span>${this.i18n.t('settings.fov')}</span>
                  <input type="range" min="60" max="120" step="1" value="${this.settings.display.fov}" data-pause-setting="fov" />
                  <span class="pause-settings__value">${this.settings.display.fov}</span>
                </label>
                <label class="pause-settings__row">
                  <span>${this.i18n.t('settings.infiniteAmmo')}</span>
                  <input type="checkbox" ${this.settings.gameplay.infiniteAmmo ? 'checked' : ''} data-pause-setting="infiniteAmmo" />
                </label>
              </div>
            </details>
            <p class="pause-overlay__hint">LMB shoot • RMB ADS • R reload • ESC pause</p>
          </div>
        </div>
      </div>
    `;

    this.viewport = this.mount.querySelector('.game-shell__viewport');
    this.scenarioEl = this.mount.querySelector('.hud__scenario');
    this.metaEl = this.mount.querySelector('.hud__meta');
    this.timerEl = this.mount.querySelector('.hud__timer');
    this.scoreEl = this.mount.querySelector('.hud__score');
    this.accuracyEl = this.mount.querySelector('.hud__accuracy');
    this.ammoEl = this.mount.querySelector('.hud__ammo');
    this.streakEl = this.mount.querySelector('.hud__streak');
    this.fpsEl = this.mount.querySelector('.hud__fps');
    this.overlayEl = this.mount.querySelector('.hud__overlay');
    this.centerTextEl = this.mount.querySelector('.hud__center-text');
    this.hitmarkerEl = this.mount.querySelector('.hud__hitmarker');
    this.crosshairEl = this.mount.querySelector('.game-crosshair');
    this.pauseOverlayEl = this.mount.querySelector('.pause-overlay');
    this.touchPadEl = this.mount.querySelector('[data-touch="look"]');
    this.touchNubEl = this.mount.querySelector('.touch-controls__nub');
    this.finderPhaseEl = this.mount.querySelector('.hud__finder-phase');
    this.finderSensEl = this.mount.querySelector('.hud__finder-sens');
    this.finderNoteEl = this.mount.querySelector('.hud__finder-note');

    this.initThree();
    this.initPools();
    this.bindEvents();
    if (this.sensitivityFinder) {
      this.beginSensitivityPhase(0);
    }
    this.fillSpawnQueue();
    this.updateHud();
    this.frame();
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      this.settings.display.fov,
      this.viewport.clientWidth / this.viewport.clientHeight,
      0.1,
      200,
    );
    this.camera.position.set(0, 1.7, 2.4);

    this.renderer = new THREE.WebGLRenderer({
      antialias: this.settings.graphics.antialias,
      powerPreference: 'high-performance',
    });
    this.renderer.shadowMap.enabled = this.settings.graphics.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(
      Math.max(
        0.5,
        Math.min(window.devicePixelRatio, 2) * this.settings.display.resolutionScale,
      ),
    );
    this.renderer.setSize(this.viewport.clientWidth, this.viewport.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.viewport.append(this.renderer.domElement);

    this.buildEnvironment(this.settings.graphics.theme);

    const ambient = new THREE.AmbientLight('#ffffff', 0.7);
    const directional = new THREE.DirectionalLight('#ffffff', 1.1);
    directional.position.set(6, 10, 4);
    directional.castShadow = this.settings.graphics.shadows;
    directional.shadow.mapSize.set(1024, 1024);
    this.scene.add(ambient, directional);

    this.weapon = buildWeapon(this.currentWeaponType);
    this.camera.add(this.weapon);
    this.scene.add(this.camera);

    this.particles = new ParticlePool(this.scene, 64);
    applyCrosshairStyles(this.crosshairEl, this.settings);
  }

  setWeaponType(nextWeaponType) {
    if (!nextWeaponType) return;
    const stats = WEAPON_STATS[nextWeaponType];
    if (!stats) return;

    this.currentWeaponType = nextWeaponType;
    this.weaponStats = stats;
    this.ammo = stats.magazineSize;
    this.reloading = false;
    this.reloadEndAt = 0;

    if (this.weapon) {
      this.camera.remove(this.weapon);
    }

    this.weapon = buildWeapon(nextWeaponType);
    this.camera.add(this.weapon);
  }

  captureStatsSnapshot() {
    return {
      score: this.stats.score,
      shots: this.stats.shots,
      hits: this.stats.hits,
      misses: this.stats.misses,
      headshots: this.stats.headshots,
      reactionIndex: this.stats.reactionTimes.length,
      angularTravel: this.lookTelemetry.angularTravel,
    };
  }

  clearTargets() {
    for (const item of this.spherePool) {
      item.active = false;
      item.mesh.visible = false;
      item.mesh.material.emissiveIntensity = 0.25;
    }
    for (const item of this.botPool) {
      item.active = false;
      item.group.visible = false;
    }
    this.activeTargets = [];
  }

  beginSensitivityPhase(phaseIndex) {
    if (!this.sensitivityFinder) return;
    const phase = this.sensitivityFinder.phases[phaseIndex];
    if (!phase) return;

    this.finishSensitivityPhase();
    this.sensitivityFinder.phaseIndex = phaseIndex;
    this.sensitivityFinder.phaseStartedAt = this.actualElapsed;
    this.scenario = {
      ...this.baseScenario,
      ...phase.config,
      duration: this.baseScenario.duration,
      totalTargets: 999,
      sensitivityFinder: true,
      title: this.baseScenario.title,
    };
    this.settings.input.sensitivity = phase.siteSensitivity;
    this.setWeaponType(this.scenario.weapon || this.currentWeaponType);
    this.clearTargets();
    this.spawnedCount = 0;
    this.lastSpawnAt = 0;
    this.sensitivityFinder.phaseStartStats = this.captureStatsSnapshot();
    this.sensitivityFinder.phaseTargetMetrics = [];
    this.showCenterText(phase.label.toUpperCase(), 'hit');
    this.fillSpawnQueue();
  }

  finishSensitivityPhase() {
    if (!this.sensitivityFinder || this.sensitivityFinder.phaseIndex < 0) return;
    const phase = this.sensitivityFinder.phases[this.sensitivityFinder.phaseIndex];
    const snapshot = this.sensitivityFinder.phaseStartStats;
    if (!phase || !snapshot) return;

    const reactions = this.stats.reactionTimes.slice(snapshot.reactionIndex);
    const shots = this.stats.shots - snapshot.shots;
    const hits = this.stats.hits - snapshot.hits;
    const misses = this.stats.misses - snapshot.misses;
    const headshots = this.stats.headshots - snapshot.headshots;
    const mouseTravel = this.lookTelemetry.angularTravel - snapshot.angularTravel;
    this.activeTargets.forEach((target) => this.finalizeTargetTelemetry(target, false));
    const phaseResult = this.scoreSensitivityPhase(
      phase,
      {
        reactions,
        shots,
        hits,
        misses,
        headshots,
        mouseTravel,
      },
      this.sensitivityFinder.phaseTargetMetrics,
    );

    this.sensitivityFinder.phaseResults.push(phaseResult);

    if (
      !this.sensitivityFinder.provisionalRecommendation &&
      this.actualElapsed >= this.sensitivityFinder.provisionalAt
    ) {
      this.sensitivityFinder.provisionalRecommendation = this.getSensitivityRecommendation(
        this.sensitivityFinder.phaseResults,
      );
      this.configureSensitivityRefinement(
        this.sensitivityFinder.provisionalRecommendation.recommendedValorantSensitivity,
      );
    }

    this.sensitivityFinder.phaseStartStats = null;
    this.sensitivityFinder.phaseTargetMetrics = [];
  }

  getSensitivityRecommendation(results) {
    if (!results.length) return null;

    const grouped = new Map();
    results.forEach((result) => {
      const key = result.valorantSensitivity.toFixed(3);
      const entry = grouped.get(key) ?? {
        valorantSensitivity: result.valorantSensitivity,
        siteSensitivity: result.siteSensitivity,
        totalScore: 0,
        totalComposite: 0,
        runs: 0,
        rangeMin: result.valorantSensitivity,
        rangeMax: result.valorantSensitivity,
      };
      entry.totalScore += result.score;
      entry.totalComposite += result.compositeScore;
      entry.runs += 1;
      entry.rangeMin = Math.min(entry.rangeMin, result.valorantSensitivity);
      entry.rangeMax = Math.max(entry.rangeMax, result.valorantSensitivity);
      grouped.set(key, entry);
    });

    const ranked = [...grouped.values()]
      .map((entry) => ({
        ...entry,
        averageScore: entry.totalScore / entry.runs,
        averageComposite: entry.totalComposite / entry.runs,
      }))
      .sort((left, right) => right.averageComposite - left.averageComposite);

    const bestComposite = ranked[0].averageComposite;
    const contenders = ranked
      .filter((entry) => entry.averageComposite >= bestComposite * 0.95)
      .slice(0, 4);
    const totalWeight =
      contenders.reduce((sum, entry) => sum + entry.averageComposite ** 2, 0) || 1;

    const recommendedValorantSensitivity = roundTo(
      contenders.reduce(
        (sum, entry) => sum + entry.valorantSensitivity * entry.averageComposite ** 2,
        0,
      ) / totalWeight,
    );
    const contenderRange = {
      min: roundTo(Math.min(...contenders.map((entry) => entry.valorantSensitivity))),
      max: roundTo(Math.max(...contenders.map((entry) => entry.valorantSensitivity))),
    };
    const secondComposite = ranked[1]?.averageComposite ?? bestComposite * 0.92;
    const separation = bestComposite ? (bestComposite - secondComposite) / bestComposite : 0;
    const spreadPenalty =
      recommendedValorantSensitivity > 0
        ? Math.abs(contenderRange.max - contenderRange.min) /
          recommendedValorantSensitivity
        : 0;
    const confidence = clamp(
      0.45 + separation * 1.7 + (1 - Math.min(spreadPenalty, 0.18) / 0.18) * 0.2,
      0.35,
      0.96,
    );
    const focusLeaders = ['flick', 'precision', 'tracking', 'switch', 'mixed']
      .map((focus) => {
        const bestResult = results
          .filter((result) => result.focus === focus)
          .sort((left, right) => right.compositeScore - left.compositeScore)[0];
        if (!bestResult) return null;

        return {
          focus,
          label: bestResult.label,
          valorantSensitivity: bestResult.valorantSensitivity,
          score: bestResult.score,
        };
      })
      .filter(Boolean);

    return {
      recommendedValorantSensitivity,
      recommendedSiteSensitivity: roundTo(
        valorantSensitivityToSite(this.sensitivityFinder.dpi, recommendedValorantSensitivity),
        2,
      ),
      rangeMin: contenderRange.min,
      rangeMax: contenderRange.max,
      confidence,
      focusLeaders,
      notes: this.buildSensitivityNotes(
        results,
        this.sensitivityFinder.initialValorantSensitivity,
        recommendedValorantSensitivity,
        confidence,
        contenderRange.min,
        contenderRange.max,
      ),
      topPhases: [...results]
        .sort((left, right) => right.score - left.score)
        .slice(0, 4),
    };
  }

  buildEnvironment(theme) {
    if (this.environmentGroup) {
      this.scene.remove(this.environmentGroup);
    }

    const group = new THREE.Group();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({
        color:
          theme === 'military-range'
            ? '#8d7f67'
            : theme === 'cyber-grid'
              ? '#03070d'
              : theme === 'minimal-white'
                ? '#f1f1f1'
                : '#111318',
        roughness: 0.88,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);

    const wallColor =
      theme === 'military-range'
        ? '#6f6252'
        : theme === 'cyber-grid'
          ? '#070f18'
          : theme === 'minimal-white'
            ? '#fafafa'
            : '#161a20';
    const wallMaterial = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.95 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(30, 12, 0.3), wallMaterial);
    backWall.position.set(0, 5, -20);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 12, 30), wallMaterial);
    leftWall.position.set(-15, 5, -5);
    const rightWall = leftWall.clone();
    rightWall.position.x = 15;
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(30, 0.3, 30), wallMaterial);
    ceiling.position.set(0, 10, -5);
    group.add(backWall, leftWall, rightWall, ceiling);

    if (theme === 'cyber-grid') {
      const grid = new THREE.GridHelper(50, 50, '#00d2ff', '#114a61');
      group.add(grid);
      this.scene.fog = new THREE.Fog('#02060d', 12, 40);
      this.renderer?.setClearColor('#02060d');
    } else if (theme === 'minimal-white') {
      this.scene.fog = new THREE.Fog('#f4f4f4', 18, 60);
      this.renderer?.setClearColor('#eff2f5');
    } else if (theme === 'military-range') {
      for (let index = 0; index < 6; index += 1) {
        const lane = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.02, 8),
          new THREE.MeshStandardMaterial({ color: '#ded2bf' }),
        );
        lane.position.set(-10 + index * 4, 0.02, -8);
        group.add(lane);
      }
      this.scene.fog = new THREE.Fog('#4c463e', 20, 60);
      this.renderer?.setClearColor('#3b362f');
    } else {
      this.scene.fog = new THREE.Fog('#0b1017', 18, 55);
      this.renderer?.setClearColor('#0b1017');
    }

    this.environmentGroup = group;
    this.scene.add(group);
  }

  initPools() {
    const segments = qualitySegments(this.settings.graphics.targetQuality);
    const sphereGeometry = new THREE.SphereGeometry(0.35, segments, segments);

    const poolSize = Math.max(32, (this.scenario.concurrentTargets ?? 1) + 8);
    for (let index = 0; index < poolSize; index += 1) {
      const mesh = new THREE.Mesh(sphereGeometry, createMaterial('#ff4444'));
      mesh.visible = false;
      mesh.castShadow = this.settings.graphics.shadows;
      mesh.receiveShadow = true;
      mesh.userData.hitbox = true;
      this.scene.add(mesh);
      this.spherePool.push({ mesh, active: false });
    }

    for (let index = 0; index < 10; index += 1) {
      const group = createBot();
      group.visible = false;
      this.scene.add(group);
      this.botPool.push({ group, active: false });
    }
  }

  bindEvents() {
    const listen = (target, type, handler, options) => {
      target.addEventListener(type, handler, options);
      this.listeners.push(() => target.removeEventListener(type, handler, options));
    };

    listen(window, 'resize', () => this.handleResize());
    listen(document, 'mousemove', (event) => this.handleMouseMove(event));
    listen(document, 'mousedown', (event) => this.handleMouseDown(event));
    listen(document, 'mouseup', (event) => this.handleMouseUp(event));
    listen(document, 'keydown', (event) => this.handleKeyDown(event));
    listen(document, 'keyup', (event) => this.handleKeyUp(event));
    listen(document, 'pointerlockchange', () => this.handlePointerLockChange());
    listen(document, 'contextmenu', (event) => event.preventDefault());
    listen(this.mount, 'click', (event) => this.handleUiClick(event));
    listen(this.mount, 'touchstart', (event) => this.handleTouchStart(event), { passive: false });
    listen(this.mount, 'touchmove', (event) => this.handleTouchMove(event), { passive: false });
    listen(this.mount, 'touchend', (event) => this.handleTouchEnd(event));
    listen(this.mount, 'input', (event) => this.handlePauseSettingInput(event));
    listen(this.renderer.domElement, 'click', () => {
      if (!this.pointerLocked && !this.ended) {
        this.renderer.domElement.requestPointerLock();
      }
    });
  }

  handlePauseSettingInput(event) {
    const el = event.target;
    const key = el.dataset?.pauseSetting;
    if (!key) return;
    const value = el.type === 'color' ? el.value : el.type === 'checkbox' ? el.checked : Number(el.value);
    const valueLabel = el.parentElement?.querySelector('.pause-settings__value');
    if (valueLabel && el.type !== 'color') valueLabel.textContent = value;
    if (key === 'sensitivity') this.settings.input.sensitivity = value;
    if (key === 'crosshairColor') { this.settings.crosshair.color = value; applyCrosshairStyles(this.crosshairEl, this.settings); }
    if (key === 'crosshairSize') { this.settings.crosshair.size = value; applyCrosshairStyles(this.crosshairEl, this.settings); }
    if (key === 'masterVolume') { this.settings.audio.masterVolume = value; this.sound.updateSettings(this.settings); }
    if (key === 'fov') { this.settings.display.fov = value; this.baseFov = value; }
    if (key === 'infiniteAmmo') {
      this.settings.gameplay.infiniteAmmo = value;
      if (value && this.weaponStats) this.ammo = this.weaponStats.magazineSize;
    }
  }

  handleResize() {
    if (!this.renderer || !this.camera) return;
    const { clientWidth, clientHeight } = this.viewport;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
    this.renderer.setPixelRatio(
      Math.max(0.5, Math.min(window.devicePixelRatio, 2) * this.settings.display.resolutionScale),
    );
  }

  handleUiClick(event) {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    if (action === 'capture') {
      this.sound.ensureContext();
      this.renderer.domElement.requestPointerLock();
    }
    if (action === 'restart') this.callbacks.onRestart?.();
    if (action === 'exit') this.callbacks.onExit?.();
    if (action === 'fullscreen') this.toggleFullscreen();
  }

  applyLookDelta(deltaYaw, deltaPitch) {
    this.pointer.yaw += deltaYaw;
    this.pointer.pitch = clamp(
      this.pointer.pitch + deltaPitch,
      -Math.PI / 2.1,
      Math.PI / 2.1,
    );
    this.lookTelemetry.angularTravel += Math.hypot(deltaYaw, deltaPitch);
    this.lookTelemetry.samples += 1;
  }

  handleMouseMove(event) {
    if (!this.pointerLocked || this.paused || this.ended) return;
    const sensitivity =
      (this.settings.input.sensitivity / 200) *
      (this.ads ? this.settings.input.adsMultiplier : 1);
    this.applyLookDelta(-event.movementX * sensitivity, -event.movementY * sensitivity);
  }

  handleMouseDown(event) {
    if (event.button === 2) {
      this.ads = true;
      return;
    }

    if (event.button !== 0) return;
    this.firePressed = true;
    this.sound.ensureContext();
    if (this.pointerLocked && !this.paused && !this.ended) {
      this.tryShoot();
    }
  }

  handleMouseUp(event) {
    if (event.button === 0) this.firePressed = false;
    if (event.button === 2) this.ads = false;
  }

  handleKeyDown(event) {
    if (event.code === 'KeyW') this.movement.forward = true;
    if (event.code === 'KeyS') this.movement.backward = true;
    if (event.code === 'KeyA') this.movement.left = true;
    if (event.code === 'KeyD') this.movement.right = true;

    if (
      event.code === this.settings.keybinds.restart &&
      (this.paused || this.ended || this.settings.keybinds.restart !== 'KeyR')
    ) {
      this.callbacks.onRestart?.();
    }
    if (event.code === this.settings.keybinds.backToMenu) this.callbacks.onExit?.();
    if (event.code === 'KeyR') this.startReload();
  }

  handleKeyUp(event) {
    if (event.code === 'KeyW') this.movement.forward = false;
    if (event.code === 'KeyS') this.movement.backward = false;
    if (event.code === 'KeyA') this.movement.left = false;
    if (event.code === 'KeyD') this.movement.right = false;
  }

  handlePointerLockChange() {
    if (this.disposed) return;
    const locked = document.pointerLockElement === this.renderer.domElement;
    this.pointerLocked = locked;

    if (locked) {
      this.pauseOverlayEl.classList.remove('is-visible');
      this.paused = false;
      this.sessionStarted = true;
      this.pauseOverlayEl.querySelector('p').textContent = this.i18n.t('hud.pointerLock');
      return;
    }

    if (!this.ended) {
      this.paused = true;
      this.pauseOverlayEl.classList.add('is-visible');
      this.pauseOverlayEl.querySelector('p').textContent = this.i18n.t('messages.pointerLockLost');
    }
  }

  handleTouchStart(event) {
    const target = event.target.closest('[data-touch]');
    if (!target) return;
    event.preventDefault();
    const action = target.dataset.touch;

    if (action === 'look') {
      const touch = event.changedTouches[0];
      this.touchLook = { active: true, id: touch.identifier, x: touch.clientX, y: touch.clientY };
      if (!this.sessionStarted) {
        this.sessionStarted = true;
        this.paused = false;
        this.pauseOverlayEl.classList.remove('is-visible');
      }
    }
    if (action === 'fire') {
      this.firePressed = true;
      this.tryShoot();
    }
    if (action === 'ads') this.ads = true;
  }

  handleTouchMove(event) {
    if (!this.touchLook.active || this.paused) return;
    const touch = [...event.changedTouches].find((item) => item.identifier === this.touchLook.id);
    if (!touch) return;
    event.preventDefault();

    const deltaX = touch.clientX - this.touchLook.x;
    const deltaY = touch.clientY - this.touchLook.y;
    this.touchLook.x = touch.clientX;
    this.touchLook.y = touch.clientY;
    this.applyLookDelta(-deltaX * 0.006, -deltaY * 0.006);
    this.touchNubEl.style.transform = `translate(${clamp(deltaX, -28, 28)}px, ${clamp(deltaY, -28, 28)}px)`;
  }

  handleTouchEnd(event) {
    for (const touch of event.changedTouches) {
      if (touch.identifier === this.touchLook.id) {
        this.touchLook = { active: false, id: null, x: 0, y: 0 };
        this.touchNubEl.style.transform = 'translate(0px, 0px)';
      }
    }
    this.firePressed = false;
    this.ads = false;
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.mount.requestFullscreen?.().catch(() => {});
      return;
    }
    document.exitFullscreen?.().catch(() => {});
  }

  startReload() {
    if (this.reloading || this.ammo === this.weaponStats.magazineSize) return;
    this.reloading = true;
    this.reloadEndAt = performance.now() + 900;
  }

  fillSpawnQueue() {
    while (this.activeTargets.length < this.scenario.concurrentTargets) {
      if (!this.canSpawnMore()) break;
      this.spawnTarget();
    }
  }

  canSpawnMore() {
    if (this.scenario.duration > 0 && this.scenario.goal !== 'clear' && this.scenario.goal !== 'clear-or-time') {
      return true;
    }
    return this.spawnedCount < this.scenario.totalTargets;
  }

  acquireSphere() {
    return this.spherePool.find((item) => !item.active) ?? null;
  }

  acquireBot() {
    return this.botPool.find((item) => !item.active) ?? null;
  }

  /** Visible bounds for targets: above floor, below ceiling, within walls */
  getVisibleBounds(z) {
    const minY = 0.3;
    const maxY = 8.0;
    const maxX = 13.5;
    return { minX: -maxX, maxX, minY, maxY, minZ: -19.5, maxZ: -3.5 };
  }

  clampPosition(position) {
    const bounds = this.getVisibleBounds(position.z);
    position.x = clamp(position.x, bounds.minX, bounds.maxX);
    position.y = clamp(position.y, bounds.minY, bounds.maxY);
    position.z = clamp(position.z, bounds.minZ, bounds.maxZ);
    return position;
  }

  getSpawnScreenBounds() {
    const angleFactor = clamp((this.scenario.spawnAngle ?? 180) / 180, 0.1, 1.5);
    if (this.scenario.tags.includes('center')) {
      return { maxX: 0.24 * angleFactor, maxY: 0.18 * angleFactor };
    }
    if (this.scenario.tags.includes('wide-angle')) {
      return { maxX: 0.92 * angleFactor, maxY: 0.42 * angleFactor };
    }
    if (this.scenario.grid) {
      return { maxX: 0.62 * angleFactor, maxY: 0.34 * angleFactor };
    }
    return { maxX: 0.7 * angleFactor, maxY: 0.4 * angleFactor };
  }

  getSpawnDistance() {
    if (this.scenario.tags.includes('far-range')) return 22;
    if (this.scenario.tags.includes('close-range')) return 10;
    return this.scenario.targetType === 'bot' ? 16 : 14;
  }

  getSpawnScreenPoint(slotIndex) {
    const bounds = this.getSpawnScreenBounds();

    if (this.scenario.grid && this.scenario.movement !== 'random-gridless') {
      const row = Math.floor(slotIndex / this.scenario.grid.cols);
      const col = slotIndex % this.scenario.grid.cols;
      const width = Math.max(this.scenario.grid.cols - 1, 1);
      const height = Math.max(this.scenario.grid.rows - 1, 1);
      return {
        x: ((col - width / 2) / width) * bounds.maxX,
        y: ((height / 2 - row) / height) * bounds.maxY,
      };
    }

    if (this.scenario.movement === 'alternate-sides') {
      return {
        x: this.spawnedCount % 2 === 0 ? -bounds.maxX * 0.9 : bounds.maxX * 0.9,
        y: THREE.MathUtils.randFloat(-bounds.maxY, bounds.maxY),
      };
    }

    if (this.scenario.movement === 'horizontal-sequence') {
      return {
        x: -bounds.maxX + ((this.spawnedCount % 8) / 7) * bounds.maxX * 2,
        y: THREE.MathUtils.randFloat(-bounds.maxY * 0.7, bounds.maxY * 0.7),
      };
    }

    if (this.scenario.movement === 'vertical-sequence') {
      return {
        x: THREE.MathUtils.randFloat(-bounds.maxX * 0.35, bounds.maxX * 0.35),
        y: bounds.maxY - ((this.spawnedCount % 6) / 5) * bounds.maxY * 2,
      };
    }

    if (this.scenario.movement === 'vertical-lane') {
      return {
        x: THREE.MathUtils.randFloat(-bounds.maxX * 0.2, bounds.maxX * 0.2),
        y: THREE.MathUtils.randFloat(-bounds.maxY, bounds.maxY),
      };
    }

    if (this.scenario.movement === 'horizontal-lane') {
      return {
        x: THREE.MathUtils.randFloat(-bounds.maxX, bounds.maxX),
        y: THREE.MathUtils.randFloat(-bounds.maxY * 0.18, bounds.maxY * 0.18),
      };
    }

    if (this.scenario.movement === 'diagonal-lane') {
      const x = THREE.MathUtils.randFloat(-bounds.maxX, bounds.maxX);
      return { x, y: clamp(x * 0.5, -bounds.maxY, bounds.maxY) };
    }

    return {
      x: THREE.MathUtils.randFloat(-bounds.maxX, bounds.maxX),
      y: THREE.MathUtils.randFloat(-bounds.maxY, bounds.maxY),
    };
  }

  screenPointToWorldPosition(x, y, distance) {
    this.camera.updateMatrixWorld();
    const point = new THREE.Vector3(x, y, 0.5).unproject(this.camera);
    const direction = point.sub(this.camera.position).normalize();
    return this.camera.position.clone().add(direction.multiplyScalar(distance));
  }

  isPositionVisible(position, marginX = 0.94, marginY = 0.88) {
    const projected = position.clone().project(this.camera);
    return (
      projected.z > -1 &&
      projected.z < 1 &&
      Math.abs(projected.x) <= marginX &&
      Math.abs(projected.y) <= marginY
    );
  }

  getSpawnPosition(slotIndex) {
    let fallback = null;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const screenPoint = this.getSpawnScreenPoint(slotIndex);
      const distance = this.getSpawnDistance() + THREE.MathUtils.randFloatSpread(2.2);
      const position = this.clampPosition(
        this.screenPointToWorldPosition(screenPoint.x, screenPoint.y, distance),
      );
      fallback = position;
      if (this.isPositionVisible(position)) {
        return position;
      }
    }

    return fallback ?? new THREE.Vector3(0, 1.7, -12);
  }

  configureSphereTarget(poolItem, slotIndex) {
    const position = this.getSpawnPosition(slotIndex);
    const mesh = poolItem.mesh;
    mesh.visible = true;
    mesh.position.copy(position);
    mesh.scale.setScalar(this.scenario.radius / 0.35);

    let color = '#ff4444';
    let colorRole = 'live';
    if (this.scenario.colorRule === 'green-only') {
      const live = Math.random() > 0.45;
      color = live ? '#48ff70' : '#ff5353';
      colorRole = live ? 'live' : 'decoy';
    }
    if (this.scenario.colorRule === 'real-only') {
      const live = Math.random() > 0.4;
      color = live ? '#ff4444' : '#9aa0a6';
      colorRole = live ? 'live' : 'decoy';
    }
    if (this.scenario.colorRule === 'red-only') {
      color = slotIndex === 0 ? '#ff4444' : ['#68a8ff', '#ffd54f'][slotIndex % 2];
      colorRole = slotIndex === 0 ? 'live' : 'decoy';
    }
    if (this.scenario.colorRule === 'detect-one') {
      const isTarget = slotIndex === 0;
      color = isTarget ? '#48ff70' : '#9aa0a6';
      colorRole = isTarget ? 'live' : 'decoy';
    }

    mesh.material.color.set(color);
    mesh.material.emissive.set(color);
    mesh.material.emissiveIntensity = 0.25;
    poolItem.active = true;

    const maxHp = this.scenario.targetHp || 0;
    return {
      id: `target-${++this.targetSequence}`,
      kind: this.scenario.targetType === 'hp-sphere' ? 'hp-sphere' : 'sphere',
      poolItem,
      mesh,
      hitboxes: [mesh],
      basePosition: position.clone(),
      spawnTime: performance.now(),
      expiryAt: this.scenario.expiry ? performance.now() + this.scenario.expiry * 1000 : 0,
      armedAt: this.scenario.soundCue ? performance.now() + 250 : performance.now(),
      colorRole,
      hoverProgress: 0,
      direction: Math.random() > 0.5 ? 1 : -1,
      seed: Math.random() * Math.PI * 2,
      burstColor: color,
      telemetry: this.createTargetTelemetry(position),
      hp: maxHp,
      maxHp,
    };
  }

  configureBotTarget(poolItem, slotIndex) {
    const group = poolItem.group;
    group.visible = true;
    const position = this.getSpawnPosition(slotIndex);
    position.y = -0.2;
    group.position.copy(position);
    group.rotation.set(0, 0, 0);
    poolItem.active = true;

    const priority = this.scenario.colorRule === 'priority-color' && Math.random() > 0.5;
    const torso = group.userData.parts.torso;
    torso.material.color.set(priority ? '#ff4444' : '#4b7cff');
    torso.material.emissive.set(priority ? '#ff4444' : '#4b7cff');

    return {
      id: `target-${++this.targetSequence}`,
      kind: 'bot',
      poolItem,
      mesh: group,
      hitboxes: group.userData.hitboxes,
      basePosition: position.clone(),
      spawnTime: performance.now(),
      expiryAt: this.scenario.expiry ? performance.now() + this.scenario.expiry * 1000 : 0,
      armedAt: performance.now(),
      hoverProgress: 0,
      direction: Math.random() > 0.5 ? 1 : -1,
      seed: Math.random() * Math.PI * 2,
      colorRole: priority ? 'priority' : 'live',
      burstColor: priority ? '#ff4444' : '#4b7cff',
      flinch: 0,
      telemetry: this.createTargetTelemetry(position),
    };
  }

  spawnTarget() {
    if (!this.canSpawnMore()) return;
    const slotIndex = this.activeTargets.length;
    const type =
      this.scenario.targetType === 'challenge'
        ? Math.random() > 0.5
          ? 'sphere'
          : 'bot'
        : this.scenario.targetType === 'reaction'
          ? 'sphere'
          : this.scenario.targetType;

    let target = null;
    if (type === 'bot') {
      const poolItem = this.acquireBot();
      if (poolItem) target = this.configureBotTarget(poolItem, slotIndex);
    } else {
      const poolItem = this.acquireSphere();
      if (poolItem) target = this.configureSphereTarget(poolItem, slotIndex);
    }

    if (!target) return;

    this.activeTargets.push(target);
    this.spawnedCount += 1;
    this.lastSpawnAt = performance.now();

    if (this.scenario.soundCue) {
      window.setTimeout(() => {
        if (!this.disposed && !this.ended) this.sound.playCue();
      }, 40);
    }
  }

  updateTargetMotion(target, elapsedSeconds, delta) {
    const mesh = target.mesh;
    const time = elapsedSeconds + target.seed;
    const speedFactor =
      1 + (this.actualElapsed / Math.max(this.scenario.duration || 60, 60)) * 0.8;

    if (target.kind === 'sphere') {
      mesh.position.copy(target.basePosition);
      mesh.visible = true;
      if (
        this.scenario.movement === 'horizontal' ||
        this.scenario.movement === 'horizontal-fast'
      ) {
        mesh.position.x +=
          Math.sin(
            time *
              (this.scenario.movement === 'horizontal-fast' ? 3.1 : 1.8) *
              speedFactor,
          ) * 3.2;
      }
      if (this.scenario.movement === 'vertical') {
        mesh.position.y += Math.sin(time * 1.9) * 2.2;
      }
      if (
        this.scenario.movement === 'circle' ||
        this.scenario.movement === 'drift-circle'
      ) {
        mesh.position.x += Math.cos(time * 1.4) * 2.1;
        mesh.position.y += Math.sin(time * 1.4) * 1.4;
      }
      if (this.scenario.movement === 'figure8') {
        mesh.position.x += Math.sin(time * 1.5) * 2.2;
        mesh.position.y += Math.sin(time * 3) * 1.2;
      }
      if (this.scenario.movement === 'spiral') {
        const radius = 0.4 + elapsedSeconds * 0.55;
        mesh.position.x += Math.cos(time * 2) * radius;
        mesh.position.y += Math.sin(time * 2) * radius * 0.6;
      }
      if (this.scenario.movement === 'jitter') {
        mesh.position.x += Math.sin(time * 4.8) * 0.8 + Math.cos(time * 2.4) * 0.6;
        mesh.position.y += Math.sin(time * 3.6) * 0.7;
      }
      if (this.scenario.movement === 'zigzag') {
        mesh.position.x += (Math.asin(Math.sin(time * 2.3)) / (Math.PI / 2)) * 3.2;
        mesh.position.y += Math.cos(time * 1.8) * 0.8;
      }
      if (this.scenario.movement === 'bounce') {
        mesh.position.x += Math.sin(time * 1.3) * 1.5;
        mesh.position.y += Math.abs(Math.sin(time * 2.8)) * 2 - 0.8;
      }
      if (this.scenario.movement === 'lissajous') {
        mesh.position.x += Math.sin(time * 2.1) * 2.6;
        mesh.position.y += Math.sin(time * 3.4 + 0.7) * 1.35;
      }
      if (this.scenario.movement === 'dash') {
        mesh.position.x += Math.sign(Math.sin(time * 2.5)) * 2.7 + Math.sin(time * 5.1) * 0.35;
        mesh.position.y += Math.cos(time * 2.5) * 0.45;
      }
      if (this.scenario.movement === 'peek-track') {
        mesh.position.x += Math.sin(time * 2.4) * 4.5;
        mesh.visible = Math.sin(time * 2.4) > -0.35;
      }
      if (this.scenario.movement === 'reactive-track') {
        mesh.position.x += Math.sin(time * 2.4 * target.direction) * 2.9;
        mesh.position.y += Math.cos(time * 2.1 * target.direction) * 0.9;
      }
      this.clampPosition(mesh.position);
      if (this.scenario.expiry && mesh.visible && performance.now() > target.expiryAt) {
        this.registerMiss(target, false);
      }
      return;
    }

    mesh.position.copy(target.basePosition);
    mesh.visible = true;
    if (
      this.scenario.botBehavior === 'patrol' ||
      this.scenario.botBehavior === 'strafe'
    ) {
      mesh.position.x +=
        Math.sin(time * (this.scenario.botBehavior === 'strafe' ? 3.1 : 1.5)) * 3.4;
    }
    if (this.scenario.botBehavior === 'micro-strafe') {
      mesh.position.x += Math.sin(time * 3.2) * 1.2;
    }
    if (this.scenario.botBehavior === 'wide-strafe') {
      mesh.position.x += Math.sin(time * 2.6) * 5.2;
    }
    if (this.scenario.botBehavior === 'burst-strafe') {
      mesh.position.x += Math.sign(Math.sin(time * 4.2)) * 2.2 + Math.sin(time * 7.4) * 0.5;
    }
    if (
      this.scenario.botBehavior === 'approach' ||
      this.scenario.botBehavior === 'rush'
    ) {
      mesh.position.z =
        target.basePosition.z +
        elapsedSeconds * (this.scenario.botBehavior === 'rush' ? 2.2 : 1.1);
      if (mesh.position.z > -3.5) {
        this.registerMiss(target, false);
      }
    }
    if (
      this.scenario.botBehavior === 'peek' ||
      this.scenario.botBehavior === 'peek-repeat'
    ) {
      mesh.position.x += Math.sin(time * 2.8) * 4.6;
      mesh.visible = Math.sin(time * 2.8) > -0.2;
    }
    if (this.scenario.botBehavior === 'jiggle') {
      mesh.position.x += Math.sign(Math.sin(time * 7)) * 1.4;
    }
    if (this.scenario.botBehavior === 'cross') {
      mesh.position.x = -5 + ((elapsedSeconds * 3) % 10);
    }
    if (this.scenario.botBehavior === 'anchor-peek') {
      mesh.position.x += Math.sin(time * 2.2) * 3.6;
      mesh.position.z += Math.cos(time * 2.2) * 0.9;
      mesh.visible = Math.sin(time * 2.2) > -0.15;
    }
    if (
      this.scenario.botBehavior === 'flank' ||
      this.scenario.botBehavior === 'ambush'
    ) {
      mesh.position.x += Math.sin(time * 1.5) * 5.5;
      mesh.position.z += Math.cos(time * 1.1) * 1.2;
    }
    if (this.scenario.botBehavior === 'retake') {
      mesh.position.x += Math.sin(time * 1.8) * 2.4;
      mesh.position.z += elapsedSeconds * 0.9;
    }
    if (this.scenario.botBehavior === 'walk-in') {
      mesh.position.x += Math.sin(time * 1.1) * 0.8;
      mesh.position.z += elapsedSeconds * 0.8;
    }
    if (this.scenario.botBehavior === 'site-hold') {
      mesh.position.x += Math.sin(time * 0.8 + target.direction) * 1.6;
    }

    this.clampPosition(mesh.position);

    const sway = Math.sin(time * 2) * 0.04;
    mesh.userData.parts.torso.scale.y = 1 + sway;
    mesh.userData.parts.leftUpperLeg.rotation.x = Math.sin(time * 3.2) * 0.4;
    mesh.userData.parts.rightUpperLeg.rotation.x = -Math.sin(time * 3.2) * 0.4;
    mesh.rotation.z = Math.sin(target.flinch) * 0.06;
    target.flinch = Math.max(0, target.flinch - delta * 7);
  }

  updateTargetTelemetry(delta) {
    if (!this.sensitivityFinder) return;

    for (const target of this.activeTargets) {
      if (!target.telemetry) continue;
      const telemetry = target.telemetry;
      const angularError = this.getAngularDistanceToPosition(target.mesh.position);
      telemetry.bestAngularError = Math.min(telemetry.bestAngularError, angularError);
      telemetry.errorSum += angularError;
      telemetry.errorSamples += 1;

      const deltaError =
        telemetry.lastError === null ? null : angularError - telemetry.lastError;
      if (
        deltaError !== null &&
        telemetry.lastErrorDelta !== null &&
        Math.sign(deltaError) !== 0 &&
        Math.sign(telemetry.lastErrorDelta) !== 0 &&
        Math.sign(deltaError) !== Math.sign(telemetry.lastErrorDelta) &&
        angularError < Math.max(telemetry.initialAngularError * 0.65, 0.14)
      ) {
        telemetry.correctionSwitches += 1;
      }
      telemetry.lastError = angularError;
      if (deltaError !== null) {
        telemetry.lastErrorDelta = deltaError;
      }

      if (this.currentTrackedTarget === target) {
        if (telemetry.firstAcquireAt === null) {
          telemetry.firstAcquireAt = performance.now();
        }
        if (!telemetry.isTracked) {
          telemetry.lockEntries += 1;
          telemetry.isTracked = true;
        }
        telemetry.trackedTime += delta * 1000;
      } else if (telemetry.isTracked) {
        telemetry.isTracked = false;
      }
    }
  }

  updateAimRaycast(delta) {
    const objects = [
      ...this.spherePool.filter((item) => item.active).map((item) => item.mesh),
      ...this.botPool
        .filter((item) => item.active)
        .flatMap((item) => item.group.userData.hitboxes),
    ];

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.currentAimIntersections = this.raycaster.intersectObjects(objects, false);
    this.currentTrackedTarget = null;

    if (!this.currentAimIntersections.length) return;

    const hitObject = this.currentAimIntersections[0].object;
    const target = this.activeTargets.find((entry) => entry.hitboxes.includes(hitObject));
    if (!target) return;
    this.currentTrackedTarget = target;

    if (target.kind === 'sphere' || target.kind === 'hp-sphere') {
      target.mesh.material.emissiveIntensity = 0.36;
    }

    if (
      (target.kind === 'sphere') &&
      this.scenario.interaction === 'hover' &&
      performance.now() >= target.armedAt
    ) {
      if (target.colorRole === 'decoy') return;
      target.hoverProgress += delta;
      if (target.hoverProgress >= this.scenario.trackHold) {
        this.registerHit(target, { part: 'body', autoTracked: true });
      }
    }

    if (
      target.kind === 'hp-sphere' &&
      this.scenario.interaction === 'dps' &&
      performance.now() >= target.armedAt
    ) {
      if (target.colorRole === 'decoy') return;
      const dps = 100;
      target.hp -= dps * delta;
      const hpRatio = clamp(target.hp / target.maxHp, 0, 1);
      target.mesh.material.emissiveIntensity = 0.2 + (1 - hpRatio) * 0.4;
      if (target.hp <= 0) {
        this.registerHit(target, { part: 'body', autoTracked: true });
      }
    }
  }

  getShotTargets() {
    if (!this.currentAimIntersections.length) return [];
    const hits = [];
    const uniqueTargets = new Set();

    for (const intersection of this.currentAimIntersections) {
      const target = this.activeTargets.find((entry) =>
        entry.hitboxes.includes(intersection.object),
      );
      if (!target || uniqueTargets.has(target)) continue;
      uniqueTargets.add(target);
      hits.push({
        target,
        object: intersection.object,
        part: intersection.object.userData.hitPart ?? 'body',
        point: intersection.point.clone(),
      });
      if (hits.length >= this.weaponStats.pellets) break;
    }

    if (this.weaponStats.pellets > 1 && hits.length < this.weaponStats.pellets) {
      const extras = this.activeTargets
        .filter((target) => !uniqueTargets.has(target))
        .map((target) => {
          const screen = target.mesh.position.clone().project(this.camera);
          return {
            target,
            distance: Math.hypot(screen.x, screen.y),
            point: target.mesh.position.clone(),
          };
        })
        .filter((entry) => entry.distance < 0.25)
        .sort((left, right) => left.distance - right.distance)
        .slice(0, this.weaponStats.pellets - hits.length)
        .map((entry) => ({
          target: entry.target,
          object: entry.target.hitboxes[0],
          part: 'body',
          point: entry.point,
        }));
      hits.push(...extras);
    }

    return hits;
  }

  tryShoot() {
    const now = performance.now();
    if (this.paused || this.ended || !this.sessionStarted || this.reloading) return;
    if (now - this.lastShotAt < this.weaponStats.fireRate * 1000) return;

    if (!this.settings.gameplay.infiniteAmmo) {
      if (this.ammo <= 0) {
        this.startReload();
        return;
      }
      this.ammo -= 1;
    }

    this.lastShotAt = now;
    this.recoilKick = 1;
    this.stats.shots += 1;
    const hits = this.getShotTargets();

    this.spawnTracer(hits.length ? hits[0].point : null);

    if (!hits.length) {
      this.registerMiss(null, true);
    } else {
      hits.forEach((hit) => this.registerHit(hit.target, hit));
    }

    if (this.ammo <= 0) {
      this.startReload();
    }
  }

  spawnTracer(hitPoint) {
    const muzzleOffset = new THREE.Vector3(0, 0, -2.5);
    const muzzleWorld = muzzleOffset.applyMatrix4(this.camera.matrixWorld);

    let endPoint;
    if (hitPoint) {
      endPoint = hitPoint.clone();
    } else {
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      endPoint = this.camera.position.clone().add(dir.multiplyScalar(80));
    }

    const direction = endPoint.clone().sub(muzzleWorld);
    const length = direction.length();
    const tracerLength = Math.min(length, 3.5);

    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      0, 0, 0,
      0, 0, -tracerLength,
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    const material = new THREE.LineBasicMaterial({
      color: '#ffaa44',
      transparent: true,
      opacity: 0.85,
      linewidth: 1,
    });
    const line = new THREE.Line(geometry, material);

    line.position.copy(muzzleWorld);
    line.lookAt(endPoint);

    this.scene.add(line);
    this.tracers.push({
      line,
      material,
      velocity: direction.normalize().multiplyScalar(220),
      age: 0,
      lifetime: 0.15,
    });
  }

  updateTracers(delta) {
    this.tracers = this.tracers.filter((tracer) => {
      tracer.age += delta;
      tracer.line.position.addScaledVector(tracer.velocity, delta);
      tracer.material.opacity = Math.max(0, 0.85 * (1 - tracer.age / tracer.lifetime));
      if (tracer.age >= tracer.lifetime) {
        this.scene.remove(tracer.line);
        tracer.line.geometry.dispose();
        tracer.material.dispose();
        return false;
      }
      return true;
    });
  }

  registerHit(target, hitInfo = {}) {
    if (!target || this.ended) return;

    if (target.colorRole === 'center-return') {
      this.registerCenterReturnHit(target);
      return;
    }

    if (this.scenario.headshotOnly && hitInfo.part !== 'head') {
      this.registerMiss(target, true);
      return;
    }

    if (this.scenario.bodyOnly && hitInfo.part === 'head') {
      this.registerMiss(target, true);
      return;
    }

    if (target.colorRole === 'decoy') {
      this.stats.score = Math.max(0, this.stats.score - 50);
      this.registerMiss(target, true);
      return;
    }

    if (target.colorRole === 'priority') {
      this.stats.score += 100;
    }

    this.stats.hits += 1;
    this.stats.streak += 1;
    this.stats.streakMax = Math.max(this.stats.streakMax, this.stats.streak);
    const reaction = performance.now() - target.spawnTime;
    this.stats.reactionTimes.push(reaction);
    const headshot = hitInfo.part === 'head';
    if (headshot) this.stats.headshots += 1;

    const speedBonus = reaction <= 300 ? 50 : 0;
    const multiplier = getStreakMultiplier(this.stats.streak);
    const baseScore = headshot ? 200 : 100;
    const gain = Math.round(baseScore * multiplier + speedBonus);
    this.stats.score += gain;
    this.sound[headshot ? 'playHeadshot' : 'playHit']();
    if (this.stats.streak % 5 === 0) {
      this.sound.playStreak(Math.floor(this.stats.streak / 5));
    }
    this.particles.burst(hitInfo.point ?? target.mesh.position, target.burstColor);
    this.flashHitMarker();
    this.showCenterText(
      headshot ? this.i18n.t('hud.headshot') : `+${gain}`,
      headshot ? 'headshot' : 'hit',
    );
    this.createPopup(
      `+${gain}${headshot ? ' HEADSHOT' : ''}`,
      hitInfo.point ?? target.mesh.position,
      'hit',
    );
    this.screenShake = Math.min(this.screenShake + 0.025, 0.08);

    if (target.kind === 'bot') target.flinch = 0.9;
    if (this.scenario.movement === 'reactive-track') target.direction *= -1;

    this.finalizeTargetTelemetry(target, true);
    this.deactivateTarget(target);
  }

  registerMiss(target, fromShot) {
    this.stats.misses += 1;
    this.stats.streak = 0;
    if (this.scenario.penaltyOnMiss) {
      this.stats.score = Math.max(0, this.stats.score + this.scenario.penaltyOnMiss);
    }
    if (fromShot) {
      this.sound.playMiss();
      this.showCenterText(this.i18n.t('hud.miss'), 'miss');
      this.screenShake = Math.min(this.screenShake + 0.04, 0.09);
    }
    if (target) {
      this.finalizeTargetTelemetry(target, false);
      this.deactivateTarget(target);
    }
    if (this.scenario.missEndsSession) this.endSession();
  }

  deactivateTarget(target) {
    if (!target) return;
    if (target.kind === 'bot') {
      target.poolItem.active = false;
      target.mesh.visible = false;
    } else {
      target.poolItem.active = false;
      target.mesh.visible = false;
      target.mesh.material.emissiveIntensity = 0.25;
    }

    this.activeTargets = this.activeTargets.filter((entry) => entry !== target);
    this.resolvedTargets += 1;

    if (this.scenario.centerReturn && !this.centerReturnActive) {
      this.spawnCenterReturnTarget();
      return;
    }

    if (this.scenario.burst && !this.activeTargets.length) {
      this.fillSpawnQueue();
      return;
    }

    if (this.canSpawnMore() && this.activeTargets.length < this.scenario.concurrentTargets) {
      this.spawnTarget();
    }

    if (!this.canSpawnMore() && !this.activeTargets.length && this.scenario.duration === 0) {
      this.endSession();
    }
  }

  spawnCenterReturnTarget() {
    const poolItem = this.acquireSphere();
    if (!poolItem) return;
    this.centerReturnActive = true;
    const mesh = poolItem.mesh;
    mesh.visible = true;
    const distance = 14;
    const position = this.screenPointToWorldPosition(0, 0, distance);
    mesh.position.copy(position);
    mesh.scale.setScalar(0.6);
    mesh.material.color.set('#ffd54f');
    mesh.material.emissive.set('#ffd54f');
    mesh.material.emissiveIntensity = 0.4;
    poolItem.active = true;
    const target = {
      id: `target-${++this.targetSequence}`,
      kind: 'sphere',
      poolItem,
      mesh,
      hitboxes: [mesh],
      basePosition: position.clone(),
      spawnTime: performance.now(),
      expiryAt: 0,
      armedAt: performance.now(),
      colorRole: 'center-return',
      hoverProgress: 0,
      direction: 1,
      seed: 0,
      burstColor: '#ffd54f',
      telemetry: null,
      hp: 0,
      maxHp: 0,
    };
    this.activeTargets.push(target);
  }

  registerCenterReturnHit(target) {
    this.centerReturnActive = false;
    target.poolItem.active = false;
    target.mesh.visible = false;
    target.mesh.material.emissiveIntensity = 0.25;
    this.activeTargets = this.activeTargets.filter((entry) => entry !== target);
    this.sound.playHit();
    this.particles.burst(target.mesh.position, target.burstColor);
    if (this.canSpawnMore()) {
      this.spawnTarget();
    }
  }

  createPopup(text, worldPosition, className) {
    const element = document.createElement('div');
    element.className = `hud-popup hud-popup--${className}`;
    element.textContent = text;
    this.overlayEl.append(element);
    this.popupItems.push({
      element,
      worldPosition: worldPosition.clone(),
      age: 0,
      lifetime: 0.7,
    });
  }

  flashHitMarker() {
    this.hitmarkerEl.classList.add('is-visible');
    window.setTimeout(() => this.hitmarkerEl.classList.remove('is-visible'), 100);
  }

  showCenterText(text, modifier) {
    this.centerTextEl.textContent = text;
    this.centerTextEl.dataset.state = modifier;
    this.centerTextEl.classList.add('is-visible');
    window.clearTimeout(this.centerTextTimeout);
    this.centerTextTimeout = window.setTimeout(() => {
      this.centerTextEl.classList.remove('is-visible');
    }, 300);
  }

  updatePopups(delta) {
    this.popupItems = this.popupItems.filter((popup) => {
      popup.age += delta;
      popup.worldPosition.y += delta * 0.5;
      const screen = popup.worldPosition.clone().project(this.camera);
      const x = (screen.x * 0.5 + 0.5) * this.viewport.clientWidth;
      const y = (-screen.y * 0.5 + 0.5) * this.viewport.clientHeight;
      popup.element.style.transform = `translate(${x}px, ${y}px)`;
      popup.element.style.opacity = `${1 - popup.age / popup.lifetime}`;
      if (popup.age >= popup.lifetime) {
        popup.element.remove();
        return false;
      }
      return true;
    });
  }

  updateHpBars() {
    const activeIds = new Set(this.activeTargets.filter(t => t.maxHp > 0).map(t => t.id));
    
    // Remove stale bars
    for (const [id, element] of this.hpBarItems.entries()) {
      if (!activeIds.has(id)) {
        element.remove();
        this.hpBarItems.delete(id);
      }
    }

    // Update or create active bars
    for (const target of this.activeTargets) {
      if (target.maxHp <= 0) continue;
      
      let element = this.hpBarItems.get(target.id);
      if (!element) {
        element = document.createElement('div');
        element.className = 'hp-bar-container';
        const fill = document.createElement('div');
        fill.className = 'hp-bar-fill';
        element.appendChild(fill);
        this.overlayEl.appendChild(element);
        this.hpBarItems.set(target.id, element);
      }

      const screenPos = target.mesh.position.clone();
      screenPos.y += 0.5; // Offset above target
      screenPos.project(this.camera);
      
      if (screenPos.z > 1) {
        element.style.display = 'none'; // Behind camera
        continue;
      }
      
      element.style.display = 'block';
      const x = (screenPos.x * 0.5 + 0.5) * this.viewport.clientWidth;
      const y = (-screenPos.y * 0.5 + 0.5) * this.viewport.clientHeight;
      element.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 100%))`;

      const fill = element.firstElementChild;
      const ratio = Math.max(0, target.hp / target.maxHp);
      fill.style.width = `${ratio * 100}%`;
      
      if (ratio > 0.6) fill.style.background = '#48ff70';
      else if (ratio > 0.3) fill.style.background = '#ffd54f';
      else fill.style.background = '#ff4444';
    }
  }

  updateMovement(delta) {
    const moveSpeed = 4.2;
    const forward = new THREE.Vector3(
      Math.sin(this.pointer.yaw),
      0,
      Math.cos(this.pointer.yaw) * -1,
    );
    const right = new THREE.Vector3()
      .crossVectors(forward, new THREE.Vector3(0, 1, 0))
      .normalize();
    this.velocity.set(0, 0, 0);
    if (this.movement.forward) this.velocity.add(forward);
    if (this.movement.backward) this.velocity.sub(forward);
    if (this.movement.left) this.velocity.sub(right);
    if (this.movement.right) this.velocity.add(right);
    if (this.velocity.lengthSq() > 0) this.velocity.normalize().multiplyScalar(moveSpeed * delta);
    this.camera.position.add(this.velocity);
    this.camera.position.x = clamp(this.camera.position.x, -5, 5);
    this.camera.position.z = clamp(this.camera.position.z, -1.5, 4);

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.pointer.yaw + (Math.random() - 0.5) * this.screenShake;
    this.camera.rotation.x = this.pointer.pitch + (Math.random() - 0.5) * this.screenShake;
    this.screenShake = Math.max(0, this.screenShake - delta * 0.16);
  }

  updateWeapon(delta) {
    if (!this.weapon) return;
    const walkIntensity = this.velocity.lengthSq() > 0 ? 1 : 0.35;
    const swayTime = this.actualElapsed * 3;
    const basePosition = new THREE.Vector3(
      this.ads ? 0.0 : 0.52,
      this.ads ? -0.22 : -0.52,
      this.ads ? -0.65 : -1.05,
    );
    const sway = new THREE.Vector3(
      Math.sin(swayTime) * 0.015 * walkIntensity,
      Math.cos(swayTime * 1.4) * 0.012 * walkIntensity,
      0,
    );
    this.recoilKick = Math.max(0, this.recoilKick - delta * 5);
    this.weapon.position.lerp(
      basePosition
        .clone()
        .add(sway)
        .add(new THREE.Vector3(-this.recoilKick * 0.06, this.recoilKick * 0.03, this.recoilKick * 0.1)),
      0.18,
    );
    this.weapon.rotation.x = THREE.MathUtils.lerp(
      this.weapon.rotation.x,
      this.ads ? -0.02 : -0.08,
      0.16,
    );
    this.weapon.rotation.y = THREE.MathUtils.lerp(
      this.weapon.rotation.y,
      this.ads ? 0.0 : 0.0,
      0.16,
    );
    this.weapon.rotation.z = THREE.MathUtils.lerp(
      this.weapon.rotation.z,
      this.ads ? -0.01 : -0.03,
      0.16,
    );
    this.camera.fov = THREE.MathUtils.lerp(
      this.camera.fov,
      this.baseFov - (this.ads ? this.weaponStats.adsFovDelta : 0),
      0.16,
    );
    this.camera.updateProjectionMatrix();
  }

  updateHud() {
    const accuracy = this.stats.shots ? (this.stats.hits / this.stats.shots) * 100 : 100;
    const timerValue = this.scenario.duration > 0 ? Math.max(this.remainingTime, 0) : this.actualElapsed;
    const minutes = Math.floor(timerValue / 60)
      .toString()
      .padStart(2, '0');
    const seconds = Math.floor(timerValue % 60)
      .toString()
      .padStart(2, '0');

    this.scoreDisplay = THREE.MathUtils.lerp(this.scoreDisplay, this.stats.score, 0.18);
    if (this.scenarioEl) {
      this.scenarioEl.textContent = this.scenario.title;
    }
    if (this.metaEl) {
      const meta = [this.i18n.t(`categories.${this.scenario.category}`), this.i18n.t(`weapons.${this.currentWeaponType}`)];
      const activePhase = this.sensitivityFinder?.phases[this.sensitivityFinder.phaseIndex];
      if (activePhase) {
        meta.push(activePhase.label);
      }
      this.metaEl.textContent = meta.join(' • ');
    }
    this.timerEl.textContent = `${minutes}:${seconds}`;
    this.timerEl.classList.toggle(
      'is-low',
      this.scenario.duration > 0 && this.remainingTime <= 5,
    );
    this.scoreEl.textContent = Math.round(this.scoreDisplay).toString();
    this.accuracyEl.textContent = `${this.i18n.t('labels.accuracy')}: ${accuracy.toFixed(1)}%`;
    this.ammoEl.textContent = this.settings.gameplay.infiniteAmmo
      ? '∞'
      : `${this.reloading ? '...' : this.ammo} / ${this.weaponStats.magazineSize}`;
    this.streakEl.textContent = `🔥 x${getStreakMultiplier(this.stats.streak)} STREAK`;
    this.fpsEl.textContent = this.settings.display.showFps ? `FPS: ${Math.round(this.fps)}` : '';

    const dynamicSpread =
      this.settings.crosshair.style === 'dynamic'
        ? this.recoilKick * 10 + this.velocity.length() * 2
        : 0;
    applyCrosshairStyles(this.crosshairEl, this.settings, dynamicSpread);

    if (this.sensitivityFinder && this.finderPhaseEl && this.finderSensEl && this.finderNoteEl) {
      const phase = this.sensitivityFinder.phases[this.sensitivityFinder.phaseIndex];
      if (phase) {
        const phaseElapsed = this.actualElapsed - this.sensitivityFinder.phaseStartedAt;
        const phaseRemaining = Math.max(0, Math.ceil(phase.duration - phaseElapsed));
        this.finderPhaseEl.textContent = `${phase.label} • ${phaseRemaining}s`;
        this.finderSensEl.textContent = `VAL ${phase.valorantSensitivity} • Site ${phase.siteSensitivity}`;
      }

      if (this.sensitivityFinder.finalRecommendation) {
        this.finderNoteEl.textContent = `Recommended ${this.sensitivityFinder.finalRecommendation.recommendedValorantSensitivity} • ${(this.sensitivityFinder.finalRecommendation.confidence * 100).toFixed(0)}% confidence`;
      } else if (this.sensitivityFinder.provisionalRecommendation) {
        this.finderNoteEl.textContent = `Provisional ${this.sensitivityFinder.provisionalRecommendation.recommendedValorantSensitivity} • refining`;
      }
    }
  }

  endSession() {
    if (this.ended) return;
    this.ended = true;
    this.paused = true;
    this.finishSensitivityPhase();

    if (this.sensitivityFinder) {
      this.sensitivityFinder.finalRecommendation = this.getSensitivityRecommendation(
        this.sensitivityFinder.phaseResults,
      );
    }

    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock?.();
    }

    const accuracy = this.stats.shots ? (this.stats.hits / this.stats.shots) * 100 : 100;
    let finalScore = this.stats.score;
    if (accuracy === 100 && this.stats.shots > 0) finalScore += 500;
    if (this.remainingTime > 0) finalScore += Math.round(this.remainingTime * 2);
    this.stats.score = finalScore;
    this.sound.playSessionEnd();

    const bestReaction = this.stats.reactionTimes.length
      ? Math.min(...this.stats.reactionTimes)
      : 0;
    const avgReaction = this.stats.reactionTimes.length
      ? this.stats.reactionTimes.reduce((sum, value) => sum + value, 0) /
        this.stats.reactionTimes.length
      : 0;
    const result = {
      scenarioId: this.scenario.id,
      score: finalScore,
      accuracy,
      hits: this.stats.hits,
      totalTargets: this.stats.hits + this.stats.misses,
      shots: this.stats.shots,
      misses: this.stats.misses,
      headshots: this.stats.headshots,
      headshotRate: this.stats.hits ? (this.stats.headshots / this.stats.hits) * 100 : 0,
      avgReaction,
      bestReaction,
      streakMax: this.stats.streakMax,
      duration: this.actualElapsed,
      date: new Date().toISOString(),
      personalBest: !this.previousBest || finalScore > this.previousBest.score,
      sensitivityRecommendation: this.sensitivityFinder?.finalRecommendation
        ? {
            dpi: this.sensitivityFinder.dpi,
            initialValorantSensitivity: this.sensitivityFinder.initialValorantSensitivity,
            recommendedValorantSensitivity:
              this.sensitivityFinder.finalRecommendation.recommendedValorantSensitivity,
            recommendedSiteSensitivity:
              this.sensitivityFinder.finalRecommendation.recommendedSiteSensitivity,
            rangeMin: this.sensitivityFinder.finalRecommendation.rangeMin,
            rangeMax: this.sensitivityFinder.finalRecommendation.rangeMax,
            confidence: this.sensitivityFinder.finalRecommendation.confidence,
            provisionalValorantSensitivity:
              this.sensitivityFinder.provisionalRecommendation?.recommendedValorantSensitivity ?? null,
            phaseCount: this.sensitivityFinder.phaseResults.length,
            notes: this.sensitivityFinder.finalRecommendation.notes,
            focusLeaders: this.sensitivityFinder.finalRecommendation.focusLeaders,
            topPhases: this.sensitivityFinder.finalRecommendation.topPhases,
          }
        : null,
    };

    window.setTimeout(() => this.callbacks.onEnd?.(result), 450);
  }

  frame = () => {
    if (this.disposed) return;
    requestAnimationFrame(this.frame);
    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (!this.paused && !this.ended) {
      this.actualElapsed += delta;
      if (this.sensitivityFinder) {
        const phase = this.sensitivityFinder.phases[this.sensitivityFinder.phaseIndex];
        if (
          phase &&
          this.actualElapsed - this.sensitivityFinder.phaseStartedAt >= phase.duration
        ) {
          const nextPhaseIndex = this.sensitivityFinder.phaseIndex + 1;
          if (nextPhaseIndex < this.sensitivityFinder.phases.length) {
            this.beginSensitivityPhase(nextPhaseIndex);
          }
        }
      }
      if (this.scenario.duration > 0) {
        this.remainingTime = Math.max(0, this.scenario.duration - this.actualElapsed);
        const rounded = Math.ceil(this.remainingTime);
        if (rounded <= 3 && rounded > 0 && rounded !== this.lastCountdownSecond) {
          this.sound.playCountdown();
          this.lastCountdownSecond = rounded;
        }
        if (this.remainingTime <= 0) {
          this.endSession();
        }
      }

      if (this.weaponStats.automatic && this.firePressed) {
        this.tryShoot();
      }

      if (this.reloading && performance.now() >= this.reloadEndAt) {
        this.reloading = false;
        this.ammo = this.weaponStats.magazineSize;
      }

      this.updateMovement(delta);
      this.activeTargets.forEach((target) =>
        this.updateTargetMotion(target, (performance.now() - target.spawnTime) / 1000, delta),
      );
      this.updateAimRaycast(delta);
      this.updateTargetTelemetry(delta);
      this.updateWeapon(delta);
      this.updateTracers(delta);
      this.particles.update(delta);
      this.updatePopups(delta);
      this.updateHpBars();

      if (!this.scenario.burst && this.canSpawnMore()) {
        if (
          this.activeTargets.length < this.scenario.concurrentTargets &&
          performance.now() - this.lastSpawnAt >= this.scenario.spawnInterval * 1000
        ) {
          this.spawnTarget();
        }
      }
    }

    this.fpsAccumulator += delta;
    this.fpsFrames += 1;
    if (this.fpsAccumulator >= 0.4) {
      this.fps = this.fpsFrames / this.fpsAccumulator;
      this.fpsAccumulator = 0;
      this.fpsFrames = 0;
    }

    this.updateHud();
    this.renderer.render(this.scene, this.camera);
  };

  updateSettings(nextSettings) {
    this.settings = nextSettings;
    this.sound.updateSettings(nextSettings);
    this.baseFov = nextSettings.display.fov;
    this.buildEnvironment(nextSettings.graphics.theme);
    this.handleResize();
  }

  destroy() {
    this.disposed = true;
    this.listeners.forEach((dispose) => dispose());
    this.popupItems.forEach((popup) => popup.element.remove());
    for (const element of this.hpBarItems.values()) {
      element.remove();
    }
    this.hpBarItems.clear();
    this.tracers.forEach((tracer) => {
      this.scene.remove(tracer.line);
      tracer.line.geometry.dispose();
      tracer.material.dispose();
    });
    this.tracers = [];
    this.particles?.dispose();
    this.renderer?.dispose();
    this.mount.innerHTML = '';
  }
}
