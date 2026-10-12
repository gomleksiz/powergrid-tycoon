// All player-facing text. Keep sentences short and plain.

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const T = {
  gameTitle: 'PowerGrid Tycoon',
  tagline: 'Keep the lights on. 2030–2049.',

  // Top bar
  pause: 'Pause',
  play: 'Play',
  speedLabel: (s) => `${s}x`,
  speedAria: (s) => (s === 0 ? 'Pause' : `Speed ${s}x`),
  week: (w) => `Week ${w}`,
  menu: 'Menu',
  panel: 'Panel',
  cash: 'Cash',

  // Side panel placeholders
  panelBudget: 'Budget',
  panelSector: 'Sector',
  panelMeters: 'Meters',
  panelEmpty: 'Coming soon.',
  mapPlaceholder: 'The map comes in step 4.',
  closePanel: 'Close',

  // Difficulty
  difficulty: { easy: 'Easy', normal: 'Normal', hard: 'Hard' },

  // Title screen
  newGame: 'New Game',
  continueGame: 'Continue',
  load: 'Load',
  settings: 'Settings',
  companyName: 'Company name',
  companyNameDefault: 'Bright Spark Power',
  difficultyLabel: 'Difficulty',
  seedLabel: 'Seed',
  seedHint: 'The same seed gives the same map and the same events.',
  randomSeed: 'New seed',
  tutorialLabel: 'Play the tutorial',
  start: 'Start',
  back: 'Back',
  noContinue: 'No auto-save yet.',
  newestAutoSave: 'the newest auto-save',

  // Pause menu
  paused: 'Paused',
  resume: 'Resume',
  save: 'Save',
  quitToTitle: 'Quit to title',
  quitConfirm: 'Quit to the title screen? The game auto-saves first.',

  // Save / load
  saveTitle: 'Save game',
  loadTitle: 'Load game',
  slotName: (n) => `Slot ${n}`,
  autoName: (k) => `Auto-save ${k.toUpperCase()}`,
  emptySlot: 'Empty',
  brokenSave: 'This save is damaged.',
  newerSave: 'This save is from a newer version of the game.',
  replaceSave: 'Replace this save?',
  yes: 'Yes',
  no: 'No',
  ok: 'OK',
  saved: (name) => `Saved to ${name}.`,
  autoSaved: 'Game auto-saved.',
  loaded: (name) => `Loaded ${name}. The game is paused.`,
  saveFullError: 'Save failed: the browser storage is full. Delete old saves.',
  saveError: 'Save failed. Your browser may block storage.',
  loadError: 'This save could not be loaded.',
  usedBackupSave: 'One auto-save was damaged. The other auto-save was used.',
  deleteSave: 'Delete',
  deleteConfirm: 'Delete this save? You cannot undo this.',
  savedAt: (d) => `Saved ${d}`,
  playTime: (min) => `${min} min played`,

  // Settings
  settingsTitle: 'Settings',
  privateNote: 'Saves stay in this browser on this device. A private or incognito window deletes all saves when you close it.',
  storagePersisted: 'This browser keeps your saves safe from automatic clean-up.',
  storageNotPersisted: 'The browser may delete saves if the device is low on space.',
  seedInfo: (s) => `Game seed: ${s}`,
  versionInfo: (v) => `Version ${v}`,

  // News
  welcome: (name) => `Welcome, CEO of ${name}! Press Space or ▶ to start the clock.`,
  monthEnd: (label) => `${label} has ended.`,
  tabPaused: 'Game paused while the tab was hidden.',
};
