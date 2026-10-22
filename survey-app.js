import { MAX_SURVEY_BYTES, EMPLOYMENT, EMPLOYMENT_NOTE, EMPLOYMENT_SOURCES, parseSurveyCsv, recordsCsv, employmentLabel, filterRecords, resolveSurveyState,
  makeSurveyView, sampleViews, distributionSvg, tableMarkup, surveyBrief, surveySummaryCsv } from './survey.mjs';

const $ = selector => document.querySelector(selector);
const text = (selector, value) => { $(selector).textContent = value; };
const pct = value => value === null ? '—' : value.toFixed(1) + '%';
const compact = matchMedia('(max-width:650px)');
const mobileLayout = matchMedia('(max-width:720px)');
let mobileFiltersOpen = false;
const cache = new Map();
let manifest, source, state, view, lastCity = 'hangzhou', request = 0, viewRequest = 0, page = 0;

async function sha256(bytes) {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, '0')).join('');
}

function decode(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error('请将文件另存为 CSV UTF-8 后重试。'); }
}

async function bundled(cityId) {
  if (cache.has(cityId)) return cache.get(cityId);
  const city = manifest.cities.find(item => item.id === cityId);
  if (!city) throw new Error('找不到这座城市的样表。');
  const response = await fetch('./' + city.path);
  if (!response.ok) throw new Error('内置 CSV 加载失败，请重试。');
  const bytes = await response.arrayBuffer();
  if (await sha256(bytes) !== city.sha256) throw new Error('样表内容与数据清单不一致，请刷新后重试。');
  const loaded = { ...city, survey: parseSurveyCsv(decode(bytes)), bytes, fileName: city.path.split('/').at(-1), local: false };
  cache.set(cityId, loaded); return loaded;
}

function locationState() {
  const params = source.local ? new URLSearchParams({ source: 'local' }) : new URLSearchParams(Object.entries(state).filter(([,value]) => value !== null));
  history.replaceState(null, '', location.pathname + location.search + '#' + params);
}

async function setState(patch = {}) {
  const token = ++viewRequest;
  if ((patch.organization !== undefined || patch.mode === 'employment') && patch.compareEmployment === undefined) patch.compareEmployment = '';
  state = resolveSurveyState(source, new URLSearchParams(Object.entries({ ...state, ...patch })));
  page = 0; render(); locationState();
  if (state.mode === 'city') {
    try {
      const peer = await bundled(state.peer);
      if (token === viewRequest) { view = makeSurveyView(source, state, peer); render(false); }
    } catch (error) { if (token === viewRequest) text('#import-status', error.message); }
  }
}

async function selectCity(cityId, params = new URLSearchParams()) {
  const token = ++request; ++viewRequest;
  text('#import-status', '正在读取内置逐人 CSV…');
  try {
    const loaded = await bundled(cityId);
    if (token !== request) return;
    source = loaded; lastCity = cityId; state = resolveSurveyState(source, params);
    if (!manifest.cities.some(item => item.id === state.peer && item.id !== cityId)) state.peer = manifest.cities.find(item => item.id !== cityId).id;
    $('#survey-file').value = ''; $('#import-status').classList.remove('preview-error');
    await setState();
    text('#import-status', '');
  } catch (error) { if (token === request) fail(error); }
}

function fail(error) {
  text('#import-status', error.message); $('#import-status').classList.add('preview-error'); $('#survey-file').value = '';
}

async function importFile(file) {
  if (!file) return;
  const token = ++request; ++viewRequest;
  text('#import-status', '正在本地校验 CSV，文件内容不会上传…');
  try {
    if (file.size > MAX_SURVEY_BYTES) throw new Error('请选择不超过 5 MiB 的 CSV。');
    const bytes = await file.arrayBuffer(), hash = await sha256(bytes), survey = parseSurveyCsv(decode(bytes));
    const known = manifest.cities.find(city => city.sha256 === hash) ?? (manifest.template?.sha256 === hash ? manifest.template : null);
    if (token !== request) return;
    source = {
      id: 'local', name: known ? `${known.name}（导入样表）` : '本地调研文件', fileName: file.name, bytes, survey, local: true,
      evidence_class: known ? 'synthetic' : 'unverified',
      measure: known?.measure ?? 'weekly_hours_unverified',
      definition: known?.definition ?? '工作时长列按每周小时读取；原始问卷定义、来源与发布权限尚未核验。',
      context: known?.context ?? '从所选文件读取匿名编号、调研日期、单位、雇佣形式和数值工时；没有补造或上传记录。',
      body_context: known?.body_context ?? null, setting: known?.setting ?? '本地 CSV · 来源未核验', employment_context: known?.employment_context
    };
    state = resolveSurveyState(source); $('#import-status').classList.remove('preview-error');
    await setState();
    text('#import-status', `已加载 ${file.name}：${survey.records.length} 条记录、${survey.people} 个匿名人物、${survey.dates.length} 个调研日期。${known ? '内容与内置虚构样表完全匹配。' : '文件来源未核验。'}`);
  } catch (error) { if (token === request) fail(error); }
}

