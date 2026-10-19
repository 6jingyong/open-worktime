import { MAX_CSV_BYTES, previewAggregates } from './partner-preview.mjs';

const sampleButton = document.querySelector('#preview-example');
const fileInput = document.querySelector('#preview-file');
const clearButton = document.querySelector('#preview-clear');
const status = document.querySelector('#preview-status');
const result = document.querySelector('#preview-result');
const groupSelect = document.querySelector('#preview-group');
const body = document.querySelector('#preview-rows');
let groups = [], request = 0;

function clear({ keepFile = false } = {}) {
  request += 1;
  groups = [];
  if (!keepFile) fileInput.value = '';
  groupSelect.replaceChildren();
  body.replaceChildren();
  document.querySelector('#preview-total').textContent = '';
  result.hidden = true;
  status.classList.remove('preview-error');
}

function render() {
  const group = groups[Number(groupSelect.value)];
  body.replaceChildren();
  document.querySelector('#preview-total').textContent = group.total === 0
    ? 'n = 0 · no observations; percentages are unavailable'
    : `n = ${group.total.toLocaleString('en')} · unweighted sample count for this factory and round`;
  for (const bucket of group.buckets) {
    const row = document.createElement('tr');
    const label = document.createElement('th');
    label.scope = 'row'; label.textContent = bucket.label;
    const count = document.createElement('td'); count.textContent = bucket.count.toLocaleString('en');
    const share = document.createElement('td');
    const percent = group.total ? bucket.count / group.total * 100 : null;
    share.textContent = percent === null ? '—' : `${percent.toFixed(1)}%`;
    const barCell = document.createElement('td'); barCell.className = 'preview-bar-cell';
    barCell.setAttribute('aria-hidden', 'true');
    const bar = document.createElement('span'); bar.className = 'preview-bar';
    bar.style.width = `${percent ?? 0}%`; barCell.append(bar);
    row.append(label, count, share, barCell); body.append(row);
  }
}

function show(text, isExample) {
  groups = previewAggregates(text);
  groups.forEach((group, index) => {
    const option = document.createElement('option');
    option.value = String(index); option.textContent = `${group.factory} · ${group.round}`;
    groupSelect.append(option);
  });
  status.textContent = isExample
    ? 'Fictional example · not Better Work data. No real factory, worker or brand claim.'
    : 'Local file preview · not uploaded, saved or published. Source and publication permission have not been verified.';
  document.querySelector('#preview-groups-note').textContent = `${groups.length} factory / round group(s). Each is shown separately; rounds are never pooled.`;
  render(); result.hidden = false;
}

function fail(error) {
  fileInput.value = '';
  result.hidden = true;
  status.classList.add('preview-error');
  status.textContent = error.message;
}

sampleButton.addEventListener('click', async () => {
  clear(); const current = request;
  status.textContent = 'Loading the fictional example…';
  try {
    const response = await fetch('./docs/examples/partner-aggregate-example.csv');
    if (!response.ok) throw new Error('The example could not load. Try again, or download the example CSV and select it locally.');
    const text = await response.text();
    if (current === request) show(text, true);
  } catch (error) { if (current === request) fail(error); }
});

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  clear({ keepFile: true }); const current = request;
  if (!file) { status.textContent = 'No file selected. Try the example to see how it works.'; return; }
  status.textContent = 'Reading the CSV in this browser…';
  try {
    if (file.size > MAX_CSV_BYTES) throw new Error('Choose a CSV smaller than 1 MiB for this small preview.');
    const text = await file.text();
    if (current === request) show(text, false);
  } catch (error) { if (current === request) fail(error); }
});

groupSelect.addEventListener('change', render);
clearButton.addEventListener('click', () => {
  clear(); status.textContent = 'Preview cleared. No file data is kept in browser storage.';
});
