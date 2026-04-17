import { createI18n } from '../i18n/index.js';
import {
  exportCrosshairCode,
  getAchievements,
  getCompletedScenarioIds,
  getLifetimeStats,
  getScenarioBest,
  importCrosshairCode,
  loadLeaderboard,
  loadProfile,
  loadSettings,
  makeShareText,
  recordRun,
  resetProgress,
  saveProfile,
  saveSettings,
  valorantToCm360,
  siteToValorant,
  ASPECT_RATIOS,
} from '../store/storage.js';
import {
  CROSSHAIR_STYLES,
  DEFAULT_SETTINGS,
  LANGUAGE_OPTIONS,
  THEMES,
  WEAPON_TYPES,
} from '../store/settings.js';
import {
  CATEGORY_ORDER,
  describeScenario,
  getScenarioById,
  getScenarioStars,
  isScenarioLocked,
  SCENARIOS,
} from '../data/scenarios.js';
import { GameEngine } from '../game/GameEngine.js';
import { applyCrosshairStyles, createCrosshairMarkup } from '../game/crosshair.js';

const AVATAR_COLORS = [
  '#ff7a18',
  '#ff4444',
  '#f7c948',
  '#47d7ac',
  '#4b7cff',
  '#af6bff',
  '#f85bb3',
  '#d9e2ec',
];

const GLOBAL_NAMES = ['Nova', 'Kite', 'Volt', 'Juno', 'Mira', 'Hex', 'Rift', 'Sora'];

function setByPath(target, path, value) {
  const keys = path.split('.');
  let pointer = target;
  keys.slice(0, -1).forEach((key) => {
    pointer[key] = { ...pointer[key] };
    pointer = pointer[key];
  });
  pointer[keys[keys.length - 1]] = value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(numeric, min), max);
}

function formatSensitivity(value, digits = 3) {
  return Number(value)
    .toFixed(digits)
    .replace(/\.?0+$/, '');
}

function valorantSensitivityToSite(dpi, valorantSensitivity) {
  const normalizedDpi = clampNumber(dpi, 200, 6400, 800);
  const normalizedSensitivity = clampNumber(valorantSensitivity, 0.05, 5, 0.35);
  return clampNumber((normalizedDpi * normalizedSensitivity) / 200, 0.35, 8, 1.4);
}

function formatMs(value) {
  return value ? `${Math.round(value)} ms` : '--';
}

function formatDate(value) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString();
}

function webglSupported() {
  const canvas = document.createElement('canvas');
  return Boolean(canvas.getContext('webgl') || canvas.getContext('webgl2'));
}

export class App {
  constructor(root) {
    this.root = root;
    this.settings = loadSettings();
    this.profile = loadProfile();
    this.leaderboard = loadLeaderboard();
    this.i18n = createI18n(this.settings.language);
    this.state = {
      screen: 'loading',
      menuIndex: 0,
      selectedScenarioId: 1,
      lobbyWeapon: null,
      lobbyTheme: null,
      results: null,
      leaderboardScenarioId: 1,
      filters: {
        search: '',
        category: 'all',
        difficulty: 'all',
        sort: 'category',
      },
      sensitivityFinder: {
        dpi: 800,
        valorantSensitivity: 0.35,
      },
      rebinding: null,
    };
    this.engine = null;
    this.boundClick = (event) => this.handleClick(event);
    this.boundInput = (event) => this.handleInput(event);
    this.boundChange = (event) => this.handleChange(event);
    this.boundKeydown = (event) => this.handleKeydown(event);
  }

  mount() {
    document.documentElement.lang = this.i18n.language;
    this.root.addEventListener('click', this.boundClick);
    this.root.addEventListener('input', this.boundInput);
    this.root.addEventListener('change', this.boundChange);
    document.addEventListener('keydown', this.boundKeydown);

    this.render();
    window.setTimeout(() => {
      this.profile.firstBootCompleted = true;
      saveProfile(this.profile);
      this.setScreen(webglSupported() ? 'landing' : 'error');
    }, 900);
  }

  setScreen(screen, extras = {}) {
    if (this.engine && screen !== 'game') {
      this.engine.destroy();
      this.engine = null;
    }
    this.state = { ...this.state, ...extras, screen };
    this.render();
  }

  get selectedScenario() {
    return getScenarioById(this.state.selectedScenarioId);
  }

  get lifetimeStats() {
    return getLifetimeStats(this.leaderboard);
  }

  get completedScenarioIds() {
    return getCompletedScenarioIds(this.leaderboard);
  }

  get filteredScenarios() {
    const query = this.state.filters.search.trim().toLowerCase();
    let scenarios = SCENARIOS.filter((scenario) => {
      if (this.state.filters.category !== 'all' && scenario.category !== this.state.filters.category) return false;
      if (this.state.filters.difficulty !== 'all' && scenario.difficulty !== this.state.filters.difficulty) return false;
      if (query && !scenario.title.toLowerCase().includes(query)) return false;
      return true;
    });

    if (this.state.filters.sort === 'difficulty') {
      const rank = { beginner: 0, intermediate: 1, advanced: 2, pro: 3 };
      scenarios = scenarios.sort((left, right) => rank[left.difficulty] - rank[right.difficulty]);
    } else if (this.state.filters.sort === 'best') {
      scenarios = scenarios.sort((left, right) => {
        const bestLeft = getScenarioBest(this.leaderboard, left.id)?.score ?? 0;
        const bestRight = getScenarioBest(this.leaderboard, right.id)?.score ?? 0;
        return bestRight - bestLeft;
      });
    } else if (this.state.filters.sort === 'popularity') {
      scenarios = scenarios.sort((left, right) => right.popularity - left.popularity);
    } else {
      scenarios = scenarios.sort((left, right) => left.id - right.id);
    }

    return scenarios;
  }