function tags(selector, options, value, key) {
  $(selector).replaceChildren(...options.map(item => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'filter-tag';
    button.dataset.filterKey = key; button.dataset.value = String(item.id);
    button.setAttribute('aria-pressed', String(String(item.id) === String(value))); button.disabled = Boolean(item.disabled);
    const label = document.createElement('span'); label.textContent = item.label; button.append(label);
    if (item.count !== undefined) {
      const count = document.createElement('span'); count.className = 'tag-count'; count.textContent = item.count; button.append(count);
      button.classList.toggle('is-empty', item.count === 0);
      button.setAttribute('aria-label', `${item.label}，${item.count} 条记录`);
    }
    if (item.description) button.title = item.description;
    return button;
  }));
}

function counted(values, key) {
  const records = filterRecords(source, state, { [key]:'all' }), counts = new Map();
  for (const row of records) { const value = row[key] ?? ''; counts.set(value, (counts.get(value) ?? 0) + 1); }
  return values.map(([id, label]) => ({ id, label, count:id === 'all' ? records.length : counts.get(id) ?? 0,
    description:key === 'employment' ? EMPLOYMENT.find(item => item.id === id)?.short : undefined }));
}

function employmentGuide() {
  text('#employment-note', EMPLOYMENT_NOTE);
  $('#employment-definitions').replaceChildren(...EMPLOYMENT.map(item => {
    const card = document.createElement('article'), title = document.createElement('h3'), subtitle = document.createElement('strong'), body = document.createElement('p');
    title.textContent = item.label; subtitle.textContent = item.short; body.textContent = item.description;
    card.append(title, subtitle, body); return card;
  }));
  text('#employment-context', source.employment_context ?? '本地问卷中的标签含义需与提供者核对，不能根据工作地点、岗位名称或是否驻场自动判断合同关系。');
  $('#employment-sources').replaceChildren(...EMPLOYMENT_SOURCES.map(item => {
    const link = document.createElement('a'); link.href = item.url; link.textContent = item.title; link.target = '_blank'; link.rel = 'noreferrer'; return link;
  }));
}

function filterDisclosure() {
  $('#toggle-filters').hidden = !mobileLayout.matches;
  $('.city-controls').classList.toggle('filters-collapsed', mobileLayout.matches && !mobileFiltersOpen);
  $('#toggle-filters').setAttribute('aria-expanded', String(!mobileLayout.matches || mobileFiltersOpen));
  text('#toggle-filters', mobileFiltersOpen ? '收起' : '调整');
}

