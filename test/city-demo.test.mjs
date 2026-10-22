import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUCKETS, validateDataset, resolveView, makeView, distribution, summary, distributionSvg, csvExport, briefHtml } from '../city-demo.mjs';
import { parseCsv } from '../imports/lib.mjs';

const data = JSON.parse(readFileSync(new URL('../data/city-scenarios.json', import.meta.url), 'utf8'));
const viewFor = values => makeView(data, resolveView(data, new URLSearchParams(values)));

test('all six requested worlds have explicit synthetic provenance and complete role/round distributions', () => {
  assert.equal(validateDataset(data), data);
  assert.deepEqual(data.cities.map(city => city.id), ['alexandria', 'hangzhou', 'london', 'tokyo', 'scrapyard', 'matrix']);
  assert.equal(data.evidence_class, 'synthetic');
  assert.equal(data.count_license, 'CC0-1.0');
  for (const city of data.cities) {
    for (const role of data.roles) {
      const baseline = distribution(data, city.id, 'baseline', role.id);
      const pressure = distribution(data, city.id, 'pressure', role.id);
      assert.ok(baseline.total > 0);
      assert.equal(pressure.total, baseline.total, `${city.id}/${role.id} preserves denominator`);
      for (const threshold of [50,55,60,65]) {
        assert.ok(summary(pressure, threshold).aboveCount >= summary(baseline, threshold).aboveCount);
      }
    }
  }
});

test('threshold rates use summed counts and the selected denominator, rather than averaging role rates', () => {
  const view = viewFor({ city: 'hangzhou', mode: 'round' });
  assert.equal(view.stats.total, 300);
  assert.equal(view.stats.aboveCount, 112);
  assert.equal(view.comparison.aboveCount, 135);
  assert.equal(view.stats.aboveShare, 112 / 300 * 100);
  assert.ok(Math.abs(view.delta - (-23 / 300 * 100)) < 1e-12);
  const role = viewFor({ city: 'hangzhou', role: 'clerical' });
  assert.equal(role.stats.total, 80);
  assert.equal(role.stats.aboveCount, 10);
  assert.equal(role.stats.aboveShare, 12.5);
  assert.notEqual(role.stats.total, view.stats.total);
});

test('comparison uses the same role filter while preserving each city denominator', () => {
  const view = viewFor({ city: 'hangzhou', peer: 'london', mode: 'city', role: 'craft', round: 'pressure' });
  assert.equal(view.current.roles.length, 1);
  assert.equal(view.comparator.roles.length, 1);
  assert.equal(view.stats.total, 120);
  assert.equal(view.comparison.total, 114);
  assert.equal(view.delta, view.stats.aboveShare - view.comparison.aboveShare);
});

test('subjective Matrix hours cannot be compared to actual-time scenarios in either direction', () => {
  for (const [city, peer] of [['matrix', 'tokyo'], ['tokyo', 'matrix']]) {
    const view = viewFor({ city, peer, mode: 'city' });
    assert.equal(view.comparator, null);
    assert.equal(view.delta, null);
    assert.match(view.reason, /时间定义不同/);
  }
  const view = viewFor({ city: 'matrix', mode: 'round' });
  assert.ok(view.comparator);
  assert.equal(view.current.city.body_context.hours, 168);
  assert.equal(view.stats.total, 300);
  assert.equal(view.current.counts[9], 0);
  assert.match(distributionSvg(view), /模拟意识体验/);
});

test('zero samples remain undefined percentages; tied modal intervals stay explicit', () => {
  const empty = { total: 0, counts: BUCKETS.map(() => 0) };
  assert.equal(summary(empty).aboveShare, null);
  assert.deepEqual(summary(empty).modes, []);
  const tied = { total: 4, counts: [0,0,2,2,0,0,0,0,0,0] };
  assert.deepEqual(summary(tied).modes, ['40–<45', '45–<50']);
  assert.throws(() => summary(tied, 56), /分档边界/);
});

test('unknown URL values are sanitized and same-city peer selection is repaired', () => {
  const state = resolveView(data, new URLSearchParams('city=<script>&peer=hangzhou&round=bad&role=bad&mode=bad&threshold=56'));
  assert.equal(state.city, 'hangzhou');
  assert.notEqual(state.city, state.peer);
  assert.equal(state.role, 'all');
  assert.equal(state.round, 'baseline');
  assert.equal(state.threshold, 55);
  assert.equal(state.mode, 'round');
});

test('invalid or incomplete numeric fixtures fail before rendering', () => {
  for (const invalid of [null, -1, 1.25, Number.MAX_SAFE_INTEGER + 1]) {
    const copy = structuredClone(data);
    copy.cities[0].roles[0].counts.baseline[0] = invalid;
    assert.throws(() => validateDataset(copy), /计数/);
  }
  const copy = structuredClone(data);
  copy.cities[0].roles[0].counts.baseline.pop();
  assert.throws(() => validateDataset(copy), /计数/);
});

test('CSV exports preserve the current role/round, comparator, complete cells and synthetic marking', () => {
  const view = viewFor({ city: 'hangzhou', peer: 'london', mode: 'city', role: 'craft', round: 'pressure', threshold: '60' });
  const rows = parseCsv(csvExport(view));
  assert.equal(rows.length, 20);
  assert.ok(rows.every(row => row.evidence_class === 'synthetic' && row.role_id === 'craft' && row.round_id === 'pressure'));
  assert.ok(rows.every(row => row.view_threshold_hours === '60' && row.comparison_mode === 'city'));
  for (const series of [view.current, view.comparator]) {
    const selected = rows.filter(row => row.city_id === series.city.id);
    assert.equal(selected.length, 10);
    assert.equal(selected.reduce((sum, row) => sum + Number(row.count), 0), series.total);
  }
});

test('offline brief and SVG retain provenance, filters, methods and fictional labels without remote assets', () => {
  const view = viewFor({ city: 'matrix', role: 'clerical', mode: 'city', peer: 'hangzhou' });
  const html = briefHtml(view), svg = distributionSvg(view);
  assert.match(html, /虚构情景 · 非真实研究/);
  assert.match(html, /168 小时/);
  assert.match(html, /时间定义不同/);
  assert.match(html, /模拟办公室/);
  assert.match(html, /floor\(计数/);
  assert.match(html, /fictional-cities-v1/);
  assert.doesNotMatch(html, /<script|<link|<iframe/);
  assert.match(svg, /synthetic/);
  assert.match(svg, /虚构情景演示/);
  assert.match(svg, /模拟意识体验/);
  assert.doesNotMatch(svg, /168/);
});

test('exported source labels are escaped as text rather than executable markup', () => {
  const copy = structuredClone(data);
  copy.cities[0].name = '<script>alert(1)</script>';
  const view = makeView(copy, resolveView(copy, new URLSearchParams('city=alexandria')));
  assert.doesNotMatch(briefHtml(view), /<script>/);
  assert.match(briefHtml(view), /&lt;script&gt;/);
  assert.doesNotMatch(distributionSvg(view), /<script>/);
});

test('compact charts preserve full counts, thresholds and provenance with a mobile viewBox', () => {
  const view = viewFor({ city: 'hangzhou', threshold: '60' });
  const compact = distributionSvg(view, { compact: true });
  assert.match(compact, /viewBox="0 0 350 634"/);
  assert.match(compact, /≥60h/);
  assert.equal((compact.match(/class="bar"/g) ?? []).length, 20);
  assert.match(compact, /synthetic/);
  for (const count of view.current.counts) assert.match(compact, new RegExp(`${count} 条合成记录`));
});
