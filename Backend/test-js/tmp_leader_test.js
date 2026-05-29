// Quick test to validate leaderboard mapping logic handles throwing getters safely
const throwingDoc = {
  playerNumber: '801',
  name: 'Throwy',
  category: 'x',
  score: 0,
  highscores: {}
};
Object.defineProperty(throwingDoc.highscores, 'bad', {
  get() { throw new Error('boom getter') },
  configurable: true,
  enumerable: true
});

function safeMap(d) {
  const out = {
    name: d && d.name,
    playerNumber: d && d.playerNumber,
    category: d && d.category,
    score: (d && typeof d.score === 'number') ? d.score : 0,
  };
  try {
    if (d && d.highscores && typeof d.highscores === 'object') {
      out.highscores = {};
      for (const k of Object.keys(d.highscores)) {
        try {
          const val = d.highscores[k];
          out.highscores[k] = val;
          if (typeof out[k] === 'undefined') out[k] = val;
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  let total = 0;
  const seen = new Set();
  for (const key of Object.keys(out)) {
    try {
      const lk = String(key).toLowerCase();
      if (lk === 'highscores' || lk === 'score') continue;
      if (lk.includes('score') || lk.includes('highscore')) {
        const raw = out[key];
        const n = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN);
        if (!Number.isNaN(n)) { total += Number(n); seen.add(lk); }
      }
    } catch {}
  }
  try {
    const hs = out.highscores;
    if (hs && typeof hs === 'object') {
      for (const k of Object.keys(hs)) {
        try {
          const lk = String(k).toLowerCase();
          if (seen.has(lk)) continue;
          const raw = hs[k];
          const n = typeof raw === 'number' ? raw : (typeof raw === 'string' ? Number(raw) : NaN);
          if (!Number.isNaN(n)) total += Number(n);
        } catch {}
      }
    }
  } catch {}
  out.score = Number.isNaN(total) ? 0 : total;
  return out;
}

try {
  const res = safeMap(throwingDoc);
  console.log('Mapping succeeded:', res);
  console.log('JSON stringify result:', JSON.stringify({ leaderboard: [res] }));
} catch (e) {
  console.error('Mapping failed with error:', e);
}

