// Browser-only preview contract. Deliberately separate from publication/import permission.
export const MAX_CSV_BYTES = 1024 * 1024;
export const BUCKETS = [
  ['lt_35', '<35'], ['35_40', '35–<40'], ['40_45', '40–<45'],
  ['45_50', '45–<50'], ['50_55', '50–<55'], ['55_60', '55–<60'],
  ['60_65', '60–<65'], ['65_70', '65–<70'], ['70_75', '70–<75'], ['gte_75', '75+']
];
const HEADERS = ['anonymous_factory_id', 'survey_round', 'weekly_hours_bucket', 'count'];

function csvRows(text) {
  const rows = [];
  let row = [], field = '', quoted = false, closed = false;
  const addField = () => { row.push(field); field = ''; closed = false; };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') { quoted = false; closed = true; }
      else field += ch;
    } else if (ch === ',') {
      addField();
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      addField(); rows.push(row); row = [];
    } else if (ch === '"') {
      if (field || closed) throw new Error('Invalid CSV quotes. Export again as a comma-separated CSV.');
      quoted = true;
    } else {
      if (closed) throw new Error('Unexpected text after a CSV quote. Export again as a comma-separated CSV.');
      field += ch;
    }
  }
  if (quoted) throw new Error('An opening CSV quote has no closing quote. Export the CSV again.');
  if (field || row.length || closed) { addField(); rows.push(row); }
  return rows.filter(values => values.some(value => value.trim() !== ''));
}

export function previewAggregates(text) {
  if (new TextEncoder().encode(text).length > MAX_CSV_BYTES) {
    throw new Error('Choose a CSV smaller than 1 MiB for this small preview.');
  }
  const [header, ...rows] = csvRows(text.replace(/^\uFEFF/, ''));
  const headers = header?.map(value => value.trim());
  if (!headers || headers.length !== HEADERS.length || new Set(headers).size !== HEADERS.length ||
      !HEADERS.every(name => headers.includes(name))) {
    throw new Error('Use only the four columns in the example CSV. Other formats can be discussed by email; no conversion is needed to start a conversation.');
  }
  if (!rows.length) throw new Error('The CSV has no count rows. Start with the example CSV.');
  const groups = new Map();
  rows.forEach((values, index) => {
    const rowNumber = index + 2;
    if (values.length !== headers.length) throw new Error(`Row ${rowNumber}: expected four cells. Check commas and quotes.`);
    const get = name => values[headers.indexOf(name)].trim();
    const factory = get('anonymous_factory_id'), round = get('survey_round');
    if (![factory, round].every(value => value && value.length <= 120 && !/[\u0000-\u001f\u007f]/.test(value))) {
      throw new Error(`Row ${rowNumber}: provide a short anonymous factory ID and survey round, without line breaks.`);
    }
    const bucket = get('weekly_hours_bucket'), rawCount = get('count');
    if (!BUCKETS.some(([id]) => id === bucket)) throw new Error(`Row ${rowNumber}: use a bucket code from the example CSV.`);
    if (!/^\d+$/.test(rawCount) || !Number.isSafeInteger(Number(rawCount))) {
      throw new Error(`Row ${rowNumber}: count must be a non-negative whole number, not a percentage or weighted estimate.`);
    }
    const key = JSON.stringify([factory, round]);
    if (!groups.has(key)) groups.set(key, { factory, round, counts: new Map(), total: 0 });
    const group = groups.get(key);
    if (group.counts.has(bucket)) throw new Error(`Row ${rowNumber}: repeated bucket for the same factory and round. Check for duplicate or overlapping rows.`);
    group.counts.set(bucket, Number(rawCount));
    group.total += Number(rawCount);
    if (!Number.isSafeInteger(group.total)) throw new Error('A sample total is too large to display accurately. Use a smaller extract.');
  });
  return [...groups.values()].map((group, index) => {
    if (group.counts.size !== BUCKETS.length) {
      throw new Error(`Group ${index + 1}: include all ten buckets. Use 0 only for a known zero; missing or suppressed counts cannot be treated as zero.`);
    }
    return { factory: group.factory, round: group.round, total: group.total,
      buckets: BUCKETS.map(([id, label]) => ({ id, label, count: group.counts.get(id) })) };
  });
}
