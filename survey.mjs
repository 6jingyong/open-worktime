import { BUCKETS, summary, escapeText as e, distributionSvg, tableMarkup } from './city-demo.mjs';
export { BUCKETS, distributionSvg, tableMarkup };

export const MAX_SURVEY_BYTES = 5 * 1024 * 1024;
export const MAX_SURVEY_ROWS = 20000;
export const SURVEY_HEADERS = ['人物序号', '调研时间', '公司', '雇佣形式', '工作时长'];
export const EMPLOYMENT = [
  { id: 'self_employed', label: '自雇', short: '自己经营或接单', description: '自己经营、承接订单并安排工作。样表中的农户、摊主属于这一组；不等于所有农民或个体户都具有相同关系。' },
  { id: 'direct_contract', label: '直接雇佣', short: '工作单位直接雇佣', description: '由当前工作单位直接雇佣并安排工作。这里没有进一步区分长期、定期或兼职合同，直接雇佣也不自动表示正式编制。' },
  { id: 'labor_dispatch', label: '劳务派遣', short: '机构雇佣，工作单位派活', description: '雇佣方与实际工作单位分开：派遣机构雇佣，接收单位安排具体工作。跨地区名称和制度不同；样表按这种工作关系作对照。' },
  { id: 'labor_outsource', label: '劳务外包', short: '服务商组织团队交付', description: '工作单位把一项服务交给承包商，由承包商组织和管理人员，例如厂区安保、保洁。外包人员也在同一现场工作，公司列记录服务现场。' },
  { id: 'onsite_service', label: '驻场售后', short: '设备商工程师在客户现场', description: '供应商或设备商的工程师在客户现场提供维护。这是服务场景标签，并非独立的法定雇佣形式，可能与外包等关系重叠。样表优先归入此组，不重复计数。' },
  { id: 'other_unknown', label: '其他/不确定', short: '关系尚未确认', description: '已有信息不足以归入上述组，保留不确定性，不根据岗位或单位名称猜测合同关系。' }
];
export const EMPLOYMENT_NOTE = '这些中文标签用于对照工作关系，不是各国统一的法律分类；驻场售后描述服务场景，与外包等关系可能重叠。每条记录只保留一个原始标签。';
export const EMPLOYMENT_SOURCES = [
  { title: '日本厚生劳动省：派遣与请负的区别', url: 'https://jsite.mhlw.go.jp/ibaraki-roudoukyoku/yokuaru_goshitsumon/jigyounushi/jigyounushi_e/qa_jhaken_ukeoi_chigai.html' },
  { title: '日本厚生劳动省：派遣制度的时间背景', url: 'https://www.mhlw.go.jp/www2/english/outline/02-5.htm' }
];
export const occupationLabel = value => value || '未提供岗位';
const aliases = [
  ['人物序号','匿名编号','respondent_id'], ['调研时间','调研日期','survey_date'],
  ['公司','单位','公司/单位','organization'], ['雇佣形式','employment_type'], ['工作时长','周工时','weekly_hours'],
  ['岗位','工作岗位','occupation','job_role']
];
const employmentAliases = new Map(EMPLOYMENT.flatMap(item => [[item.id, item.id], [item.label, item.id]]));
for (const [label, id] of [['直接雇用','direct_contract'], ['直接劳动合同','direct_contract'], ['其他','other_unknown'], ['不确定','other_unknown'], ['其他/未知','other_unknown']]) employmentAliases.set(label, id);
export const employmentLabel = id => EMPLOYMENT.find(item => item.id === id)?.label ?? id;

function csvRows(text) {
  const rows = []; let fields = [], field = '', quoted = false, closed = false, line = 1, rowLine = 1;
  const pushField = () => { fields.push(field); field = ''; closed = false; };
  const pushRow = () => { pushField(); if (fields.some(value => value.trim())) rows.push({ fields, line: rowLine }); fields = []; rowLine = line; };
  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];
    if (quoted) {
      if (character === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (character === '"') { quoted = false; closed = true; }
      else { field += character; if (character === '\n') line += 1; }
    } else if (character === ',') pushField();
    else if (character === '\r' || character === '\n') {
      if (character === '\r' && text[i + 1] === '\n') i += 1;
      line += 1; pushRow();
    } else if (character === '"') {
      if (field || closed) throw new Error(`第 ${line} 行：CSV 引号位置不正确。`);
      quoted = true;
    } else {
      if (closed) throw new Error(`第 ${line} 行：闭合引号后出现了其他文字。`);
      field += character;
    }
  }
  if (quoted) throw new Error(`第 ${rowLine} 行：CSV 引号没有闭合。`);
  if (field || fields.length || closed) pushRow();
  return rows;
}

