import { validateDataset, resolveView, makeView, distributionSvg, tableMarkup, briefHtml, csvExport } from './city-demo.mjs';

const $ = selector => document.querySelector(selector);
const text = (selector, value) => { $(selector).textContent = value; };
const pct = value => value === null ? '—' : `${value.toFixed(1)}%`;
const compactChart = matchMedia('(max-width: 650px)');
let data, state, view;

function option(value, label) {
  const item = document.createElement('option'); item.value = value; item.textContent = label; return item;
}

function syncLocation() {
  const params = new URLSearchParams(Object.entries(state).map(([key, value]) => [key, String(value)]));
  history.replaceState(null, '', `${location.pathname}${location.search}#${params}`);
}

function update(patch = {}) {
  const params = new URLSearchParams(Object.entries({ ...state, ...patch }).map(([key, value]) => [key, String(value)]));
  state = resolveView(data, params);
  render(); syncLocation();
}

function render() {
  view = makeView(data, state);
  const { current, comparator, stats, comparison, delta, reason } = view;
  const city = current.city;
  $('#city-picker').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.city === state.city)));
  $('#round-select').value = state.round;
  $('#role-select').value = state.role;
  $('#mode-select').value = state.mode;
  $('#threshold-select').value = String(state.threshold);
  $('#peer-select').replaceChildren(...data.cities.filter(item => item.id !== city.id).map(item => option(item.id, item.name)));
  $('#peer-select').value = state.peer;
  $('#peer-control').hidden = state.mode !== 'city';
  text('#city-setting', city.setting);
  text('#city-title', `${city.name}的一周`);
  text('#city-premise', city.premise);
  text('#measure-definition', city.definition);
  text('#role-definition', `当前角色：${current.roles.map(role => role.label).join('、')}。均为创作分类。`);
  const warnings = [reason];
  if (city.body_context) warnings.push(`${city.body_context.label}：${city.body_context.hours} 小时 / 周（单列背景）。${city.body_context.note}`);
  $('#measure-warning').replaceChildren(...warnings.filter(Boolean).map(warning => {
    const p = document.createElement('p'); p.textContent = warning; return p;
  }));
  $('#measure-warning').hidden = !warnings.some(Boolean);
  text('#metric-total', stats.total.toLocaleString('zh-CN'));
  text('#metric-threshold-label', `${state.threshold} 小时及以上`);
  text('#metric-share', pct(stats.aboveShare));
  text('#metric-numerator', `${stats.aboveCount} / ${stats.total} 条合成记录`);
  text('#metric-mode', stats.modes.length ? stats.modes.join('、') : '—');
  text('#metric-delta', delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} pp`);
  text('#metric-comparator', comparator ? `对比 ${comparator.label}；pp = 百分点` : reason ? '口径不同，不计算差值' : '没有比较项');
  $('#chart').innerHTML = distributionSvg(view, { compact: compactChart.matches });
  $('#counts-table').innerHTML = tableMarkup(view);
  const note = comparator
    ? `在这组创作数据中，${current.label}有 ${pct(stats.aboveShare)} 的记录达到 ${state.threshold} 小时；${comparator.label}为 ${pct(comparison.aboveShare)}。两组共用角色筛选，各自计算分母。`
    : `在这组创作数据中，${current.label}有 ${pct(stats.aboveShare)} 的记录达到 ${state.threshold} 小时。${reason || '这一视图只描述当前组。'}`;
  text('#computed-note', note);
  text('#city-context-note', city.context);
  text('#pressure-note', `压力情景假设：${city.pressure}`);
  text('#construction-note', `${data.construction} 当前角色的右移比例：${current.roles.map(role => `${role.label} ${(role.transfer_fraction * 100).toFixed(0)}%`).join('；')}。`);
  $('#background-sources').replaceChildren();
  for (const source of city.sources) {
    const p = document.createElement('p'); p.className = 'source-background';
    const a = document.createElement('a'); a.href = source.url; a.textContent = source.title; a.target = '_blank'; a.rel = 'noreferrer';
    p.append(a, document.createTextNode(` · ${source.note}`)); $('#background-sources').append(p);
  }
  $('#observatory').hidden = false;
  text('#app-status', `已更新：${current.label}，${stats.total} 条合成记录。${comparator ? `比较 ${comparator.label}。` : reason}`);
  text('#export-status', '');
  $('#chart-tooltip').hidden = true;
  document.title = `${city.name}的一周 · Open Worktime 虚构演示`;
  attachTooltips();
}

function attachTooltips() {
  const tooltip = $('#chart-tooltip');
  $('#chart').querySelectorAll('[data-tip]').forEach(mark => {
    const show = () => {
      tooltip.textContent = mark.dataset.tip; tooltip.hidden = false;
      const box = mark.getBoundingClientRect(), width = tooltip.getBoundingClientRect().width;
      tooltip.style.left = `${Math.max(12, Math.min(box.left, innerWidth - width - 12))}px`;
      tooltip.style.top = `${Math.max(12, Math.min(box.top - tooltip.offsetHeight - 10, innerHeight - tooltip.offsetHeight - 12))}px`;
      mark.setAttribute('aria-describedby', 'chart-tooltip');
    };
    const hide = () => { tooltip.hidden = true; mark.removeAttribute('aria-describedby'); };
    mark.addEventListener('mouseenter', show); mark.addEventListener('focus', show);
    mark.addEventListener('mouseleave', hide); mark.addEventListener('blur', hide);
    mark.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
  });
}

function download(contents, type, suffix) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a'); link.href = url;
  link.download = `open-worktime-synthetic-${state.city}-${state.round}-${state.role}.${suffix}`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  text('#export-status', `已生成 ${suffix.toUpperCase()}，保留当前视图与虚构标记。文件在本地生成。`);
}

async function boot() {
  try {
    const response = await fetch('./data/city-scenarios.json');
    if (!response.ok) throw new Error('合成数据加载失败。请通过本地服务打开页面后重试。');
    data = validateDataset(await response.json());
    state = resolveView(data, new URLSearchParams(location.hash.slice(1)));
    data.cities.forEach(city => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'city-card'; button.dataset.city = city.id;
      const number = document.createElement('span'); number.className = 'city-number'; number.textContent = city.number;
      const setting = document.createElement('small'); setting.textContent = city.setting;
      const name = document.createElement('strong'); name.textContent = city.name;
      const motif = document.createElement('span'); motif.className = 'motif'; motif.textContent = city.motif;
      button.append(number, setting, name, motif);
      button.addEventListener('click', () => update({ city: city.id })); $('#city-picker').append(button);
    });
    $('#round-select').replaceChildren(...data.rounds.map(round => option(round.id, round.label)));
    $('#role-select').replaceChildren(option('all', '所有角色'), ...data.roles.map(role => option(role.id, role.label)));
    for (const [id, key] of [['round-select', 'round'], ['role-select', 'role'], ['mode-select', 'mode'], ['peer-select', 'peer'], ['threshold-select', 'threshold']]) {
      $(`#${id}`).addEventListener('change', event => update({ [key]: event.target.value }));
    }
    $('#reset-view').addEventListener('click', () => { state = resolveView(data); update(); });
    $('#export-svg').addEventListener('click', () => download(distributionSvg(view), 'image/svg+xml;charset=utf-8', 'svg'));
    $('#export-csv').addEventListener('click', () => download(csvExport(view), 'text/csv;charset=utf-8', 'csv'));
    $('#export-brief').addEventListener('click', () => download(briefHtml(view), 'text/html;charset=utf-8', 'html'));
    $('#copy-view').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(location.href); text('#export-status', '已复制当前视图链接。链接指向当前本地服务，需能访问这台电脑才能打开。'); }
      catch { text('#export-status', '浏览器未允许写入剪贴板；可以复制地址栏中的当前视图链接。'); }
    });
    window.addEventListener('hashchange', () => {
      if (location.hash === '#observatory') {
        $('#observatory').tabIndex = -1; $('#observatory').focus({ preventScroll: true }); syncLocation(); return;
      }
      state = resolveView(data, new URLSearchParams(location.hash.slice(1))); render();
    });
    window.addEventListener('scroll', () => { $('#chart-tooltip').hidden = true; }, { passive: true });
    compactChart.addEventListener('change', () => {
      $('#chart').innerHTML = distributionSvg(view, { compact: compactChart.matches }); attachTooltips();
      $('#chart-tooltip').hidden = true;
    });
    render(); syncLocation();
  } catch (error) {
    text('#load-error', `演示暂时无法打开：${error.message}`); $('#load-error').hidden = false;
    text('#app-status', '数据加载失败。'); console.error(error);
  }
}

boot();
