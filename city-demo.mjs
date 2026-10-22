import { BUCKETS } from './partner-preview.mjs';
export { BUCKETS };

export const escapeText = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

export function validateDataset(data) {
  if (data.evidence_class !== 'synthetic' || data.version !== 'fictional-cities-v1') throw new Error('演示数据类型不正确。');
  if (JSON.stringify(data.bucket_ids) !== JSON.stringify(BUCKETS.map(([id]) => id))) throw new Error('工时分档不一致。');
  const unique = items => new Set(items.map(item => item.id)).size === items.length;
  if (!data.cities.length || !unique(data.cities) || !unique(data.roles) || !unique(data.rounds)) throw new Error('城市或维度重复。');
  for (const city of data.cities) {
    if (!unique(city.roles) || city.roles.length !== data.roles.length || !city.definition || !city.measure) throw new Error('城市口径不完整。');
    for (const role of data.roles) {
      const cohort = city.roles.find(item => item.id === role.id);
      for (const round of data.rounds) {
        const counts = cohort?.counts[round.id];
        if (!Array.isArray(counts) || counts.length !== BUCKETS.length || counts.some(count => !Number.isSafeInteger(count) || count < 0)
            || !Number.isSafeInteger(counts.reduce((sum, count) => sum + count, 0))) throw new Error('合成计数不完整或无效。');
      }
    }
  }
  return data;
}

export function resolveView(data, params = new URLSearchParams()) {
  const city = data.cities.find(item => item.id === params.get('city')) ?? data.cities.find(item => item.id === 'hangzhou') ?? data.cities[0];
  const peer = data.cities.find(item => item.id === params.get('peer') && item.id !== city.id)
    ?? data.cities.find(item => item.id === 'london' && item.id !== city.id)
    ?? data.cities.find(item => item.id !== city.id);
  return {
    city: city.id, peer: peer?.id ?? city.id,
    round: data.rounds.some(item => item.id === params.get('round')) ? params.get('round') : 'baseline',
    role: data.roles.some(item => item.id === params.get('role')) ? params.get('role') : 'all',
    mode: ['round', 'city', 'none'].includes(params.get('mode')) ? params.get('mode') : 'round',
    threshold: [50, 55, 60, 65].includes(Number(params.get('threshold'))) ? Number(params.get('threshold')) : 55
  };
}

export function distribution(data, cityId, roundId, roleId = 'all') {
  const city = data.cities.find(item => item.id === cityId);
  const round = data.rounds.find(item => item.id === roundId);
  if (!city || !round || (roleId !== 'all' && !city.roles.some(role => role.id === roleId))) throw new Error('找不到所选城市、情景或角色。');
  const roles = city.roles.filter(role => roleId === 'all' || role.id === roleId);
  const counts = BUCKETS.map((_, index) => roles.reduce((sum, role) => sum + role.counts[roundId][index], 0));
  const total = counts.reduce((sum, count) => sum + count, 0);
  return { city, round, roles, counts, total, label: `${city.name} · ${round.label}` };
}

export function summary(series, threshold = 55) {
  const start = BUCKETS.findIndex(([id]) => id === `${threshold}_${threshold + 5}`);
  if (start < 0) throw new Error('阈值必须与分档边界一致。');
  const aboveCount = series.counts.slice(start).reduce((sum, count) => sum + count, 0);
  const max = Math.max(...series.counts);
  return {
    total: series.total, aboveCount,
    aboveShare: series.total ? aboveCount / series.total * 100 : null,
    modes: series.total ? BUCKETS.filter((_, index) => series.counts[index] === max).map(([, label]) => label) : []
  };
}

