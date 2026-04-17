import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from './settings.js';

export const STORAGE_KEYS = {
  settings: 'aimforge.settings',
  profile: 'aimforge.profile',
  leaderboard: 'aimforge.leaderboard',
};

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeDeep(base, incoming) {
  if (!isObject(base) || !isObject(incoming)) {
    return incoming ?? base;
  }

  const merged = { ...base };
  Object.entries(incoming).forEach(([key, value]) => {
    if (isObject(value) && isObject(base[key])) {
      merged[key] = mergeDeep(base[key], value);
      return;
    }

    merged[key] = value;
  });
  return merged;
}

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Failed to read storage key "${key}"`, error);
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to write storage key "${key}"`, error);
  }
}

export function loadSettings() {
  return mergeDeep(DEFAULT_SETTINGS, readJson(STORAGE_KEYS.settings, {}));
}

export function saveSettings(settings) {
  writeJson(STORAGE_KEYS.settings, settings);
}

export function loadProfile() {
  return mergeDeep(DEFAULT_PROFILE, readJson(STORAGE_KEYS.profile, {}));
}

export function saveProfile(profile) {
  writeJson(STORAGE_KEYS.profile, profile);
}

export function loadLeaderboard() {
  return readJson(STORAGE_KEYS.leaderboard, {});
}

export function saveLeaderboard(board) {
  writeJson(STORAGE_KEYS.leaderboard, board);
}

export function getScenarioRuns(board, scenarioId) {
  return board[String(scenarioId)] ?? [];
}

export function getScenarioBest(board, scenarioId) {
  return getScenarioRuns(board, scenarioId)[0] ?? null;
}

export function recordRun(scenarioId, result) {
  const board = loadLeaderboard();
  const key = String(scenarioId);
  const existing = board[key] ?? [];
  const next = [...existing, result]
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.accuracy !== left.accuracy) return right.accuracy - left.accuracy;
      return left.avgReaction - right.avgReaction;
    })
    .slice(0, 10);
  board[key] = next;
  saveLeaderboard(board);
  return next;
}

export function getCompletedScenarioIds(board) {
  return Object.entries(board)
    .filter(([, runs]) => Array.isArray(runs) && runs.length > 0)
    .map(([scenarioId]) => Number(scenarioId));
}

export function getLifetimeStats(board) {
  const runs = Object.values(board).flat();
  const totals = runs.reduce(
    (accumulator, run) => {
      accumulator.sessions += 1;
      accumulator.score += run.score;
      accumulator.shots += run.shots;
      accumulator.hits += run.hits;
      accumulator.headshots += run.headshots;
      accumulator.timeSeconds += run.duration;
      accumulator.bestReaction = Math.min(accumulator.bestReaction, run.bestReaction || Infinity);
      accumulator.streakMax = Math.max(accumulator.streakMax, run.streakMax || 0);
      accumulator.scenarioPlays[run.scenarioId] = (accumulator.scenarioPlays[run.scenarioId] ?? 0) + 1;
      return accumulator;
    },
    {
      sessions: 0,
      score: 0,
      shots: 0,
      hits: 0,
      headshots: 0,
      timeSeconds: 0,
      bestReaction: Infinity,
      streakMax: 0,
      scenarioPlays: {},
    },
  );

  const favoriteScenarioIds = Object.entries(totals.scenarioPlays)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([scenarioId]) => Number(scenarioId));

  return {
    sessions: totals.sessions,
    totalScore: totals.score,
    shots: totals.shots,
    hits: totals.hits,
    headshots: totals.headshots,
    totalHours: totals.timeSeconds / 3600,
    accuracy: totals.shots ? (totals.hits / totals.shots) * 100 : 0,
    headshotRate: totals.hits ? (totals.headshots / totals.hits) * 100 : 0,
    bestReaction: Number.isFinite(totals.bestReaction) ? totals.bestReaction : 0,
    streakMax: totals.streakMax,
    favoriteScenarioIds,
    completedScenarioCount: getCompletedScenarioIds(board).length,
  };
}

export function getAchievements(board) {
  const stats = getLifetimeStats(board);
  const achievements = [];

  if (stats.sessions >= 1) achievements.push('first-blood');
  if (stats.accuracy >= 90) achievements.push('sharpshooter');
  if (stats.bestReaction > 0 && stats.bestReaction < 200) achievements.push('speed-demon');
  if (stats.headshotRate >= 50) achievements.push('headhunter');
  if (stats.streakMax >= 10) achievements.push('streak-king');
  if (stats.completedScenarioCount >= 25) achievements.push('quartermaster');
  if (stats.completedScenarioCount >= 50) achievements.push('halfway-there');
  if (stats.completedScenarioCount >= 100) achievements.push('centurion');
  if (stats.sessions >= 25) achievements.push('grinder');
  if (stats.totalHours >= 5) achievements.push('iron-focus');

  return achievements;
}

export function exportCrosshairCode(crosshair) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(crosshair))));
}

export function importCrosshairCode(code) {
  const normalized = code.trim();
  const json = decodeURIComponent(escape(atob(normalized)));
  return JSON.parse(json);
}

export function makeShareText(result, scenarioName) {
  const recommendation = result.sensitivityRecommendation
    ? `\nRecommended VAL sens: ${result.sensitivityRecommendation.recommendedValorantSensitivity}`
    : '';

  return `AimForge | ${scenarioName}\nScore: ${result.score}\nAccuracy: ${result.accuracy.toFixed(
    1,
  )}%\nHits: ${result.hits}/${result.totalTargets}\nAvg reaction: ${Math.round(result.avgReaction)} ms${recommendation}`;
}

export function resetProgress() {
  window.localStorage.removeItem(STORAGE_KEYS.leaderboard);
}

export function resetAllData() {
  window.localStorage.removeItem(STORAGE_KEYS.leaderboard);
  window.localStorage.removeItem(STORAGE_KEYS.settings);
  window.localStorage.removeItem(STORAGE_KEYS.profile);
}

/* ─── Sensitivity Conversion Utilities ───────────────────────── */

const VALORANT_YAW = 0.07;

export const ASPECT_RATIOS = [
  { label: '16:9', value: '16:9', multiplier: 1.0 },
  { label: '16:10', value: '16:10', multiplier: 1.0 },
  { label: '4:3', value: '4:3', multiplier: 1.0 },
  { label: '21:9', value: '21:9', multiplier: 1.0 },
];

export function valorantToCm360(dpi, valorantSensitivity) {
  return 914.4 / (dpi * valorantSensitivity * VALORANT_YAW);
}

export function cm360ToValorant(dpi, cm360) {
  return 914.4 / (dpi * cm360 * VALORANT_YAW);
}

export function cm360ToSiteSensitivity(cm360) {
  const baseCm360 = 32.66;
  return baseCm360 / cm360;
}

export function siteSensitivityToCm360(siteSensitivity) {
  const baseCm360 = 32.66;
  return baseCm360 / siteSensitivity;
}

export function valorantToSite(dpi, valorantSensitivity) {
  const cm360 = valorantToCm360(dpi, valorantSensitivity);
  return cm360ToSiteSensitivity(cm360);
}

export function siteToValorant(dpi, siteSensitivity) {
  const cm360 = siteSensitivityToCm360(siteSensitivity);
  return cm360ToValorant(dpi, cm360);
}

export function getEdpi(dpi, sensitivity) {
  return dpi * sensitivity;
}

