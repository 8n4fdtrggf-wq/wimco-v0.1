// Wimco Score: transparent viktning av sex kategorier (0–100).
import { CATEGORIES, GUIDES, SERVICES, SOURCE_LABELS } from './catalog.js';

const STATUS_VALUE = { pass: 1, warn: 0.5, fail: 0 };
const EFFORT_FACTOR = { Liten: 1.25, Medel: 1, Stor: 0.75 };
const IMPACT_FACTOR = { Hög: 1.4, Medel: 1, Låg: 0.7 };

function rulesScore(checks) {
  const scored = checks.filter((c) => c.status in STATUS_VALUE);
  const total = scored.reduce((s, c) => s + c.weight, 0);
  if (!total) return null;
  return (100 * scored.reduce((s, c) => s + c.weight * STATUS_VALUE[c.status], 0)) / total;
}

const BLENDS = {
  // hur mycket Lighthouse-kategorin väger in när den finns
  performance: { psiKey: 'performance', psiShare: 0.8 },
  accessibility: { psiKey: 'accessibility', psiShare: 0.6 },
  seo: { psiKey: 'seo', psiShare: 0.4 },
};

const EXPLAIN = {
  performance: 'Hur snabbt sidan laddar och blir användbar på en mobiltelefon.',
  mobile: 'Hur väl sidan fungerar på en liten skärm med tummen som muspekare.',
  accessibility: 'Om alla kan läsa och använda sidan – även med skärmläsare, tangentbord eller nedsatt syn.',
  seo: 'Den tekniska grunden för att Google ska hitta, förstå och visa sidan.',
  visual: 'Hur tydligt sidan kommunicerar sitt huvudbudskap och sin struktur.',
  conversion: 'Hur lätt det är för en intresserad besökare att ta nästa steg.',
};

export function scoreReport({ checks, psi, ai }) {
  const categories = [];
  for (const def of CATEGORIES) {
    const own = checks.filter((c) => c.category === def.id);
    const rs = rulesScore(own);
    const blend = BLENDS[def.id];
    const psiVal = blend && psi?.ok ? psi.categories?.[blend.psiKey] : null;
    const aiCat = ai?.ok ? ai.categories?.[def.id] : null;
    let score = rs;
    const parts = [];
    if (psiVal != null && rs != null) {
      score = blend.psiShare * psiVal * 100 + (1 - blend.psiShare) * rs;
      parts.push({ source: 'measured', label: `Lighthouse ${Math.round(psiVal * 100)}/100`, share: blend.psiShare });
      parts.push({ source: own.some((c) => c.source === 'heuristic') ? 'heuristic' : 'rules', label: `Kontroller ${Math.round(rs)}/100`, share: 1 - blend.psiShare });
    } else if (psiVal != null) {
      score = psiVal * 100;
      parts.push({ source: 'measured', label: `Lighthouse ${Math.round(psiVal * 100)}/100`, share: 1 });
    } else if (rs != null) {
      const srcs = new Set(own.filter((c) => c.status in STATUS_VALUE).map((c) => c.source));
      const src = srcs.has('heuristic') ? 'heuristic' : srcs.has('measured') && srcs.size === 1 ? 'measured' : srcs.has('measured') ? 'mixed' : 'rules';
      parts.push({ source: src, label: `Kontroller ${Math.round(rs)}/100`, share: 1 });
    }
    if (aiCat && typeof aiCat.score === 'number' && score != null) {
      score = 0.5 * score + 0.5 * aiCat.score;
      for (const p of parts) p.share *= 0.5;
      parts.push({ source: 'ai', label: `AI-bedömning ${Math.round(aiCat.score)}/100`, share: 0.5 });
    }
    if (score == null) {
      categories.push({ id: def.id, name: def.name, weight: def.weight, score: null, measured: false, explanation: EXPLAIN[def.id], parts: [] });
      continue;
    }
    const sorted = [...own].filter((c) => c.status in STATUS_VALUE).sort((a, b) => priorityOf(b, def.weight) - priorityOf(a, def.weight));
    const problem = sorted.find((c) => c.status !== 'pass');
    const strength = [...own].filter((c) => c.status === 'pass').sort((a, b) => b.weight - a.weight)[0];
    const limited = def.id === 'performance' && !psi?.ok;
    categories.push({
      id: def.id,
      name: def.name,
      weight: def.weight,
      score: Math.round(score),
      measured: parts.some((p) => p.source === 'measured'),
      limited,
      explanation: EXPLAIN[def.id],
      parts: parts.map((p) => ({ ...p, sourceLabel: SOURCE_LABELS[p.source] || 'Kontroller', share: Math.round(p.share * 100) / 100 })),
      strength: strength ? strength.title : null,
      problem: problem ? problem.title : null,
      problemId: problem ? problem.id : null,
      recommendation: problem ? problem.fix : 'Behåll nivån och följ upp efter större ändringar.',
      impact: problem ? `${problem.impact} – ${problem.impactText}` : null,
      effort: problem ? problem.effort : null,
      service: problem ? problem.service : null,
      cta: problem ? problem.cta : null,
      ai: aiCat ? { summary: aiCat.summary, strength: aiCat.strength, problem: aiCat.problem, fix: aiCat.fix } : null,
    });
  }

  const available = categories.filter((c) => c.score != null);
  const wsum = available.reduce((s, c) => s + c.weight, 0);
  const total = wsum ? Math.round(available.reduce((s, c) => s + c.weight * c.score, 0) / wsum) : null;

  const scoredChecks = checks.filter((c) => c.status in STATUS_VALUE);
  const weightOf = (cat) => CATEGORIES.find((d) => d.id === cat)?.weight ?? 0.15;
  const issues = scoredChecks.filter((c) => c.status !== 'pass').sort((a, b) => priorityOf(b, weightOf(b.category)) - priorityOf(a, weightOf(a.category)));
  const fixFirst = issues.filter((c) => c.status === 'fail' || c.weight >= 4).slice(0, 3);
  const next = issues.filter((c) => !fixFirst.includes(c)).slice(0, 6);
  const good = scoredChecks.filter((c) => c.status === 'pass').sort((a, b) => b.weight - a.weight).slice(0, 8);

  return {
    total,
    grade: total == null ? null : total >= 85 ? 'Stark' : total >= 70 ? 'Bra grund' : total >= 50 ? 'Tydlig potential' : 'Stor potential',
    categories,
    priorities: {
      fixFirst: fixFirst.map((c) => c.id),
      next: next.map((c) => c.id),
      good: good.map((c) => c.id),
    },
    weights: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.weight])),
  };
}

export function priorityOf(check, catWeight) {
  const sev = check.status === 'fail' ? 1 : check.status === 'warn' ? 0.5 : 0;
  return check.weight * sev * (catWeight * 10) * (IMPACT_FACTOR[check.impact] || 1) * (EFFORT_FACTOR[check.effort] || 1);
}

export function decorateChecks(checks) {
  return checks.map((c) => ({
    ...c,
    sourceLabel: SOURCE_LABELS[c.source],
    guideTitle: c.guide ? GUIDES[c.guide]?.title : null,
    guideUrl: c.guide ? GUIDES[c.guide]?.url : null,
    serviceName: SERVICES[c.service]?.name || null,
  }));
}