export function makeView(data, state) {
  const current = distribution(data, state.city, state.round, state.role);
  let comparator = null, reason = '';
  if (state.mode === 'round') comparator = distribution(data, state.city, state.round === 'baseline' ? 'pressure' : 'baseline', state.role);
  if (state.mode === 'city') {
    const candidate = distribution(data, state.peer, state.round, state.role);
    if (candidate.city.measure === current.city.measure) comparator = candidate;
    else reason = '两座城的时间定义不同：实际劳动时间与模拟意识体验不能合并比较。切换“同城两种情景”可查看同口径比较。';
  }
  const stats = summary(current, state.threshold), comparison = comparator ? summary(comparator, state.threshold) : null;
  const delta = stats.aboveShare === null || comparison?.aboveShare == null ? null : stats.aboveShare - comparison.aboveShare;
  return { data, state, current, comparator, stats, comparison, delta, reason };
}

export function distributionSvg(view, { compact = false, dense = false, showThreshold = true } = {}) {
  const series = [view.current, view.comparator].filter(Boolean);
  const percentages = series.flatMap(item => item.counts.map(count => item.total ? count / item.total * 100 : 0));
  const maximum = Math.max(...percentages);
  const tickStep = compact && maximum > 40 ? 20 : 10;
  const ceiling = Math.max(20, Math.ceil(maximum / tickStep) * tickStep);
  const width = compact ? 350 : 840, height = compact ? 634 : dense ? 480 : 594;
  const left = compact ? 64 : 94, plot = compact ? 230 : 618, top = compact ? 124 : dense ? 76 : 88, step = compact ? 40 : dense ? 32 : 43;
  const x = value => left + value / ceiling * plot;
  const colors = ['#146c4a', '#9a6231'];
  const styles = 'text{font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;fill:#263440;font-size:13px}.muted{fill:#596673}.bar:focus{outline:none}.bar:focus rect{stroke:#121820;stroke-width:3}.grid{stroke:#dfe5e8;stroke-width:1}';
  let content = `<title id="plot-title">${escapeText(view.data.plot_title ?? `${view.current.city.name}：虚构每周劳动时间分布`)}</title><desc id="plot-desc">${escapeText(view.data.disclosure)} 横轴是每组记录中的比例，从零开始。完整计数见随附数据表。</desc><style>${styles}</style><rect width="${width}" height="${height}" fill="white"/><text x="18" y="25" font-weight="700">${escapeText(view.data.chart_disclosure ?? '虚构情景演示 · 非历史统计')}</text>`;
  const formatShare = value => value === null ? '不可用' : value.toFixed(1) + '%';
  if (showThreshold) content += `<text x="${compact ? 18 : 420}" y="${compact ? 48 : 25}">≥${view.state.threshold}h：${formatShare(view.stats.aboveShare)}${view.comparison ? ` / ${formatShare(view.comparison.aboveShare)}（当前 / 比较）` : '（当前）'}</text>`;
  series.forEach((item, index) => {
    const ly = (compact ? 78 : 49) + index * 21;
    const fullLabel = `${item.label} · n=${item.total}`;
    let displayedLabel = '', units = 0;
    for (const character of fullLabel) {
      units += character.charCodeAt(0) > 255 ? 2 : 1;
      if (units > (compact ? 42 : 116)) { displayedLabel += '…'; break; }
      displayedLabel += character;
    }
    content += `<rect x="18" y="${ly - 10}" width="12" height="12" fill="${colors[index]}"/><text x="38" y="${ly}" aria-label="${escapeText(fullLabel)}">${escapeText(displayedLabel)}</text>`;
  });
  for (let tick = 0; tick <= ceiling; tick += tickStep) {
    content += `<line class="grid" x1="${x(tick)}" x2="${x(tick)}" y1="${top}" y2="${top + step * 10 - 8}"/><text class="muted" x="${x(tick)}" y="${top + step * 10 + 14}" text-anchor="middle">${tick}%</text>`;
  }
  BUCKETS.forEach(([id, label], index) => {
    const y = top + index * step;
    content += `<text x="${left - 14}" y="${y + 18}" text-anchor="end">${escapeText(label)}</text>`;
    series.forEach((item, seriesIndex) => {
      const count = item.counts[index], percent = item.total ? count / item.total * 100 : null;
      const barY = y + seriesIndex * 16, barWidth = (percent ?? 0) / ceiling * plot;
      const detail = `${item.label} · ${label} 小时 · ${count} 条${view.data.record_label ?? '合成记录'} · ${percent === null ? '比例不可用' : percent.toFixed(1) + '%'}`;
      content += `<g class="bar" tabindex="0" role="img" aria-label="${escapeText(detail)}" data-tip="${escapeText(detail)}"><rect x="${left}" y="${barY}" width="${Math.max(0, barWidth)}" height="12" fill="${colors[seriesIndex]}"/><text x="${left + barWidth + 7}" y="${barY + 11}">${percent === null ? '—' : percent.toFixed(1) + '%'}</text></g>`;
    });
  });
  const measureLabel = view.data.measure_short ?? (view.current.city.measure === 'fictional_subjective_week' ? '模拟意识体验到的劳动时间；舱体接入另计' : '情景角色的实际劳动时间；按现代小时计');
  content += compact
    ? `<text class="muted" x="18" y="572">${escapeText(view.data.plot_note ?? '合成记录的组内比例；非真实调查。')}</text><text class="muted" x="18" y="594">单位：小时 / ${view.data.record_label ? '周' : '假想七天周期'}。</text><text class="muted" x="18" y="616">口径：${escapeText(view.data.measure_short ?? (view.current.city.measure === 'fictional_subjective_week' ? '模拟意识中的劳动时间；舱体另计' : '情景实际劳动时间（现代小时）'))}</text>`
    : `<text class="muted" x="18" y="${dense ? 446 : 560}">${escapeText(view.data.plot_note ?? '小时 / 假想七天周期；比例分母为各组的合成记录数。不是对真实劳动者的估计。')}</text><text class="muted" x="18" y="${dense ? 469 : 583}">Open Worktime · 口径：${escapeText(measureLabel)}</text>`;
  content += `<metadata>${escapeText(JSON.stringify({ evidence_class: view.data.evidence_class ?? 'synthetic', version: view.data.version, state: view.state, definition: view.current.city.definition, comparator_definition: view.comparator?.city.definition ?? null }))}</metadata>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="plot-title plot-desc">${content}</svg>`;
}