export function dateKey(value) {
  const match = /^(前)?(\d{1,4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('调研时间请用 YYYY-MM-DD；古代演示可用 前200-06-01。');
  const year = Number(match[2]), month = Number(match[3]), day = Number(match[4]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31,leap ? 29 : 28,31,30,31,30,31,31,30,31,30,31];
  if (!year || month < 1 || month > 12 || day < 1 || day > days[month - 1]) throw new Error('调研日期不存在，请检查年、月、日。');
  return (match[1] ? -year : year) * 10000 + month * 100 + day;
}

export function parseSurveyCsv(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_SURVEY_BYTES) throw new Error('请选择不超过 5 MiB 的 UTF-8 CSV。');
  if (text.includes('\ufffd')) throw new Error('文件编码无法识别，请另存为 CSV UTF-8 后重试。');
  const [header, ...rows] = csvRows(text.replace(/^\uFEFF/, ''));
  const columns = header?.fields.map(value => aliases.findIndex(names => names.includes(value.trim())));
  if (!columns || ![5,6].includes(columns.length) || columns.includes(-1) || new Set(columns).size !== columns.length || ![0,1,2,3,4].every(index => columns.includes(index))) {
    throw new Error(`CSV 必须包含五列：${SURVEY_HEADERS.join('、')}；可另加“岗位”列。不要加入姓名或联系方式等其他列。`);
  }
  if (!rows.length || rows.length > MAX_SURVEY_ROWS) throw new Error(`CSV 需要 1–${MAX_SURVEY_ROWS.toLocaleString('en')} 条调研记录。`);
  const seen = new Set();
  const records = rows.map(row => {
    const fail = message => { throw new Error(`第 ${row.line} 行：${message}`); };
    if (row.fields.length !== columns.length) fail(`应有${columns.length === 5 ? '五' : '六'}个单元格，请检查逗号和引号。`);
    const values = [];
    columns.forEach((column, index) => { values[column] = row.fields[index].trim(); });
    const [id, date, organization, rawEmployment, rawHours, occupation] = values;
    if (!/^[A-Za-z0-9_.-]{1,64}$/.test(id)) fail('人物序号请用 1–64 位字母、数字、点、下划线或连字符，保留前导零；不要填写姓名。');
    let sortDate;
    try { sortDate = dateKey(date); } catch (error) { fail(error.message); }
    if (!organization || organization.length > 120 || /[\u0000-\u001f\u007f]/.test(organization)) fail('请填写 1–120 字的单位名称，不要包含换行或控制字符。');
    if (occupation !== undefined && (occupation.length > 80 || /[\u0000-\u001f\u007f]/.test(occupation))) fail('岗位最多 80 字，不要包含换行或控制字符；未知可留空。');
    const employment = employmentAliases.get(rawEmployment);
    if (!employment) fail(`雇佣形式需为：${EMPLOYMENT.map(item => item.label).join('、')}。`);
    if (!/^\d+(\.\d+)?$/.test(rawHours) || rawHours.length > 18 || !Number.isFinite(Number(rawHours)) || Number(rawHours) > 168) fail('工作时长需为 0–168 的每周小时数，可含小数；不要填写日工时、区间或带单位的文字。');
    const key = `${id}\u0000${sortDate}`;
    if (seen.has(key)) fail('同一人物序号在同一调研日期重复出现；请先核对，不能重复计数。');
    seen.add(key);
    return { id, date, dateKey: sortDate, organization, employment, hours: Number(rawHours), ...(occupation !== undefined ? { occupation } : {}) };
  });
  const dates = [...new Set(records.map(row => row.date))].sort((a, b) => dateKey(a) - dateKey(b));
  return {
    records, dates, organizations: [...new Set(records.map(row => row.organization))].sort((a, b) => a.localeCompare(b, 'zh-CN')),
    employments: EMPLOYMENT.filter(item => records.some(row => row.employment === item.id)).map(item => item.id),
    hasOccupations: columns.includes(5), occupations: [...new Set(records.map(row => row.occupation ?? ''))].sort((a,b) => a.localeCompare(b, 'zh-CN')),
    people: new Set(records.map(row => row.id)).size
  };
}

export function recordsCsv(records) {
  const quote = value => `"${String(value).replace(/"/g, '""')}"`;
  const withOccupation = records.some(row => row.occupation !== undefined);
  return '\uFEFF' + [[...SURVEY_HEADERS, ...(withOccupation ? ['岗位'] : [])], ...records.map(row => [row.id, row.date, row.organization, employmentLabel(row.employment), row.hours, ...(withOccupation ? [row.occupation ?? ''] : [])])]
    .map(row => row.map(quote).join(',')).join('\r\n') + '\r\n';
}

export function resolveSurveyState(source, params = new URLSearchParams()) {
  const survey = source.survey;
  const valid = (values, value, fallback) => values.includes(value) ? value : fallback;
  const mode = valid(['employment','organization','date','city','none'], params.get('mode') === 'round' ? 'date' : params.get('mode'), 'none');
  const requestedMode = source.local && mode === 'city' ? 'employment' : mode;
  const firstDate = survey.dates[0], lastDate = survey.dates.at(-1);
  const dateFallback = params.get('round') === 'baseline' ? firstDate : lastDate;
  let employment = valid(['all', ...survey.employments], params.get('employment'), 'all');
  let organization = valid(['all', ...survey.organizations], params.get('organization'), 'all');
  if (requestedMode === 'organization' && organization === 'all') organization = survey.organizations[0];
  const otherOrganizations = survey.organizations.filter(name => name !== organization);
  let date = valid(['all', ...survey.dates], params.get('date'), dateFallback);
  if (requestedMode === 'date' && date === 'all') date = lastDate;
  const inScope = row => (date === 'all' || row.date === date) && (organization === 'all' || row.organization === organization);
  if (requestedMode === 'employment' && employment === 'all') {
    const available = survey.employments.filter(id => survey.records.some(row => inScope(row) && row.employment === id));
    employment = available.includes('direct_contract') ? 'direct_contract' : available[0] ?? survey.employments[0];
  }
  const otherEmployment = survey.employments.filter(id => id !== employment);
  const presentEmployment = otherEmployment.filter(id => survey.records.some(row => row.employment === id
    && inScope(row)));
  const fallbackEmployment = presentEmployment.includes('direct_contract') ? 'direct_contract' : presentEmployment[0] ?? otherEmployment[0] ?? '';
  const otherDates = survey.dates.filter(value => value !== date);
  return {
    city: source.id, mode: requestedMode,
    date,
    employment, organization,
    compareEmployment: valid(otherEmployment, params.get('compareEmployment'), fallbackEmployment),
    compareOrganization: valid(otherOrganizations, params.get('compareOrganization'), otherOrganizations[0] ?? ''),
    compareDate: valid(otherDates, params.get('compareDate'), otherDates[0] ?? ''),
    peer: params.get('peer') || 'london', threshold: valid([50,55,60,65], Number(params.get('threshold')), 55)
  };
}

export function filterRecords(source, state, overrides = {}) {
  const selected = { ...state, ...overrides };
  return source.survey.records.filter(row => (selected.date === 'all' || row.date === selected.date)
    && (selected.employment === 'all' || row.employment === selected.employment)
    && (selected.organization === 'all' || row.organization === selected.organization));
}

function seriesFor(source, state, overrides = {}, label = '') {
  const records = filterRecords(source, state, overrides);
  const counts = BUCKETS.map(() => 0);
  for (const row of records) {
    const bucket = row.hours < 35 ? 0 : row.hours >= 75 ? 9 : Math.floor((row.hours - 35) / 5) + 1;
    counts[bucket] += 1;
  }
  return { city: source, label, filters: { ...state, ...overrides }, records, counts, total: records.length, people: new Set(records.map(row => row.id)).size };
}

export function makeSurveyView(source, state, peerSource = null) {
  // Re-resolve saved/legacy state so removed occupation filters cannot narrow a group or reach exports.
  state = resolveSurveyState(source, new URLSearchParams(Object.entries(state)));
  const dateLabel = state.date === 'all' ? '全部轮次' : state.date;
  const mainLabel = state.mode === 'employment' ? employmentLabel(state.employment)
    : state.mode === 'organization' ? state.organization : state.mode === 'date' ? dateLabel : source.name;
  const current = seriesFor(source, state, {}, mainLabel);
  let comparator = null, reason = '';
  if (state.mode === 'employment' && state.compareEmployment) comparator = seriesFor(source, state, { employment: state.compareEmployment }, employmentLabel(state.compareEmployment));
  if (state.mode === 'organization' && state.compareOrganization) comparator = seriesFor(source, state, { organization: state.compareOrganization }, state.compareOrganization);
  if (state.mode === 'date' && state.compareDate) comparator = seriesFor(source, state, { date: state.compareDate }, state.compareDate);
  if (state.mode === 'city' && peerSource) {
    if (source.evidence_class !== peerSource.evidence_class || source.measure !== peerSource.measure) reason = '两份数据的来源性质或工时口径不同，不计算跨城差值。';
    else if (state.organization !== 'all') reason = '跨城比较请先将单位设为“全部”，避免把本城单位名称套用到另一座城。';
    else {
      const peerDate = peerSource.survey.dates.includes(state.date) ? state.date : state.date === 'all' ? 'all' : peerSource.survey.dates.at(-1);
      comparator = seriesFor(peerSource, state, { date: peerDate, organization: 'all' }, peerSource.name);
      comparator.dateLabel = peerDate === 'all' ? '全部轮次' : peerDate;
    }
  }
  if (state.mode !== 'none' && !comparator && !reason) reason = state.mode === 'city' ? '正在加载比较城市的 CSV。' : '文件中没有另一组可比较的数据；当前组仍可单独查看。';
  if (!current.total || comparator?.total === 0) reason = '当前筛选有一组没有记录；该组比例和两组差值留空，不按 0% 处理。';
  const stats = summary(current, state.threshold), comparison = comparator ? summary(comparator, state.threshold) : null;
  const synthetic = source.evidence_class === 'synthetic';
  const data = {
    version: 'survey-csv-v1', evidence_class: source.evidence_class,
    disclosure: synthetic ? '逐人虚构调研 CSV；不是真实受访者或历史统计。' : '本地导入的调研 CSV；来源、问卷口径与发布权限未核验。',
    plot_title: '每周工作时长分布', chart_disclosure: synthetic ? '逐人虚构调研 · 非真实统计' : '本地调研 CSV · 来源未核验',
    record_label: '调研记录', table_caption: '由当前筛选的逐人 CSV 记录重新分档',
    plot_note: '每组独立计算分母；重访记录不等于独立人物。',
    measure_short: !synthetic ? '每周小时，原始问卷口径未核验' : source.measure === 'fictional_subjective_week' ? '模拟意识体验时间；舱体接入另计' : '每周工作时长；演示值非历史估计'
  };
  const context = `${source.name} · ${dateLabel} · ${state.organization === 'all' ? '所有单位' : state.organization} · ${state.employment === 'all' ? '所有雇佣形式' : employmentLabel(state.employment)}`;
  const overview = source.survey.employments.map(id => {
    const group = seriesFor(source, state, { employment: id }, employmentLabel(id));
    return { id, label: employmentLabel(id), ...summary(group, state.threshold), people: group.people };
  });
  return { data, source, state, current, comparator, stats, comparison, reason, context, dateLabel, overview,
    delta: stats.aboveShare === null || comparison?.aboveShare == null ? null : stats.aboveShare - comparison.aboveShare };
}

export function surveySummaryCsv(view) {
  const quote = value => `"${String(value).replace(/"/g, '""')}"`;
  const rows = [view.current, view.comparator].filter(Boolean).flatMap(series => BUCKETS.map(([bucket], index) => [
    series.city.evidence_class, series.city.name, series.label, series.filters.date, series.filters.organization,
    series.filters.employment === 'all' ? '所有雇佣形式' : employmentLabel(series.filters.employment),
    bucket, series.counts[index], series.total, series.people, view.state.threshold, series.city.measure
  ]));
  return '\uFEFF' + [['数据性质','数据集','比较组','调研时间','单位筛选','雇佣形式筛选','工时档','计数','组内记录数','独立人物数','阈值小时','口径'], ...rows]
    .map(row => row.map(quote).join(',')).join('\r\n') + '\r\n';
}

export function surveyBrief(view) {
  const pct = value => value === null ? '不可用' : value.toFixed(1) + '%';
  const synthetic = view.source.evidence_class === 'synthetic';
  const scopes = [view.current, view.comparator].filter(Boolean).map(series => `<li>${e(series.label)}：${series.total} 条记录，${series.people} 个匿名人物；调研时间 ${e(series.dateLabel ?? view.dateLabel)}。</li>`).join('');
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(view.source.name)} · CSV 调研简报</title>
<style>body{font:16px/1.7 system-ui,"Microsoft YaHei",sans-serif;max-width:900px;margin:36px auto;padding:0 22px;color:#18232b}h1{line-height:1.3}.notice{padding:16px;background:#fff3d8}.figure,.table-wrap{overflow:auto}svg{display:block;width:100%;min-width:840px;height:auto}table{width:100%;min-width:420px;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #d9e0e6;text-align:left}caption{text-align:left;margin:16px 0}footer{border-top:1px solid #ddd;margin-top:30px;padding-top:16px;color:#596673}@media print{svg,table{min-width:0}svg{break-inside:avoid}body{margin:0;font-size:11pt}}</style></head>
<body><p>Open Worktime · 从逐人 CSV 生成的本地简报</p><h1>${e(view.source.name)}：每周工作时长</h1>
<p class="notice"><strong>${synthetic ? '虚构调研演示 · 非真实研究' : '本地导入 · 来源与权限未核验'}</strong><br>${e(view.data.disclosure)}</p>
<p>筛选：${e(view.context)}。比较方式：${e({ employment: '雇佣形式', organization: '单位', date: '调研时间', city: '城市', none: '无比较' }[view.state.mode])}。</p><ul>${scopes}</ul>
<p>A 组 ${view.state.threshold} 小时及以上：${view.stats.aboveCount} / ${view.stats.total} 条，占 ${pct(view.stats.aboveShare)}。${view.delta === null ? '' : `与 B 组相差 ${view.delta > 0 ? '+' : ''}${view.delta.toFixed(1)} 个百分点。`}</p>
${view.reason ? `<p>${e(view.reason)}</p>` : ''}<div class="figure">${distributionSvg(view)}</div><div class="table-wrap">${tableMarkup(view)}</div>
<h2>数据与计算说明</h2><p>${e(view.source.definition)}</p><p>${e(view.source.context)}</p>
<p>一行 = 一个人物在一个调研日期的一条每周工作时长记录。相同编号可以跨日期重访，同日重复记录在导入时拒绝。多轮合计按记录统计，独立人物数另计，不当作独立抽样人数。</p>
<p>从数值工时直接分入固定十档：区间含下界、不含上界；75+ 为开放区间。每组按自己的记录数计算比例，先合计计数再计算占比。空组比例和差值不可用。</p>
<p>${e(EMPLOYMENT_NOTE)} 公司列表示实际工作单位或服务现场，不能由此推定工资由谁支付。岗位不同也不自动决定雇佣关系。</p>
<p>雇佣形式是 CSV 提供的描述分类，不据此认定法律关系。历史与作品样表里的机构及现代分类均为架空演示，不是史实或原作设定。</p>
${view.source.employment_context ? `<p>${e(view.source.employment_context)}</p>` : ''}
${view.source.body_context ? `<p>独立背景：${view.source.body_context.hours} 小时/周的舱体接入设定不进入工作时长分布。</p>` : ''}
<footer>版本 survey-csv-v1 · 数据性质 ${e(view.source.evidence_class)}。${synthetic ? '原创虚构记录 CC0 1.0；不涉及作品权利。' : '导入不建立转载或发布许可。'}<br>本简报不包含逐人编号或原始明细；文件、图表和样本分母均对应当前筛选。</footer></body></html>`;
}