function render(recompute = true) {
  const focused = document.activeElement?.closest('[data-filter-key]');
  const focusKey = focused?.dataset.filterKey, focusValue = focused?.dataset.value;
  if (recompute) view = makeSurveyView(source, state, state.mode === 'city' ? cache.get(state.peer) : null);
  const { survey } = source, { current, comparator, stats, comparison, reason } = view;
  const synthetic = source.evidence_class === 'synthetic';
  $('#observatory').hidden = false;
  $('#city-picker').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(!source.local && button.dataset.city === source.id)));
  text('#dataset-badge', synthetic ? '虚构样表' : '本地 CSV · 未核验');
  text('#dataset-license', synthetic ? '内置虚构样表：CC0 1.0' : '导入数据许可尚未核验');
  text('#dataset-notice', synthetic ? '虚构演示：人物、单位和工时均为创作，非真实统计或作品原设定。' : '本地文件仅在浏览器处理；格式已检查，来源、问卷口径与权限尚未核验。');
  text('#source-name', source.fileName);
  $('#download-source').disabled = false;
  text('#source-meta', `${survey.records.length} 条原始记录 · ${survey.people} 个匿名人物 · ${survey.dates.length} 个调研日期 · ${survey.organizations.length} 个单位`);
  const examples = sampleViews(source);
  $('#sample-shortcuts').hidden = !examples.length;
  $('#sample-shortcuts').replaceChildren(...examples.map(example => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'text-button';
    button.textContent = example.label + ' →'; button.title = example.patch.organization; button.dataset.example = example.id;
    button.addEventListener('click', async () => {
      await setState(example.patch);
      $(`#sample-shortcuts [data-example="${example.id}"]`)?.focus({ preventScroll:true });
    }); return button;
  }));
  $('#clear-local').hidden = !source.local;
  tags('#date-tags', counted([...(state.mode === 'date' ? [] : [['all', '全部日期']]), ...survey.dates.map(date => [date, date])], 'date'), state.date, 'date');
  tags('#organization-tags', counted([...(state.mode === 'organization' ? [] : [['all', '所有单位']]), ...survey.organizations.map(name => [name, name])], 'organization'), state.organization, 'organization');
  tags('#employment-tags', counted([...(state.mode === 'employment' ? [] : [['all', '所有用工标签']]), ...survey.employments.map(id => [id, employmentLabel(id)])], 'employment'), state.employment, 'employment');
  employmentGuide();
  tags('#mode-tags', [['none','单组'],['employment','用工'],['organization','单位'],['date','日期'],['city','城市']].map(([id,label]) => ({ id,label,disabled:id === 'city' && source.local })), state.mode, 'mode');
  tags('#threshold-tags', [50,55,60,65].map(id => ({id,label:`≥ ${id} 小时`})), state.threshold, 'threshold');
  const options = state.mode === 'employment' ? survey.employments.filter(id => id !== state.employment).map(id => [id, employmentLabel(id)])
    : state.mode === 'organization' ? survey.organizations.filter(name => name !== state.organization).map(name => [name, name])
    : state.mode === 'date' ? survey.dates.filter(date => date !== state.date).map(date => [date, date])
    : manifest.cities.filter(city => city.id !== source.id).map(city => [city.id, city.name]);
  const comparisonKey = { employment: 'compareEmployment', organization: 'compareOrganization', date: 'compareDate', city: 'peer' }[state.mode];
  $('#comparison-control').hidden = state.mode === 'none';
  text('#comparison-label', { employment: 'B 组用工标签', organization: 'B 组单位', date: 'B 组调研时间', city: 'B 组城市' }[state.mode] ?? 'B 组');
  const dimension = { employment:'employment', organization:'organization', date:'date' }[state.mode];
  tags('#comparison-tags', options.length ? (dimension ? counted(options, dimension) : options.map(([id,label]) => ({id,label}))) : [{id:'',label:'没有其他组',disabled:true}], comparisonKey ? state[comparisonKey] : '', comparisonKey);
  text('#city-setting', source.setting);
  text('#city-title', source.name);
  text('#city-premise', view.context);
  text('#filter-scope', `${view.dateLabel} · ${state.organization === 'all' ? '所有单位' : state.organization} · ${state.employment === 'all' ? '所有用工标签' : employmentLabel(state.employment)}`);
  text('#measure-definition', source.definition);
  text('#role-definition', `当前图表来自 CSV 原始记录重新分档。${state.date === 'all' ? '当前合计多轮，同一人物可能重复出现。' : '当前只展示一个调研日期。'}`);
  const warnings = [reason];
  if (source.body_context) warnings.push(`独立背景：舱体接入 ${source.body_context.hours} 小时/周，不计入工作时长。`);
  $('#measure-warning').replaceChildren(...warnings.filter(Boolean).map(warning => { const p = document.createElement('p'); p.textContent = warning; return p; }));
  $('#measure-warning').hidden = !warnings.some(Boolean);
  text('#metric-total', String(stats.total));
  text('#metric-people', `${current.people} 个匿名人物`);
  text('#metric-threshold-label', `${state.threshold} 小时及以上`);
  text('#metric-share', pct(stats.aboveShare)); text('#metric-numerator', `${stats.aboveCount} / ${stats.total} 条记录`);
  text('#metric-mode', stats.modes.join('、') || '—');
  text('#metric-delta', view.delta === null ? '—' : `${view.delta > 0 ? '+' : ''}${view.delta.toFixed(1)} pp`);
  text('#metric-comparator', comparator ? `A 组减 B 组；pp = 百分点` : reason || '未选择比较项');
  $('#delta-reference').hidden = !comparator;
  $('#chart').innerHTML = distributionSvg(view, { compact: compact.matches, dense:!compact.matches, showThreshold:false });
  $('#counts-table').innerHTML = tableMarkup(view);
  const scope = `A 组：${current.label}，${stats.total} 条记录 / ${current.people} 人。`;
  text('#computed-note', scope + (comparator ? `B 组：${comparator.label}，${comparison.total} 条 / ${comparator.people} 人${comparator.dateLabel ? `，日期 ${comparator.dateLabel}` : ''}。` : '') + '每组单独计算比例。' + (state.date === 'all' ? ' 多轮结果按记录合计，不代表独立人物的工时分布。' : ''));
  text('#city-context-note', source.context);
  text('#construction-note', synthetic ? manifest.construction : '直接使用导入文件中的原始数值。人物编号按文本保留，同一人物同一天重复行会被拒绝；没有做个人身份、代表性或外部来源验证。');
  const tbody = $('#employment-overview tbody'); tbody.replaceChildren();
  for (const group of view.overview) {
    const row = document.createElement('tr');
    for (const value of [group.label, group.total, group.people, pct(group.aboveShare)]) { const cell = document.createElement('td'); cell.textContent = String(value); row.append(cell); }
    tbody.append(row);
  }
  text('#overview-caption', `当前日期与单位下的全部用工标签；参考工时 ${state.threshold} 小时。${state.date === 'all' ? '各组分别去重，同一人物跨期可能出现在不同组。' : ''}`);
  renderRecords(); attachTooltips();
  text('#app-status', `已更新：${view.context}，A 组 ${stats.total} 条记录。`);
  text('#export-status', ''); $('#chart-tooltip').hidden = true;
  document.title = `${source.name} · CSV 调研观察 · Open Worktime`;
  if (focusKey) [...document.querySelectorAll('[data-filter-key]')].find(button => button.dataset.filterKey === focusKey && button.dataset.value === focusValue)?.focus({ preventScroll:true });
}

