export const DEFAULT_SETTINGS = {
  language: 'en',
  input: {
    sensitivity: 2,
    adsMultiplier: 0.8,
    smoothing: false,
    rawInput: true,
  },
  display: {
    fov: 90,
    resolutionScale: 1,
    fpsCap: 120,
    showFps: true,
    aspectRatio: '16:9',
  },
  crosshair: {
    style: 'cross',
    color: '#ffd54f',
    thickness: 2,
    size: 14,
    gap: 6,
    opacity: 100,
    outline: true,
    outlineColor: '#000000',
  },
  audio: {
    masterVolume: 80,
    hitVolume: 80,
    missVolume: 40,
    ambient: true,
    uiSounds: true,
  },
  graphics: {
    targetQuality: 'high',
    shadows: true,
    antialias: true,
    theme: 'dark-room',
  },
  keybinds: {
    shoot: 'Mouse0',
    pause: 'Escape',
    restart: 'KeyR',
    backToMenu: 'KeyM',
  },
  gameplay: {
    weapon: 'pistol',
    screenShake: 0.6,
    infiniteAmmo: false,
  },
  sensitivityProfile: {
    dpi: 800,
    valorantSensitivity: 0.35,
    aspectRatio: '16:9',
  },
};

export const DEFAULT_PROFILE = {
  username: 'Rookie',
  avatarColor: '#ff7a18',
  favoriteScenarioIds: [],
  firstBootCompleted: false,
};

export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'zh-CN', label: '中文简体', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
];

export const CROSSHAIR_STYLES = ['dot', 'cross', 'circle', 'dynamic', 't-shape'];
export const WEAPON_TYPES = ['pistol', 'rifle', 'shotgun', 'sniper'];
export const THEMES = ['dark-room', 'military-range', 'cyber-grid', 'minimal-white'];
export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced', 'pro'];
