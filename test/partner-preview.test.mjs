import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUCKETS, MAX_CSV_BYTES, previewAggregates } from '../partner-preview.mjs';

const example = readFileSync(new URL('../docs/examples/partner-aggregate-example.csv', import.meta.url), 'utf8');
const header = 'anonymous_factory_id,survey_round,weekly_hours_bucket,count';
const groupCsv = (factory, round, count = 1) => BUCKETS.map(([id]) => `${factory},${round},${id},${count}`).join('\n');

test('the existing example yields the original count distribution, without synthetic workers', () => {
  const [group] = previewAggregates(example);
  assert.equal(group.factory, 'J-042');
  assert.equal(group.round, '2024-R1');
  assert.equal(group.total, 100);
  assert.deepEqual(group.buckets.map(bucket => bucket.count), [3, 4, 8, 14, 21, 25, 15, 7, 2, 1]);
});

test('factories and survey rounds stay separate, including delimiter-like IDs', () => {
  const groups = previewAggregates([header, groupCsv('A', 'R1', 2), groupCsv('A', 'R2', 3), groupCsv('A:R1', 'R2', 4)].join('\n'));
  assert.deepEqual(groups.map(group => [group.factory, group.round, group.total]), [['A', 'R1', 20], ['A', 'R2', 30], ['A:R1', 'R2', 40]]);
});

test('spreadsheet UTF-8 BOM, CRLF, reordered headers, commas and escaped quotes work', () => {
  const csv = '\uFEFFcount,survey_round,weekly_hours_bucket,anonymous_factory_id\r\n' +
    BUCKETS.map(([id]) => `2,R1,${id},"A,""B"""`).join('\r\n');
  const [group] = previewAggregates(csv);
  assert.equal(group.factory, 'A,"B"');
  assert.equal(group.total, 20);
});

test('missing and suppressed buckets never silently become zero', () => {
  assert.throws(() => previewAggregates([header, 'A,R1,lt_35,10'].join('\n')), /all ten buckets/);
  assert.throws(() => previewAggregates(example.replace('lt_35,3', 'lt_35,')), /whole number/);
  assert.throws(() => previewAggregates(example.replace('lt_35,3', 'lt_35,<5')), /whole number/);
  assert.equal(previewAggregates([header, groupCsv('A', 'R1', 0)].join('\n'))[0].total, 0);
});

test('duplicate buckets, unknown buckets and overlapping rows are rejected', () => {
  assert.throws(() => previewAggregates(example + '\nJ-042,2024-R1,lt_35,3'), /repeated bucket/);
  assert.throws(() => previewAggregates(example.replace('lt_35', '0_40')), /bucket code/);
});

test('only the minimal aggregate columns are accepted', () => {
  for (const csv of [example.replace('count', 'email'), example.replace('count', 'count,name'), example.replace('count', 'survey_round'), example.replace('lt_35,3', 'lt_35,3,extra')]) {
    assert.throws(() => previewAggregates(csv), /four columns|four cells/);
  }
});

test('counts reject percentages, weights, negatives, unsafe numbers and total overflow', () => {
  for (const count of ['-1', '2.5', '30%', 'NaN', 'Infinity', '1e3', '9007199254740992']) {
    assert.throws(() => previewAggregates(example.replace('lt_35,3', `lt_35,${count}`)), /whole number/);
  }
  assert.throws(() => previewAggregates(example.replace('lt_35,3', 'lt_35,9007199254740991')), /total is too large/);
});

test('empty, malformed and oversized CSVs fail with usable messages', () => {
  for (const csv of ['', header, example.replace('J-042', '"J-042'), example.replace('J-042', 'J"042'), example.replace('J-042', '"J"042')]) {
    assert.throws(() => previewAggregates(csv));
  }
  assert.throws(() => previewAggregates('x'.repeat(MAX_CSV_BYTES + 1)), /1 MiB/);
  assert.throws(() => previewAggregates(example.replace('J-042', '')), /anonymous factory ID/);
});