function renderRecords() {
  const records = view.current.records, start = page * 25;
  const tbody = $('#record-table tbody'); tbody.replaceChildren();
  for (const record of records.slice(start, start + 25)) {
    const row = document.createElement('tr');
    for (const value of [record.id, record.date, record.organization, employmentLabel(record.employment), record.hours]) {
      const cell = document.createElement('td'); cell.textContent = String(value); row.append(cell);
    }
    tbody.append(row);
  }
  text('#record-page', records.length ? `${start + 1}–${Math.min(start + 25, records.length)} / ${records.length} 条（A 组）` : '当前筛选没有记录');
  $('#records-prev').disabled = page === 0;
  $('#records-next').disabled = start + 25 >= records.length;
}

function attachTooltips() {
  const tooltip = $('#chart-tooltip');
  $('#chart').querySelectorAll('[data-tip]').forEach(mark => {
    const show = () => {
      tooltip.textContent = mark.dataset.tip; tooltip.hidden = false;
      const box = mark.getBoundingClientRect();
      tooltip.style.left = Math.max(12, Math.min(box.left, innerWidth - tooltip.offsetWidth - 12)) + 'px';
      tooltip.style.top = Math.max(12, Math.min(box.top - tooltip.offsetHeight - 10, innerHeight - tooltip.offsetHeight - 12)) + 'px';
      mark.setAttribute('aria-describedby', 'chart-tooltip');
    };
    const hide = () => { tooltip.hidden = true; mark.removeAttribute('aria-describedby'); };
    mark.addEventListener('mouseenter', show); mark.addEventListener('focus', show);
    mark.addEventListener('mouseleave', hide); mark.addEventListener('blur', hide);
    mark.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
  });
}

function download(contents, type, fileName) {
  const url = URL.createObjectURL(new Blob([contents], { type })), link = document.createElement('a');
  link.href = url; link.download = fileName; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  text('#export-status', `已在本地生成 ${fileName}。`);
}

