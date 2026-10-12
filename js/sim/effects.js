// One general effect system. It reads effect keys from the tech data.
// No special code for any node.

import { NODES, NODE_IDS, EFFECT_RULES } from '../data/techTree.js';

export const STATUS = {
  LOCKED: 'LOCKED',
  AVAILABLE: 'AVAILABLE',
  RESEARCHING: 'RESEARCHING',
  UNLOCKED: 'UNLOCKED',
  DEPLOYING: 'DEPLOYING',
  ACTIVE: 'ACTIVE',
};

function emptyEffects() {
  const out = {};
  for (const [k, rule] of Object.entries(EFFECT_RULES)) {
    out[k] = Array.isArray(rule.none) ? [...rule.none] : (typeof rule.none === 'object' ? { ...rule.none } : rule.none);
  }
  out._seen = new Set();
  return out;
}

function add(out, effects) {
  for (const [k, v] of Object.entries(effects ?? {})) {
    const rule = EFFECT_RULES[k];
    if (!rule) throw new Error(`Unknown effect key: ${k}`);
    const first = !out._seen.has(k);
    out._seen.add(k);
    switch (rule.combine) {
      case 'min': out[k] = first ? v : Math.min(out[k], v); break;
      case 'max': out[k] = first ? v : Math.max(out[k], v); break;
      case 'sum': out[k] += v; break;
      case 'mul': out[k] *= v; break;
      case 'or': out[k] = out[k] || v; break;
      case 'list': if (!out[k].includes(v)) out[k].push(v); break;
      case 'mulMap':
        for (const [t, m] of Object.entries(v)) out[k][t] = (out[k][t] ?? 1) * m;
        break;
      default: throw new Error(`Unknown combine rule: ${rule.combine}`);
    }
  }
}

const isGlobalNode = (node) => node.deploy === null || node.deploy?.build || node.deploy?.oneTime;

// Is a node ACTIVE in this sector (or everywhere)?
export function nodeActiveIn(state, id, sector) {
  const node = NODES[id];
  const st = state.tech.nodes[id]?.status;
  if (isGlobalNode(node)) {
    if (node.deploy?.build) return st === STATUS.UNLOCKED || st === STATUS.ACTIVE;
    return st === STATUS.ACTIVE;
  }
  return sector ? sector.tech[id] === STATUS.ACTIVE : false;
}

// Effects that work in every sector.
export function globalEffects(state) {
  const out = emptyEffects();
  for (const id of NODE_IDS) {
    const node = NODES[id];
    if (isGlobalNode(node) && nodeActiveIn(state, id)) add(out, node.effects);
    if (node.anyEffects && state.sectors.some((s) => s.tech[id] === STATUS.ACTIVE)) add(out, node.anyEffects);
  }
  return out;
}

// Global effects plus the effects of nodes deployed in this sector.
export function sectorEffects(state, sector) {
  const out = globalEffects(state);
  for (const id of NODE_IDS) {
    const node = NODES[id];
    if (!isGlobalNode(node) && sector.tech[id] === STATUS.ACTIVE) add(out, node.effects);
  }
  return out;
}

export const isTierUnlocked = (state, tier, g = globalEffects(state)) => g.unlockTier.includes(tier);
export const isBuildingUnlocked = (state, type, g = globalEffects(state)) => g.unlockBuilding.includes(type);
export const damageMult = (fx, type) => fx.damageMult[type] ?? 1;