export function tableMarkup(view) {
  const series = [view.current, view.comparator].filter(Boolean);
  return `<table><caption>${escapeText(view.data.table_caption ?? '合成计数与组内比例 · 不是调查结果')}</caption><thead><tr><th scope="col">小时 / 周</th>${series.map(item => `<th scope="col">${escapeText(item.label)}<br>计数 / 比例</th>`).join('')}</tr></thead><tbody>${BUCKETS.map(([, label], index) => `<tr><th scope="row">${escapeText(label)}</th>${series.map(item => `<td>${item.counts[index]} / ${item.total ? (item.counts[index] / item.total * 100).toFixed(1) + '%' : '—'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

export function csvExport(view) {
  const header = ['evidence_class','dataset_version','city_id','city_name','round_id','role_id','role_name','weekly_hours_bucket','count','measure','definition','count_license','view_threshold_hours','comparison_mode'];
  const quote = value => `"${String(value).replace(/"/g, '""')}"`;
  const rows = [view.current, view.comparator].filter(Boolean).flatMap(item => item.roles.flatMap(role => BUCKETS.map(([bucket], index) => [
    'synthetic', view.data.version, item.city.id, item.city.name, item.round.id, role.id, role.label, bucket,
    role.counts[item.round.id][index], item.city.measure, item.city.definition, view.data.count_license, view.state.threshold, view.state.mode
  ])));
  return '\uFEFF' + [header, ...rows].map(row => row.map(quote).join(',')).join('\r\n') + '\r\n';
}

