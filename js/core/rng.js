// Seeded random numbers (mulberry32). The sim uses only this, never Math.random().

export function createRng(seed = 1) {
  let s = seed >>> 0;

  function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Whole number from min to max, both included.
  function int(min, max) {
    return min + Math.floor(next() * (max - min + 1));
  }

  function chance(p) {
    return next() < p;
  }

  return {
    next,
    int,
    chance,
    getState: () => s,
    setState: (v) => { s = v >>> 0; },
  };
}

// Run fn with an rng that reads and writes state.rng, so saves keep the sequence.
export function withStateRng(state, fn) {
  const rng = createRng();
  rng.setState(state.rng);
  const out = fn(rng);
  state.rng = rng.getState();
  return out;
}