async function boot() {
  try {
    const response = await fetch('./data/survey-manifest.json');
    if (!response.ok) throw new Error('CSV 样表清单加载失败。');
    manifest = await response.json();
    if (manifest.version !== 'fictional-surveys-v1') throw new Error('CSV 清单版本不兼容。');
    const params = new URLSearchParams(location.hash.slice(1));
    lastCity = manifest.cities.some(city => city.id === params.get('city')) ? params.get('city') : 'hangzhou';
    for (const city of manifest.cities) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'city-card'; button.dataset.city = city.id; button.title = city.setting;
      for (const [tag, value, className] of [['span', city.number, 'city-number'], ['span', city.name, 'city-name']]) {
        const item = document.createElement(tag); item.textContent = value; item.className = className; button.append(item);
      }
      button.addEventListener('click', () => selectCity(city.id)); $('#city-picker').append(button);
    }
    $('#survey-file').addEventListener('change', event => importFile(event.target.files[0]));
    $('#choose-file').addEventListener('click', () => $('#survey-file').click());
    $('#clear-local').addEventListener('click', () => selectCity(lastCity));
    $('#observatory').addEventListener('click', event => {
      const button = event.target.closest('button[data-filter-key]');
      if (button && !button.disabled && button.getAttribute('aria-pressed') !== 'true') setState({ [button.dataset.filterKey]:button.dataset.value });
    });
    $('#filter-reset').addEventListener('click', () => { state = resolveSurveyState(source); setState(); });
    $('#toggle-filters').addEventListener('click', () => { mobileFiltersOpen = !mobileFiltersOpen; filterDisclosure(); });
    mobileLayout.addEventListener('change', filterDisclosure); filterDisclosure();
    $('#open-employment-guide').addEventListener('click', () => $('#employment-guide-dialog').showModal());
    $('#close-employment-guide').addEventListener('click', () => $('#employment-guide-dialog').close());
    $('#records-prev').addEventListener('click', () => { page -= 1; renderRecords(); });
    $('#records-next').addEventListener('click', () => { page += 1; renderRecords(); });
    $('#download-source').addEventListener('click', () => download(source.bytes, 'text/csv;charset=utf-8', source.fileName));
    const name = suffix => `open-worktime-${source.evidence_class}-${source.local ? 'local' : source.id}.${suffix}`;
    $('#export-brief').addEventListener('click', () => download(surveyBrief(view), 'text/html;charset=utf-8', name('html')));
    $('#export-svg').addEventListener('click', () => download(distributionSvg(view), 'image/svg+xml;charset=utf-8', name('svg')));
    $('#export-csv').addEventListener('click', () => download(surveySummaryCsv(view), 'text/csv;charset=utf-8', name('summary.csv')));
    $('#export-records').addEventListener('click', () => download(recordsCsv(view.current.records), 'text/csv;charset=utf-8', name('records.csv')));
    $('#copy-view').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        const localAddress = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
        text('#export-status', source.local ? '已复制页面链接。导入文件与筛选不会随链接传递，重新打开时需再次选择文件。'
          : localAddress ? '已复制筛选视图链接。此地址仅供本机使用；对外分享可下载离线简报。' : '已复制筛选视图链接，打开即可恢复当前示例与比较条件。');
      }
      catch { text('#export-status', '可直接复制地址栏链接；本地导入文件不会随链接传递。'); }
    });
    compact.addEventListener('change', () => { if (view) { $('#chart').innerHTML = distributionSvg(view, { compact: compact.matches, dense:!compact.matches, showThreshold:false }); attachTooltips(); } });
    window.addEventListener('scroll', () => { $('#chart-tooltip').hidden = true; }, { passive: true });
    window.addEventListener('hashchange', () => {
      if (location.hash === '#observatory') { $('#observatory').tabIndex = -1; $('#observatory').focus({ preventScroll: true }); locationState(); return; }
      const next = new URLSearchParams(location.hash.slice(1));
      if (next.get('source') !== 'local') selectCity(next.get('city') || lastCity, next);
    });
    if (params.get('source') === 'local') {
      text('#import-status', '本地导入文件不会保存，也不会随链接传递。请重新选择 CSV，或点击一座城市加载虚构样表。');
    } else await selectCity(lastCity, params);
  } catch (error) { text('#load-error', error.message); $('#load-error').hidden = false; }
}

boot();