  render() {
    const screen = this.state.screen;
    if (screen === 'loading') {
      this.root.innerHTML = `
        <div class="loading-screen">
          <div class="loading-screen__logo">AimForge</div>
          <div class="loading-screen__pulse"></div>
        </div>
      `;
      return;
    }

    if (screen === 'error') {
      this.root.innerHTML = `
        <div class="app-shell">
          <div class="screen-panel screen-panel--center">
            <h1>${this.i18n.t('messages.webglTitle')}</h1>
            <p>${this.i18n.t('messages.webglBody')}</p>
          </div>
        </div>
      `;
      return;
    }

    if (screen === 'game') {
      this.root.innerHTML = `<div class="app-shell app-shell--game"><div id="game-mount"></div></div>`;
      this.launchGame();
      return;
    }

    this.root.innerHTML = `
      <div class="app-shell ${screen === 'landing' ? 'app-shell--landing' : ''}">
        <div class="app-shell__background">
          <div class="bg-grid"></div>
          <div class="bg-glow bg-glow--one"></div>
          <div class="bg-glow bg-glow--two"></div>
        </div>
        <div class="app-shell__content">
          ${this.renderScreen()}
        </div>
      </div>
    `;

    if (screen === 'settings') {
      this.updateCrosshairPreview();
    }
  }

  renderScreen() {
    switch (this.state.screen) {
      case 'landing':
        return this.renderLanding();
      case 'select':
        return this.renderSelect();
      case 'lobby':
        return this.renderLobby();
      case 'results':
        return this.renderResults();
      case 'leaderboard':
        return this.renderLeaderboard();
      case 'settings':
        return this.renderSettings();
      case 'profile':
        return this.renderProfile();
      case 'tutorial':
        return this.renderTutorial();
      default:
        return '';
    }
  }

  renderLanguageSelect() {
    return `
      <label class="language-pill">
        <span>${this.i18n.t('labels.language')}</span>
        <select data-language-switch aria-label="${this.i18n.t('labels.language')}">
          ${LANGUAGE_OPTIONS.map(
            (language) => `
              <option value="${language.code}" ${language.code === this.i18n.language ? 'selected' : ''}>
                ${language.flag} ${language.label}
              </option>
            `,
          ).join('')}
        </select>
      </label>
    `;
  }

