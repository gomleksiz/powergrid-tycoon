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
  speedCycle: (s) => `Speed ${s}x. Tap to change.`,
  week: (w) => `Week ${w}`,
  menu: 'Menu',
  panel: 'Panel',
  cash: 'Cash',

  // Side panel tabs
  tabs: {
    sector: 'Sector', budget: 'Budget', research: 'Research', projects: 'Projects',
    staff: 'Staff', customers: 'Customers', rivals: 'Rivals', goals: 'Goals',
  },
  moreTabs: 'More',
  mapPlaceholder: 'The map comes in step 4.',
  closePanel: 'Close',

  // Sliders
  less: (label) => `Less ${label}`,
  more: (label) => `More ${label}`,
  lockSlider: (label) => `Lock ${label}`,
  unlockSlider: (label) => `Unlock ${label}`,

  // Budget panel
  budgetTitle: 'Budget',
  budgetTotal: 'Total budget',
  budgetTotalHelp: (pct, base) => `${pct}% of last month's revenue (${base}).`,
  budgetSplit: 'Split the budget',
  budgetSplitHelp: 'The 5 parts always add up to 100%. Lock a part to keep it.',
  budgetKeys: { marketing: 'Marketing', rd: 'R&D materials', maintenance: 'Maintenance', lobbying: 'Lobbying', pr: 'PR' },
  budgetKeyHelp: {
    marketing: 'Brings new customers.',
    rd: 'Makes research faster.',
    maintenance: 'Keeps the lines healthy.',
    lobbying: 'Raises Government Satisfaction.',
    pr: 'Raises Customer Satisfaction.',
  },
  perMonth: (v) => `${v} a month`,
  pricesTitle: 'Prices',
  pricesHelp: 'A low price brings customers. A high price brings money, but customers leave.',
  tierNames: { low: 'Low', medium: 'Medium', high: 'High', corporate: 'Corporate' },
  tierLong: { low: 'Residential Basic', medium: 'Suburban', high: 'Commercial', corporate: 'Industrial' },
  tierLocked: (tech) => `Locked. Research ${tech}.`,
  priceBill: (bill) => `${bill} a month for each customer`,
  priceCapped: 'GS is below 30: the price can be 1.1× at most.',
  loansTitle: 'Loans',
  loanInfo: (debt, limit) => `Debt ${debt} of ${limit}.`,
  loanInterest: (v) => `Interest: ${v} a month (1%).`,
  takeLoan: (v) => `Borrow ${v}`,
  repayLoan: (v) => `Pay back ${v}`,
  riskyPrice: 'This price will make customers leave. Continue?',

  // Customers panel
  customersTitle: 'Customers',
  customersTotal: (n) => `${n} customers`,
  colTier: 'Tier',
  colCustomers: 'Customers',
  colPrice: 'Price',
  colRevenue: 'Bill / month',
  colLimit: 'Outage limit',
  lastMonthChange: (g, l) => `Last month: +${g} new, −${l} left.`,
  potentialInfo: (n) => `${n} homes and firms could buy from you in your sectors.`,

  // Top bar
  cashAria: (cash, delta) => `Cash ${cash}. Last month ${delta}.`,
  customersAria: (n) => `${n} customers`,

  // Monthly report
  reportTitle: (label) => `Report: ${label}`,
  moneyIn: 'Money in',
  moneyOut: 'Money out',
  revenue: 'Customers paid',
  withheld: 'Withheld by High tier',
  energy: 'Energy',
  wages: 'Wages',
  upkeep: 'Upkeep',
  budget: 'Budget',
  interest: 'Loan interest',
  penalties: 'Penalties and fines',
  tax: 'Tax',
  net: 'Net',
  customersLine: (g, l) => `Customers: +${g} new, −${l} left`,
  wholesaleLine: (p) => `Wholesale price: ${p} per kWh`,
  closeReport: 'Close report',

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

  // News from the simulation (key → text)
  news: {
    emergencyLoan: ({ amount }) => `Cash went below $0. The bank gave an emergency loan of ${amount}.`,
  },
};