export function briefHtml(view) {
  const e = escapeText, { data, current, comparator, stats, state, reason } = view;
  const pct = value => value === null ? '不可用' : value.toFixed(1) + '%';
  const cities = [current.city, comparator?.city].filter((city, index, all) => city && all.findIndex(item => item?.id === city.id) === index);
  const sourceSections = cities.map(city => `<section><h3>${e(city.name)} · 设定与口径</h3><p>${e(city.setting)}。${e(city.context)}</p><p>时间定义：${e(city.definition)}</p><p>压力情景：${e(city.pressure)}</p>${city.body_context ? `<p><strong>${e(city.body_context.label)}：${city.body_context.hours} 小时 / 周（另列背景）</strong>。${e(city.body_context.note)}</p>` : ''}${city.sources.length ? `<ul>${city.sources.map(source => `<li><a href="${e(source.url)}">${e(source.title)}</a> — ${e(source.note)}</li>`).join('')}</ul>` : '<p>题材来源：用户提供的城市设定。没有引用外部工时数据。</p>'}</section>`).join('');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(current.city.name)} · 虚构工时演示简报</title><style>body{font:16px/1.7 system-ui,"Microsoft YaHei",sans-serif;color:#18232b;max-width:900px;margin:40px auto;padding:0 24px}h1{line-height:1.3}a{color:#146c4a}.notice{padding:16px;background:#fff3d8;border:1px solid #ddc99f}.figure{overflow-x:auto}svg{display:block;width:100%;min-width:840px;height:auto}.table-wrap{overflow-x:auto}table{min-width:420px}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{padding:10px;border-bottom:1px solid #d9e0e6;text-align:left}caption{text-align:left;color:#596673}section{margin-top:28px}footer{margin-top:36px;border-top:1px solid #d9e0e6;padding-top:16px;color:#596673}@media print{body{margin:0;font-size:11pt}svg,table{min-width:0}svg,section{break-inside:avoid}}</style></head><body><p>Open Worktime · 本地生成的演示简报</p><h1>${e(current.city.name)}：一周的劳动时间</h1><p class="notice"><strong>虚构情景 · 非真实研究</strong><br>${e(data.disclosure)}</p><p>当前视图：${e(current.label)}；${state.role === 'all' ? '所有角色' : e(data.roles.find(role => role.id === state.role).label)}。比较项：${comparator ? e(comparator.label) : '无'}。</p><p>合成记录数：${stats.total}；${state.threshold} 小时及以上：${stats.aboveCount} 条，占 ${pct(stats.aboveShare)}。</p>${view.delta === null ? '' : `<p>与比较项的占比差：${view.delta >= 0 ? '+' : ''}${view.delta.toFixed(1)} 个百分点。只描述创作数据，不代表历史差异或因果关系。</p>`}${reason ? `<p>${e(reason)}</p>` : ''}<div class="figure">${distributionSvg(view)}</div><div class="table-wrap">${tableMarkup(view)}</div>${sourceSections}<section><h2>数字的生成与使用边界</h2><p>${e(data.construction)}</p><p>当前角色：${current.roles.map(role => `${e(role.label)}（右移比例 ${(role.transfer_fraction * 100).toFixed(0)}%）`).join('、')}。</p><p>每组比例 = 档内计数 ÷ 该组总计数；阈值占比先求和计数，再除以总数。零样本比例留空。不从区间计算精确均值；75+ 是开放区间。</p><p>跨城比较仅用于演示；现代工时单位、角色分类与时间定义均为创作约定，不能用来比较真实历史制度。未生成任何个人记录，也没有合并两组样本。</p></section><footer>版本：${e(data.version)} · 原创合成计数：${e(data.count_license)}<br>${e(data.rights_note)}<br>本简报为可离线打开的 HTML；保留本页虚构标记、图表、计数与方法说明。</footer></body></html>`;
}