  renderLanding() {
    const items = [
      { action: 'goto-select', label: this.i18n.t('nav.play') },
      { action: 'goto-sens-finder', label: 'Sensitivity Finder' },
      { action: 'goto-leaderboard', label: this.i18n.t('nav.leaderboard') },
      { action: 'goto-settings', label: this.i18n.t('nav.settings') },
      { action: 'goto-profile', label: this.i18n.t('nav.profile') },
      { action: 'goto-tutorial', label: this.i18n.t('nav.tutorial') },
    ];

    return `
      <div class="landing-screen">
        <div class="landing-screen__brand">
          <p class="eyebrow">Precision Engine</p>
          <h1>AimForge</h1>
          <p>${this.i18n.t('subtitle')}</p>
        </div>
        <nav class="landing-screen__nav" aria-label="Main navigation">
          ${items
            .map(
              (item, index) => `
                <button class="menu-button ${index === this.state.menuIndex ? 'is-focused' : ''}" data-action="${item.action}" ${item.extra ?? ''}>
                  ${item.label}
                </button>
              `,
            )
            .join('')}
        </nav>
        <div class="landing-screen__footer">
          ${this.renderLanguageSelect()}
          <div class="footer-meta">
            <span>${this.i18n.t('landing.version')} 0.1.0</span>
            <a href="https://github.com/" target="_blank" rel="noreferrer">${this.i18n.t('landing.github')}</a>
            <span>${this.i18n.t('landing.keyboardHints')}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderSelect() {
    return `
      <div class="screen-panel">
        <div class="screen-panel__header">
          <div>
            <p class="eyebrow">${SCENARIOS.length} Scenarios</p>
            <h2>${this.i18n.t('nav.play')}</h2>
          </div>
          <div class="header-actions">
            ${this.renderLanguageSelect()}
            <button class="button" data-action="back-menu">${this.i18n.t('nav.back')}</button>
          </div>
        </div>
        <div class="toolbar">
          <input class="input" type="search" placeholder="${this.i18n.t('filters.search')}" data-filter="search" value="${this.state.filters.search}" />
          <select class="input" data-filter="category">
            <option value="all">${this.i18n.t('filters.allCategories')}</option>
            ${CATEGORY_ORDER.map(
              (category) => `<option value="${category}" ${this.state.filters.category === category ? 'selected' : ''}>${this.i18n.t(`categories.${category}`)}</option>`,
            ).join('')}
          </select>
          <select class="input" data-filter="difficulty">
            <option value="all">${this.i18n.t('filters.allDifficulties')}</option>
            ${['beginner', 'intermediate', 'advanced', 'pro']
              .map(
                (difficulty) => `<option value="${difficulty}" ${this.state.filters.difficulty === difficulty ? 'selected' : ''}>${this.i18n.t(`difficulties.${difficulty}`)}</option>`,
              )
              .join('')}
          </select>
          <select class="input" data-filter="sort">
            <option value="category" ${this.state.filters.sort === 'category' ? 'selected' : ''}>${this.i18n.t('filters.byCategory')}</option>
            <option value="difficulty" ${this.state.filters.sort === 'difficulty' ? 'selected' : ''}>${this.i18n.t('filters.byDifficulty')}</option>
            <option value="best" ${this.state.filters.sort === 'best' ? 'selected' : ''}>${this.i18n.t('filters.byBest')}</option>
            <option value="popularity" ${this.state.filters.sort === 'popularity' ? 'selected' : ''}>${this.i18n.t('filters.byPopularity')}</option>
          </select>
        </div>
        <div class="scenario-grid">
          ${this.filteredScenarios
            .map((scenario) => {
              const best = getScenarioBest(this.leaderboard, scenario.id);
              const locked = isScenarioLocked(scenario.id, this.completedScenarioIds);
              const stars = getScenarioStars(best?.score ?? 0, scenario);
              return `
                <article class="scenario-card ${locked ? 'scenario-card--locked' : ''}" data-action="open-scenario" data-scenario-id="${scenario.id}">
                  <div class="scenario-card__top">
                    <span class="scenario-card__number">#${String(scenario.id).padStart(3, '0')}</span>
                    <span class="badge badge--${scenario.difficulty}">${this.i18n.t(`difficulties.${scenario.difficulty}`)}</span>
                  </div>
                  <h3>${scenario.title}</h3>
                  <p>${this.i18n.t(`categories.${scenario.category}`)}</p>
                  <div class="scenario-card__meta">
                    <span>${this.i18n.t('labels.best')}: ${best?.score ?? 0}</span>
                    <span>${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>
                  </div>
                  ${locked ? `<div class="scenario-card__lock">${this.i18n.t('messages.locked')}</div>` : ''}
                </article>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }

  renderLobby() {
    const scenario = this.selectedScenario;
    const best = getScenarioBest(this.leaderboard, scenario.id);
    const locked = isScenarioLocked(scenario.id, this.completedScenarioIds);
    const weapon = this.state.lobbyWeapon ?? scenario.weapon;
    const theme = this.state.lobbyTheme ?? this.settings.graphics.theme;
    const finderProfile = this.getSensitivityFinderProfile();
    const siteSensitivity = valorantSensitivityToSite(
      finderProfile.dpi,
      finderProfile.valorantSensitivity,
    );

    return `
      <div class="screen-panel">
        <div class="screen-panel__header">
          <div>
            <p class="eyebrow">Scenario Lobby</p>
            <h2>#${String(scenario.id).padStart(3, '0')} ${scenario.title}</h2>
          </div>
          <button class="button" data-action="goto-select">${this.i18n.t('nav.back')}</button>
        </div>
        <div class="lobby-grid">
          <section class="card">
            <p>${describeScenario(scenario, this.i18n.t.bind(this.i18n))}</p>
            <div class="stat-list">
              <div><span>${this.i18n.t('labels.difficulty')}</span><strong>${this.i18n.t(`difficulties.${scenario.difficulty}`)}</strong></div>
              <div><span>${this.i18n.t('labels.duration')}</span><strong>${scenario.duration ? `${scenario.duration}s` : `${scenario.totalTargets} targets`}</strong></div>
              <div><span>${this.i18n.t('labels.targetType')}</span><strong>${this.i18n.t(`targetTypes.${scenario.targetType}`)}</strong></div>
              <div><span>${this.i18n.t('labels.best')}</span><strong>${best?.score ?? 0}</strong></div>
            </div>
            ${
              scenario.sensitivityFinder
                ? `
                  <div class="finder-summary">
                    <div><span>Mode</span><strong>10-minute adaptive test</strong></div>
                    <div><span>Provisional pick</span><strong>After ~3 minutes</strong></div>
                    <div><span>Focus</span><strong>Flicks, tracking, bot clears</strong></div>
                  </div>
                `
                : ''
            }
          </section>
          <section class="card">
            ${
              scenario.sensitivityFinder
                ? `
                  <div class="finder-config">
                    <label class="field">
                      <span>DPI</span>
                      <input class="input" type="number" min="200" max="6400" step="50" data-sensfinder="dpi" value="${finderProfile.dpi}" />
                    </label>
                    <label class="field">
                      <span>Valorant Sensitivity</span>
                      <input class="input" type="number" min="0.05" max="5" step="0.001" data-sensfinder="valorantSensitivity" value="${finderProfile.valorantSensitivity}" />
                    </label>
                    <div class="fake-board fake-board--finder">
                      <p>Estimated site sensitivity</p>
                      <strong>${formatSensitivity(siteSensitivity, 2)}</strong>
                    </div>
                    <p class="helper-text">DPI stays fixed. The test changes only Valorant sensitivity candidates and recommends the strongest one for your mouse control.</p>
                  </div>
                `
                : `
                  <label class="field">
                    <span>${this.i18n.t('labels.weapon')}</span>
                    <select class="input" data-lobby="weapon">
                      ${WEAPON_TYPES.map((item) => `<option value="${item}" ${weapon === item ? 'selected' : ''}>${this.i18n.t(`weapons.${item}`)}</option>`).join('')}
                    </select>
                  </label>
                `
            }
            <label class="field">
              <span>${this.i18n.t('labels.theme')}</span>
              <select class="input" data-lobby="theme">
                ${THEMES.map((item) => `<option value="${item}" ${theme === item ? 'selected' : ''}>${this.i18n.t(`themes.${item}`)}</option>`).join('')}
              </select>
            </label>
            <div class="fake-board">
              <p>${this.i18n.t('labels.globalBest')}</p>
              <strong>Nova • ${Math.max(4200, (best?.score ?? 3000) + 1400)}</strong>
            </div>
            <div class="button-row">
              <button class="button button--primary" data-action="launch-game" ${locked ? 'disabled' : ''}>${this.i18n.t('nav.start')}</button>
              <button class="button" data-action="goto-leaderboard" data-scenario-id="${scenario.id}">${this.i18n.t('nav.leaderboard')}</button>
            </div>
            ${locked ? `<p class="helper-text">${this.i18n.t('messages.unlockHint')}</p>` : ''}
          </section>
        </div>
      </div>
    `;
  }

  renderResults() {
    const result = this.state.results;
    const scenario = getScenarioById(result.scenarioId);
    const sensitivityRecommendation = result.sensitivityRecommendation;
    return `
      <div class="screen-panel">
        <div class="screen-panel__header">
          <div>
            <p class="eyebrow">${this.i18n.t('results.title')}</p>
            <h2>${scenario.title}</h2>
          </div>
          <button class="button" data-action="back-menu">${this.i18n.t('settings.backToMenu')}</button>
        </div>
        <div class="results-hero">
          <div>
            <h3>${result.score}</h3>
            <p>${this.i18n.t('labels.score')}</p>
          </div>
          ${result.personalBest ? `<span class="pill pill--accent">${this.i18n.t('results.newBest')}</span>` : ''}
        </div>
        <div class="results-grid">
          <div class="card"><span>${this.i18n.t('labels.accuracy')}</span><strong>${result.accuracy.toFixed(1)}%</strong></div>
          <div class="card"><span>${this.i18n.t('labels.hits')}</span><strong>${result.hits}</strong></div>
          <div class="card"><span>${this.i18n.t('labels.misses')}</span><strong>${result.misses}</strong></div>
          <div class="card"><span>${this.i18n.t('labels.headshots')}</span><strong>${result.headshots}</strong></div>
          <div class="card"><span>${this.i18n.t('labels.avgReaction')}</span><strong>${formatMs(result.avgReaction)}</strong></div>
          <div class="card"><span>${this.i18n.t('labels.bestReaction')}</span><strong>${formatMs(result.bestReaction)}</strong></div>
          <div class="card"><span>${this.i18n.t('labels.streakMax')}</span><strong>${result.streakMax}</strong></div>
          <div class="card"><span>${this.i18n.t('labels.headshotRate')}</span><strong>${result.headshotRate.toFixed(1)}%</strong></div>
        </div>
        ${
          sensitivityRecommendation
            ? `
              <div class="lobby-grid">
                <section class="card finder-results">
                  <h3>Recommended Valorant Sensitivity</h3>
                  <div class="finder-results__hero">
                    <strong>${formatSensitivity(sensitivityRecommendation.recommendedValorantSensitivity)}</strong>
                    <span>DPI ${sensitivityRecommendation.dpi} • site sens ${formatSensitivity(sensitivityRecommendation.recommendedSiteSensitivity, 2)}</span>
                  </div>
                  <p>Started from ${formatSensitivity(sensitivityRecommendation.initialValorantSensitivity)} and tested ${sensitivityRecommendation.phaseCount} adaptive blocks across flicking, tracking, and bot tasks.</p>
                  <div class="finder-summary">
                    <div><span>Confidence</span><strong>${Math.round(sensitivityRecommendation.confidence * 100)}%</strong></div>
                    <div><span>Recommended range</span><strong>${formatSensitivity(sensitivityRecommendation.rangeMin)} - ${formatSensitivity(sensitivityRecommendation.rangeMax)}</strong></div>
                    <div><span>Final pick</span><strong>${formatSensitivity(sensitivityRecommendation.recommendedValorantSensitivity)}</strong></div>
                  </div>
                  ${
                    sensitivityRecommendation.provisionalValorantSensitivity
                      ? `<p class="helper-text">Provisional pick after ~3 minutes: ${formatSensitivity(sensitivityRecommendation.provisionalValorantSensitivity)}.</p>`
                      : ''
                  }
                  ${
                    sensitivityRecommendation.notes?.length
                      ? `<ul class="list">${sensitivityRecommendation.notes.map((note) => `<li>${note}</li>`).join('')}</ul>`
                      : ''
                  }
                </section>
                <section class="card">
                  <h3>Best test blocks</h3>
                  <div class="table finder-table">
                    <div class="table__row table__row--head"><span>Task</span><span>Valorant sens</span><span>Score</span><span>Accuracy</span></div>
                    ${sensitivityRecommendation.topPhases
                      .map(
                        (phase) => `<div class="table__row"><span>${phase.label}</span><span>${formatSensitivity(phase.valorantSensitivity)}</span><span>${phase.score}</span><span>${phase.accuracy.toFixed(1)}%</span></div>`,
                      )
                      .join('')}
                  </div>
                  <h3>Best by aim family</h3>
                  <div class="table finder-table">
                    <div class="table__row table__row--head"><span>Focus</span><span>Task</span><span>Valorant sens</span><span>Score</span></div>
                    ${sensitivityRecommendation.focusLeaders
                      .map(
                        (phase) => `<div class="table__row"><span>${phase.focus}</span><span>${phase.label}</span><span>${formatSensitivity(phase.valorantSensitivity)}</span><span>${phase.score}</span></div>`,
                      )
                      .join('')}
                  </div>
                </section>
              </div>
            `
            : ''
        }
        <div class="button-row">
          <button class="button button--primary" data-action="play-again">${this.i18n.t('nav.playAgain')}</button>
          <button class="button" data-action="next-level">Next Level ▸</button>
          <button class="button" data-action="goto-select">Level List</button>
          <button class="button" data-action="share-score">${this.i18n.t('nav.share')}</button>
        </div>
        ${
          result.sensitivityRecommendation
            ? `
              <div class="card" style="margin-top:1rem">
                <h3>Sensitivity Converter</h3>
                <div class="stat-list">
                  <div><span>Recommended Valorant Sens</span><strong>${formatSensitivity(result.sensitivityRecommendation.recommendedValorantSensitivity)}</strong></div>
                  <div><span>cm/360</span><strong>${valorantToCm360(result.sensitivityRecommendation.dpi, result.sensitivityRecommendation.recommendedValorantSensitivity).toFixed(2)} cm</strong></div>
                  <div><span>eDPI</span><strong>${Math.round(result.sensitivityRecommendation.dpi * result.sensitivityRecommendation.recommendedValorantSensitivity)}</strong></div>
                  <div><span>DPI</span><strong>${result.sensitivityRecommendation.dpi}</strong></div>
                </div>
                <p class="helper-text">Copy the Valorant sensitivity above and paste it into your game settings.</p>
              </div>
            `
            : ''
        }
      </div>
    `;
  }

  renderLeaderboard() {
    const scenarioId = this.state.leaderboardScenarioId;
    const scenario = getScenarioById(scenarioId);
    const runs = this.leaderboard[String(scenarioId)] ?? [];
    const globalBoard = GLOBAL_NAMES.map((name, index) => ({
      name,
      score: 5200 - index * 220 + scenarioId * 12,
      accuracy: 95 - index,
    }));

    return `
      <div class="screen-panel">
        <div class="screen-panel__header">
          <div>
            <p class="eyebrow">${this.i18n.t('leaderboard.title')}</p>
            <h2>${scenario.title}</h2>
          </div>
          <div class="header-actions">
            <select class="input" data-leaderboard-scenario>
              ${SCENARIOS.map((item) => `<option value="${item.id}" ${item.id === scenarioId ? 'selected' : ''}>#${String(item.id).padStart(3, '0')} ${item.title}</option>`).join('')}
            </select>
            <button class="button" data-action="back-menu">${this.i18n.t('nav.back')}</button>
          </div>
        </div>
        <div class="lobby-grid">
          <section class="card">
            <h3>${this.i18n.t('leaderboard.local')}</h3>
            <div class="table">
              <div class="table__row table__row--head"><span>${this.i18n.t('labels.rank')}</span><span>${this.i18n.t('labels.date')}</span><span>${this.i18n.t('labels.score')}</span><span>${this.i18n.t('labels.accuracy')}</span><span>${this.i18n.t('labels.avgReaction')}</span></div>
              ${runs.length
                ? runs
                    .map(
                      (run, index) => `<div class="table__row"><span>${index + 1}</span><span>${formatDate(run.date)}</span><span>${run.score}</span><span>${run.accuracy.toFixed(1)}%</span><span>${formatMs(run.avgReaction)}</span></div>`,
                    )
                    .join('')
                : `<p class="helper-text">${this.i18n.t('results.noScores')}</p>`}
            </div>
          </section>
          <section class="card">
            <h3>${this.i18n.t('leaderboard.global')}</h3>
            <div class="table">
              <div class="table__row table__row--head"><span>${this.i18n.t('labels.rank')}</span><span>${this.i18n.t('labels.username')}</span><span>${this.i18n.t('labels.score')}</span><span>${this.i18n.t('labels.accuracy')}</span></div>
              ${globalBoard.map((entry, index) => `<div class="table__row"><span>${index + 1}</span><span>${entry.name}</span><span>${entry.score}</span><span>${entry.accuracy}%</span></div>`).join('')}
            </div>
          </section>
        </div>
      </div>
    `;
  }

  renderSettings() {
    const { input, display, crosshair, audio, graphics, keybinds } = this.settings;
    return `
      <div class="screen-panel">
        <div class="screen-panel__header">
          <div>
            <p class="eyebrow">Tuning</p>
            <h2>${this.i18n.t('settings.title')}</h2>
          </div>
          <div class="header-actions">
            ${this.renderLanguageSelect()}
            <button class="button" data-action="back-menu">${this.i18n.t('nav.back')}</button>
          </div>
        </div>
        <div class="settings-grid">
          <section class="card">
            <h3>${this.i18n.t('settings.mouseInput')}</h3>
            ${this.renderRange('input.sensitivity', this.i18n.t('settings.sensitivity'), input.sensitivity, 0.1, 10, 0.1)}
            ${this.renderRange('input.adsMultiplier', this.i18n.t('settings.adsMultiplier'), input.adsMultiplier, 0.5, 2, 0.1)}
            ${this.renderToggle('input.smoothing', this.i18n.t('settings.smoothing'), input.smoothing)}
            ${this.renderToggle('input.rawInput', this.i18n.t('settings.rawInput'), input.rawInput)}
          </section>
          <section class="card">
            <h3>${this.i18n.t('settings.display')}</h3>
            ${this.renderRange('display.fov', this.i18n.t('settings.fov'), display.fov, 60, 120, 1)}
            ${this.renderSelectControl('display.resolutionScale', this.i18n.t('settings.resolutionScale'), display.resolutionScale, [['0.5', '50%'], ['0.75', '75%'], ['1', '100%']])}
            ${this.renderSelectControl('display.fpsCap', this.i18n.t('settings.fpsCap'), display.fpsCap, [['60', '60'], ['120', '120'], ['144', '144'], ['0', this.i18n.t('options.unlimited')]])}
            ${this.renderToggle('display.showFps', this.i18n.t('settings.showFps'), display.showFps)}
          </section>
          <section class="card">
            <h3>${this.i18n.t('settings.crosshair')}</h3>
            ${this.renderSelectControl('crosshair.style', this.i18n.t('settings.crosshairStyle'), crosshair.style, CROSSHAIR_STYLES.map((item) => [item, this.i18n.t(`options.${item}`)]))}
            ${this.renderColor('crosshair.color', this.i18n.t('settings.crosshairColor'), crosshair.color)}
            ${this.renderRange('crosshair.thickness', this.i18n.t('settings.crosshairThickness'), crosshair.thickness, 1, 5, 1)}
            ${this.renderRange('crosshair.size', this.i18n.t('settings.crosshairSize'), crosshair.size, 4, 32, 1)}
            ${this.renderRange('crosshair.gap', this.i18n.t('settings.crosshairGap'), crosshair.gap, 0, 20, 1)}
            ${this.renderRange('crosshair.opacity', this.i18n.t('settings.crosshairOpacity'), crosshair.opacity, 0, 100, 1)}
            ${this.renderToggle('crosshair.outline', this.i18n.t('settings.crosshairOutline'), crosshair.outline)}
            ${this.renderColor('crosshair.outlineColor', this.i18n.t('settings.crosshairOutlineColor'), crosshair.outlineColor)}
            <div class="crosshair-preview">
              <div class="crosshair-preview__box">
                <div class="crosshair preview-crosshair">${createCrosshairMarkup()}</div>
              </div>
              <div class="button-row">
                <button class="button" data-action="export-crosshair">${this.i18n.t('settings.exportCode')}</button>
                <button class="button" data-action="import-crosshair">${this.i18n.t('settings.importCode')}</button>
              </div>
            </div>
          </section>
          <section class="card">
            <h3>${this.i18n.t('settings.gameplay')}</h3>
            ${this.renderToggle('gameplay.infiniteAmmo', this.i18n.t('settings.infiniteAmmo'), this.settings.gameplay.infiniteAmmo)}
            ${this.renderRange('gameplay.screenShake', this.i18n.t('settings.screenShake'), this.settings.gameplay.screenShake, 0, 2, 0.1)}
          </section>
          <section class="card">
            <h3>${this.i18n.t('settings.audio')}</h3>
            ${this.renderRange('audio.masterVolume', this.i18n.t('settings.masterVolume'), audio.masterVolume, 0, 100, 1)}
            ${this.renderRange('audio.hitVolume', this.i18n.t('settings.hitVolume'), audio.hitVolume, 0, 100, 1)}
            ${this.renderRange('audio.missVolume', this.i18n.t('settings.missVolume'), audio.missVolume, 0, 100, 1)}
            ${this.renderToggle('audio.ambient', this.i18n.t('settings.ambient'), audio.ambient)}
            ${this.renderToggle('audio.uiSounds', this.i18n.t('settings.uiSounds'), audio.uiSounds)}
          </section>
          <section class="card">
            <h3>${this.i18n.t('settings.graphics')}</h3>
            ${this.renderSelectControl('graphics.targetQuality', this.i18n.t('settings.targetQuality'), graphics.targetQuality, [['low', this.i18n.t('options.low')], ['medium', this.i18n.t('options.medium')], ['high', this.i18n.t('options.high')]])}
            ${this.renderToggle('graphics.shadows', this.i18n.t('settings.shadows'), graphics.shadows)}
            ${this.renderToggle('graphics.antialias', this.i18n.t('settings.antialias'), graphics.antialias)}
            ${this.renderSelectControl('graphics.theme', this.i18n.t('settings.backgroundTheme'), graphics.theme, THEMES.map((item) => [item, this.i18n.t(`themes.${item}`)]))}
          </section>
          <section class="card">
            <h3>${this.i18n.t('settings.keybinds')}</h3>
            ${Object.entries(keybinds)
              .map(
                ([key, value]) => `
                  <div class="setting-row">
                    <span>${this.i18n.t(`settings.${key}`)}</span>
                    <button class="button" data-action="rebind" data-keybind="${key}">
                      ${this.state.rebinding === key ? '...' : value}
                    </button>
                  </div>
                `,
              )
              .join('')}
            <div class="button-row">
              <button class="button" data-action="restore-defaults">${this.i18n.t('settings.restoreDefaults')}</button>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  renderProfile() {
    const stats = this.lifetimeStats;
    const achievements = getAchievements(this.leaderboard);
    return `
      <div class="screen-panel">
        <div class="screen-panel__header">
          <div>
            <p class="eyebrow">${this.i18n.t('profile.title')}</p>
            <h2>${this.profile.username}</h2>
          </div>
          <button class="button" data-action="back-menu">${this.i18n.t('nav.back')}</button>
        </div>
        <div class="lobby-grid">
          <section class="card">
            <label class="field">
              <span>${this.i18n.t('labels.username')}</span>
              <input class="input" type="text" value="${this.profile.username}" data-profile="username" maxlength="16" />
            </label>
            <div class="avatar-row">
              ${AVATAR_COLORS.map((color) => `<button class="avatar-dot ${this.profile.avatarColor === color ? 'is-selected' : ''}" style="--avatar:${color}" data-action="avatar-color" data-color="${color}" aria-label="${color}"></button>`).join('')}
            </div>
          </section>
          <section class="card">
            <div class="stat-list">
              <div><span>${this.i18n.t('labels.sessions')}</span><strong>${stats.sessions}</strong></div>
              <div><span>${this.i18n.t('labels.shots')}</span><strong>${stats.shots}</strong></div>
              <div><span>${this.i18n.t('labels.totalHits')}</span><strong>${stats.hits}</strong></div>
              <div><span>${this.i18n.t('labels.lifetimeAccuracy')}</span><strong>${stats.accuracy.toFixed(1)}%</strong></div>
              <div><span>${this.i18n.t('labels.totalHours')}</span><strong>${stats.totalHours.toFixed(1)}</strong></div>
            </div>
          </section>
        </div>
        <div class="lobby-grid">
          <section class="card">
            <h3>${this.i18n.t('labels.favorites')}</h3>
            ${stats.favoriteScenarioIds.length ? `<ul class="list">${stats.favoriteScenarioIds.map((scenarioId) => `<li>#${String(scenarioId).padStart(3, '0')} ${getScenarioById(scenarioId)?.title ?? 'Unknown'}</li>`).join('')}</ul>` : `<p class="helper-text">No favorites yet.</p>`}
          </section>
          <section class="card">
            <h3>${this.i18n.t('labels.achievements')}</h3>
            <ul class="list">
              ${achievements.length ? achievements.map((achievement) => `<li>${this.i18n.t(`achievements.${achievement}`)}</li>`).join('') : '<li>First session unlocks your first badge.</li>'}
            </ul>
          </section>
        </div>
        <div class="lobby-grid">
          <section class="card">
            <h3>Danger Zone</h3>
            <p class="helper-text">Reset your progress or all data. This cannot be undone.</p>
            <div class="button-row" style="margin-top:0.5rem">
              <button class="button button--danger" data-action="reset-progress">Reset All Scores</button>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  renderTutorial() {
    const steps = this.i18n.getDictionary().tutorial.steps;
    return `
      <div class="screen-panel">
        <div class="screen-panel__header">
          <div>
            <p class="eyebrow">Animated Walkthrough</p>
            <h2>${this.i18n.t('tutorial.title')}</h2>
          </div>
          <div class="header-actions">
            <button class="button button--primary" data-action="goto-select">${this.i18n.t('nav.play')}</button>
            <button class="button" data-action="back-menu">${this.i18n.t('tutorial.skip')}</button>
          </div>
        </div>
        <div class="tutorial-steps">
          ${steps.map((step, index) => `<div class="tutorial-step"><span>${index + 1}</span><p>${step}</p></div>`).join('')}
        </div>
      </div>
    `;
  }

  /* ─── Helper render controls ─────────────────────────────────── */

  renderRange(path, label, value, min, max, step) {
    return `
      <div class="setting-row">
        <label>${label}</label>
        <div class="range-group">
          <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-setting="${path}" aria-label="${label}" />
          <span class="range-value">${value}</span>
        </div>
      </div>
    `;
  }

  renderToggle(path, label, checked) {
    return `
      <div class="setting-row">
        <label>${label}</label>
        <label class="toggle" aria-label="${label}">
          <input type="checkbox" ${checked ? 'checked' : ''} data-setting="${path}" />
          <span class="toggle__track"><span class="toggle__thumb"></span></span>
        </label>
      </div>
    `;
  }

  renderSelectControl(path, label, value, options) {
    return `
      <div class="setting-row">
        <label>${label}</label>
        <select class="input" data-setting="${path}" aria-label="${label}">
          ${options.map(([val, text]) => `<option value="${val}" ${String(value) === String(val) ? 'selected' : ''}>${text}</option>`).join('')}
        </select>
      </div>
    `;
  }

  renderColor(path, label, value) {
    return `
      <div class="setting-row">
        <label>${label}</label>
        <input type="color" value="${value}" data-setting="${path}" aria-label="${label}" class="color-input" />
      </div>
    `;
  }

  /* ─── Crosshair preview keep-alive ──────────────────────────── */

  updateCrosshairPreview() {
    const previewElement = this.root.querySelector('.preview-crosshair');
    if (previewElement) {
      applyCrosshairStyles(previewElement, this.settings);
    }
  }

  /* ─── Game launch + result handling ─────────────────────────── */

  launchGame() {
    const mountPoint = this.root.querySelector('#game-mount');
    if (!mountPoint) return;

    const scenario = this.selectedScenario;
    const weapon = this.state.lobbyWeapon ?? scenario.weapon;
    const theme = this.state.lobbyTheme ?? this.settings.graphics.theme;

    const effectiveSettings = clone(this.settings);
    effectiveSettings.graphics.theme = theme;
    effectiveSettings.gameplay = effectiveSettings.gameplay ?? {};
    effectiveSettings.gameplay.weapon = weapon;
    let sensitivityProfile = null;

    if (scenario.sensitivityFinder) {
      sensitivityProfile = this.getSensitivityFinderProfile();
      effectiveSettings.input.sensitivity = valorantSensitivityToSite(
        sensitivityProfile.dpi,
        sensitivityProfile.valorantSensitivity,
      );
    }

    const previousBest = getScenarioBest(this.leaderboard, scenario.id);

    const scenarioCopy = { ...scenario, weapon, sensitivityProfile };

    this.engine = new GameEngine({
      mount: mountPoint,
      scenario: scenarioCopy,
      settings: effectiveSettings,
      i18n: this.i18n,
      previousBest,
      onEnd: (result) => this.handleGameEnd(result),
      onRestart: () => this.handleGameRestart(),
      onExit: () => this.setScreen('select'),
    });

    this.engine.mountGame();
  }

  handleGameEnd(result) {
    const updated = recordRun(result.scenarioId, result);
    this.leaderboard = { ...this.leaderboard, [String(result.scenarioId)]: updated };
    this.setScreen('results', { results: result });
  }

  handleGameRestart() {
    this.setScreen('game');
  }

  /* ─── Settings persistence ──────────────────────────────────── */

  applySetting(path, rawValue) {
    const numericPaths = [
      'input.sensitivity', 'input.adsMultiplier',
      'display.fov', 'display.resolutionScale', 'display.fpsCap',
      'crosshair.thickness', 'crosshair.size', 'crosshair.gap', 'crosshair.opacity',
      'audio.masterVolume', 'audio.hitVolume', 'audio.missVolume',
    ];
    const booleanPaths = [
      'input.smoothing', 'input.rawInput',
      'display.showFps',
      'crosshair.outline',
      'audio.ambient', 'audio.uiSounds',
      'graphics.shadows', 'graphics.antialias',
    ];

    let value = rawValue;
    if (numericPaths.includes(path)) {
      value = Number(rawValue);
    } else if (booleanPaths.includes(path)) {
      value = rawValue === true || rawValue === 'on' || rawValue === 'true';
    }

    const next = clone(this.settings);
    setByPath(next, path, value);
    this.settings = next;
    saveSettings(this.settings);
  }

  /* ─── Global event handlers ─────────────────────────────────── */

  handleClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;

    switch (action) {
      case 'goto-select':
        this.setScreen('select');
        break;
      case 'goto-leaderboard':
        this.setScreen('leaderboard', {
          leaderboardScenarioId: Number(target.dataset.scenarioId) || 1,
        });
        break;
      case 'goto-settings':
        this.setScreen('settings');
        break;
      case 'goto-profile':
        this.setScreen('profile');
        break;
      case 'goto-tutorial':
        this.setScreen('tutorial');
        break;
      case 'back-menu':
        this.setScreen('landing');
        break;
      case 'goto-sens-finder':
        this.setScreen('lobby', {
          selectedScenarioId: 101,
          lobbyWeapon: null,
          lobbyTheme: null,
        });
        break;
      case 'open-scenario': {
        const scenarioId = Number(target.dataset.scenarioId);
        const locked = isScenarioLocked(scenarioId, this.completedScenarioIds);
        console.log('[DEBUG] open-scenario clicked. ID:', scenarioId, 'Locked:', locked, 'Scenario:', getScenarioById(scenarioId));
        if (!locked) {
          this.setScreen('lobby', {
            selectedScenarioId: scenarioId,
            lobbyWeapon: null,
            lobbyTheme: null,
          });
        }
        break;
      }
      case 'launch-game':
        this.setScreen('game');
        break;
      case 'play-again':
        this.setScreen('game');
        break;
      case 'share-score': {
        if (!this.state.results) break;
        const scenario = getScenarioById(this.state.results.scenarioId);
        const text = makeShareText(this.state.results, scenario?.title ?? 'Unknown');
        navigator.clipboard.writeText(text).then(
          () => this.showToast(this.i18n.t('messages.clipboardScore')),
          () => {},
        );
        break;
      }
      case 'export-crosshair': {
        const code = exportCrosshairCode(this.settings.crosshair);
        navigator.clipboard.writeText(code).then(
          () => this.showToast(this.i18n.t('messages.clipboardCrosshair')),
          () => {},
        );
        break;
      }
      case 'import-crosshair': {
        const input = window.prompt('Paste crosshair code:');
        if (!input) break;
        try {
          const crosshair = importCrosshairCode(input);
          const next = clone(this.settings);
          next.crosshair = { ...next.crosshair, ...crosshair };
          this.settings = next;
          saveSettings(this.settings);
          this.render();
        } catch {
          this.showToast(this.i18n.t('messages.invalidCrosshair'));
        }
        break;
      }
      case 'restore-defaults': {
        this.settings = clone(DEFAULT_SETTINGS);
        this.settings.language = this.i18n.language;
        saveSettings(this.settings);
        this.render();
        break;
      }
      case 'rebind': {
        const key = target.dataset.keybind;
        this.state.rebinding = key;
        this.render();
        break;
      }
      case 'avatar-color': {
        const color = target.dataset.color;
        this.profile.avatarColor = color;
        saveProfile(this.profile);
        this.render();
        break;
      }
      case 'next-level': {
        if (!this.state.results) break;
        const currentId = this.state.results.scenarioId;
        const nextScenario = SCENARIOS.find((s) => s.id > currentId);
        if (nextScenario) {
          this.setScreen('lobby', {
            selectedScenarioId: nextScenario.id,
            lobbyWeapon: null,
            lobbyTheme: null,
          });
        } else {
          this.setScreen('select');
        }
        break;
      }
      case 'reset-progress': {
        if (window.confirm('Reset ALL progress? This will clear all scores and leaderboard data. This cannot be undone.')) {
          resetProgress();
          this.leaderboard = {};
          this.render();
          this.showToast('Progress reset successfully.');
        }
        break;
      }
      case 'unlock-all': {
        break;
      }
      default:
        break;
    }
  }

  handleInput(event) {
    const settingPath = event.target.dataset.setting;
    const filterKey = event.target.dataset.filter;
    const sensitivityKey = event.target.dataset.sensfinder;

    if (settingPath) {
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
      this.applySetting(settingPath, value);

      // live-update the range value label sitting beside the slider
      const rangeValueSpan = event.target.parentElement?.querySelector('.range-value');
      if (rangeValueSpan) {
        rangeValueSpan.textContent = event.target.value;
      }

      if (settingPath.startsWith('crosshair')) {
        this.updateCrosshairPreview();
      }
    }

    if (filterKey) {
      this.state.filters = { ...this.state.filters, [filterKey]: event.target.value };
      this.render();
    }

    if (sensitivityKey) {
      const nextProfile = {
        ...this.state.sensitivityFinder,
        [sensitivityKey]:
          sensitivityKey === 'dpi'
            ? clampNumber(event.target.value, 200, 6400, 800)
            : clampNumber(event.target.value, 0.05, 5, 0.35),
      };
      this.state.sensitivityFinder = nextProfile;
      this.render();
    }
  }

  handleChange(event) {
    // language switcher
    if (event.target.dataset.languageSwitch !== undefined) {
      const language = event.target.value;
      this.i18n.setLanguage(language);
      const next = clone(this.settings);
      next.language = language;
      this.settings = next;
      saveSettings(this.settings);
      document.documentElement.lang = language;
      this.render();
      return;
    }

    // lobby selectors
    const lobbyKey = event.target.dataset.lobby;
    if (lobbyKey === 'weapon') {
      this.state.lobbyWeapon = event.target.value;
    }
    if (lobbyKey === 'theme') {
      this.state.lobbyTheme = event.target.value;
    }
    if (lobbyKey) {
      this.render();
    }

    // leaderboard scenario picker
    if (event.target.dataset.leaderboardScenario !== undefined) {
      this.state.leaderboardScenarioId = Number(event.target.value);
      this.render();
      return;
    }

    // settings: selects fire change rather than input
    const settingPath = event.target.dataset.setting;
    if (settingPath && event.target.tagName === 'SELECT') {
      this.applySetting(settingPath, event.target.value);
    }

    // filter dropdowns
    const filterKey = event.target.dataset.filter;
    if (filterKey) {
      this.state.filters = { ...this.state.filters, [filterKey]: event.target.value };
      this.render();
    }

    // profile username
    if (event.target.dataset.profile === 'username') {
      this.profile.username = event.target.value.trim().slice(0, 16) || 'Rookie';
      saveProfile(this.profile);
    }
  }

  handleKeydown(event) {
    // keybind rebinding mode
    if (this.state.rebinding) {
      event.preventDefault();
      const next = clone(this.settings);
      next.keybinds[this.state.rebinding] = event.code;
      this.settings = next;
      saveSettings(this.settings);
      this.state.rebinding = null;
      this.render();
      return;
    }

    // main-menu keyboard nav
    if (this.state.screen === 'landing') {
      const menuActions = ['goto-select', 'goto-leaderboard', 'goto-settings', 'goto-profile', 'goto-tutorial'];
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        this.state.menuIndex = (this.state.menuIndex + 1) % menuActions.length;
        this.render();
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        this.state.menuIndex = (this.state.menuIndex - 1 + menuActions.length) % menuActions.length;
        this.render();
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        this.handleClick({
          target: { closest: () => ({ dataset: { action: menuActions[this.state.menuIndex] } }) },
        });
      }
    }

    // escape → back to landing from any screen (except game — game engine handles escape)
    if (event.key === 'Escape' && this.state.screen !== 'game' && this.state.screen !== 'landing') {
      this.setScreen('landing');
    }
  }

  /* ─── Toast notification ────────────────────────────────────── */

  showToast(message) {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.append(toastContainer);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.append(toast);
    requestAnimationFrame(() => toast.classList.add('toast--visible'));
    window.setTimeout(() => {
      toast.classList.remove('toast--visible');
      window.setTimeout(() => toast.remove(), 300);
    }, 2200);
  }

  getSensitivityFinderProfile() {
    return {
      dpi: clampNumber(this.state.sensitivityFinder?.dpi, 200, 6400, 800),
      valorantSensitivity: clampNumber(
        this.state.sensitivityFinder?.valorantSensitivity,
        0.05,
        5,
        0.35,
      ),
    };
  }
};
