// pricing.js — Shared client-side pricing (single source of truth)
// Uses current-gen rates (opus 4.5+, sonnet 4+, haiku 4.5). Values are $ per 1M tokens.
// Note: server-side parser.js has version-level pricing (e.g. opus-4.1 at $15 vs opus-4.6 at $5).
// Client uses family-level only; legacy model costs will be approximate in filtered views.

const CLIENT_PRICING = {
  opus:   { baseInput: 5,    cacheWrite: 6.25, cacheRead: 0.50, output: 25 },
  sonnet: { baseInput: 3,    cacheWrite: 3.75, cacheRead: 0.30, output: 15 },
  haiku:  { baseInput: 1,    cacheWrite: 1.25, cacheRead: 0.10, output: 5  },
};

function clientGetPricing(model) {
  const m = (model || '').toLowerCase();
  if (m.includes('opus')) return CLIENT_PRICING.opus;
  if (m.includes('haiku')) return CLIENT_PRICING.haiku;
  return CLIENT_PRICING.sonnet; // default
}

function clientComputeCost(model, baseInput, cacheWrite, cacheRead, output) {
  const p = clientGetPricing(model);
  const withCache = (baseInput * p.baseInput + cacheWrite * p.cacheWrite + cacheRead * p.cacheRead + output * p.output) / 1_000_000;
  const withoutCache = ((baseInput + cacheWrite + cacheRead) * p.baseInput + output * p.output) / 1_000_000;
  return { withCache, withoutCache };
}
