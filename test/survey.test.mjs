import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { MAX_SURVEY_BYTES, parseSurveyCsv, recordsCsv, dateKey, resolveSurveyState, makeSurveyView, surveySummaryCsv, surveyBrief, distributionSvg } from '../survey.mjs';
import { parseCsv } from '../imports/lib.mjs';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('data/survey-manifest.json', root), 'utf8'));
const sourceFor = id => {
  const entry = manifest.cities.find(city => city.id === id);
  return { ...entry, survey: parseSurveyCsv(readFileSync(new URL(entry.path, root), 'utf8')) };
};
const hangzhou = sourceFor('hangzhou');
const header = '人物序号,调研时间,公司,雇佣形式,工作时长';
const viewFor = values => makeSurveyView(hangzhou, resolveSurveyState(hangzhou, new URLSearchParams(values)));

test('six bundled CSVs match their manifest and contain 300 independent fictional people over two rounds', () => {
  assert.equal(manifest.cities.length, 6);
  for (const entry of manifest.cities) {
    const bytes = readFileSync(new URL(entry.path, root));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
    const parsed = parseSurveyCsv(bytes.toString('utf8'));
    assert.equal(parsed.records.length, 600);
    assert.equal(parsed.people, 300);
    assert.equal(parsed.dates.length, 2);
    assert.equal(parsed.employments.length, 5);
    assert.equal(parsed.hasOccupations, true);
    assert.ok(parsed.records.every(row => row.id.startsWith('DEMO-')));
    assert.ok(parsed.records.every(row => row.occupation));
    assert.ok(parsed.organizations.some(name => new Set(parsed.records.filter(row => row.organization === name).map(row => row.employment)).size >= 4));
  }
});

test('fixed five-column CSV roundtrips IDs, quoted company names, numeric hours and employment aliases', () => {
  const original = parseSurveyCsv('\uFEFFweekly_hours,organization,respondent_id,survey_date,employment_type\r\n42.5,"工坊,""甲""",0001,2026-10-01,self_employed\r\n');
  assert.equal(original.records[0].id, '0001');
  assert.equal(original.records[0].organization, '工坊,"甲"');
  assert.equal(original.records[0].hours, 42.5);
  const roundtrip = parseSurveyCsv(recordsCsv(original.records));
  assert.deepEqual(roundtrip.records, original.records);
});

test('duplicate people within one date are rejected, while revisits remain records of one person', () => {
  const row = '001,2026-10-01,示例农庄,自雇,40';
  assert.throws(() => parseSurveyCsv([header, row, row.replace('农庄', '工坊')].join('\n')), /同一人物序号/);
  const survey = parseSurveyCsv([header, row, row.replace('10-01', '11-01')].join('\n'));
  assert.equal(survey.people, 1);
  assert.equal(survey.records.length, 2);
});

test('CSV errors report the original physical row and never accept missing or extra fields', () => {
  assert.throws(() => parseSurveyCsv(header + '\n\n001,2026-10-01,工坊,自雇,\n'), /第 3 行/);
  assert.throws(() => parseSurveyCsv(header + ',姓名\n001,2026-10-01,工坊,自雇,40,某人'), /五列/);
  assert.throws(() => parseSurveyCsv(header + '\n001,2026-10-01,工坊,自雇,40,多余'), /五个单元格/);
  assert.throws(() => parseSurveyCsv(header + '\n001,2026-10-01,"工坊,自雇,40'), /引号没有闭合/);
  assert.throws(() => parseSurveyCsv('x'.repeat(MAX_SURVEY_BYTES + 1)), /5 MiB/);
});

test('only valid weekly hours, dates and known employment classifications are accepted', () => {
  for (const hours of ['-1','169','NaN','Infinity','8小时','40-50','']) {
    assert.throws(() => parseSurveyCsv(`${header}\n001,2026-10-01,工坊,自雇,${hours}`), /工作时长/);
  }
  assert.throws(() => parseSurveyCsv(`${header}\n001,2026-02-30,工坊,自雇,40`), /日期不存在/);
  assert.throws(() => parseSurveyCsv(`${header}\n001,2026-10-01,工坊,自雇吧,40`), /雇佣形式/);
  assert.ok(dateKey('前200-06-01') < dateKey('1566-06-01'));
  assert.doesNotThrow(() => dateKey('2024-02-29'));
});

test('raw numeric values are bucketed at exact boundaries without rounding or midpoint reconstruction', () => {
  const hours = [0,34.999,35,39.99,40,44.99,45,49.99,50,54.99,55,59.99,60,64.99,65,69.99,70,74.99,75,168];
  const survey = parseSurveyCsv([header, ...hours.map((value, index) => `${index},2026-10-01,工坊,自雇,${value}`)].join('\n'));
  const source = { id:'test', name:'测试', measure:'weekly_hours_unverified', evidence_class:'unverified', survey, local:true };
  const view = makeSurveyView(source, resolveSurveyState(source));
  assert.deepEqual(view.current.counts, [2,2,2,2,2,2,2,2,2,2]);
  assert.equal(view.stats.aboveCount, 10);
});

test('default view uses the latest single date and all records rather than pooling repeat respondents', () => {
  const view = viewFor({});
  assert.equal(view.state.date, '1566-09-01');
  assert.equal(view.current.total, 300);
  assert.equal(view.current.people, 300);
  const pooled = viewFor({ date:'all' });
  assert.equal(pooled.current.total, 600);
  assert.equal(pooled.current.people, 300);
});

test('Hangzhou fixture includes the requested institutions and multiple employment forms in one factory', () => {
  assert.ok(hangzhou.survey.organizations.includes('淳安农户'));
  assert.ok(hangzhou.survey.organizations.includes('杭州府衙'));
  assert.ok(hangzhou.survey.organizations.includes('江南制造局'));
  const view = viewFor({ organization:'江南制造局', mode:'employment', employment:'direct_contract', compareEmployment:'labor_dispatch' });
  assert.equal(view.current.total, 72);
  assert.equal(view.comparator.total, 24);
  assert.ok(view.current.records.every(row => row.organization === '江南制造局' && row.employment === 'direct_contract'));
  assert.ok(view.comparator.records.every(row => row.organization === '江南制造局' && row.employment === 'labor_dispatch'));
});

test('employment, organization and date comparison change only their named dimension', () => {
  const employment = viewFor({ mode:'employment', employment:'self_employed', compareEmployment:'direct_contract' });
  assert.equal(employment.current.total, 72);
  assert.equal(employment.comparator.total, 132);
  const organizations = viewFor({ mode:'organization', organization:'杭州府衙', compareOrganization:'江南制造局', employment:'direct_contract' });
  assert.equal(organizations.current.total, 24);
  assert.equal(organizations.comparator.total, 72);
  const dates = viewFor({ mode:'date', date:'1566-06-01', compareDate:'1566-09-01', employment:'self_employed' });
  assert.equal(dates.current.total, 72);
  assert.equal(dates.comparator.total, 72);
  assert.equal(dates.current.people, 72);
});

test('zero-record combinations show undefined percentages rather than manufactured zero rates', () => {
  const view = viewFor({ mode:'employment', organization:'淳安农户', employment:'self_employed', compareEmployment:'direct_contract' });
  assert.equal(view.comparator.total, 0);
  assert.equal(view.comparison.aboveShare, null);
  assert.equal(view.delta, null);
  assert.match(view.reason, /没有记录/);
});

test('subjective Matrix hours do not become actual work, and unverified imports cannot compare to fiction', () => {
  const matrix = sourceFor('matrix');
  const state = resolveSurveyState(matrix, new URLSearchParams('mode=city&peer=hangzhou'));
  const view = makeSurveyView(matrix, state, hangzhou);
  assert.equal(view.comparator, null);
  assert.match(view.reason, /口径不同/);
  const local = { ...hangzhou, local:true, evidence_class:'unverified', measure:'weekly_hours_unverified' };
  assert.notEqual(resolveSurveyState(local, new URLSearchParams('mode=city')).mode, 'city');
});

test('exports describe current filters and data classification, and raw filtered CSV can be reimported', () => {
  const view = viewFor({ organization:'江南制造局', mode:'employment', employment:'direct_contract', compareEmployment:'labor_dispatch', threshold:'60' });
  const raw = parseSurveyCsv(recordsCsv(view.current.records));
  assert.equal(raw.records.length, 72);
  assert.ok(raw.records.every(row => row.organization === '江南制造局'));
  const rows = parseCsv(surveySummaryCsv(view));
  assert.equal(rows.length, 20);
  assert.ok(rows.every(row => row['数据性质'] === 'synthetic' && row['阈值小时'] === '60'));
  assert.equal(rows[0]['雇佣形式筛选'], '直接雇佣');
  assert.equal(rows[10]['雇佣形式筛选'], '劳务派遣');
  const organizations = viewFor({ mode:'organization', organization:'杭州府衙', compareOrganization:'江南制造局', employment:'direct_contract' });
  const organizationRows = parseCsv(surveySummaryCsv(organizations));
  assert.equal(organizationRows[0]['单位筛选'], '杭州府衙');
  assert.equal(organizationRows[10]['单位筛选'], '江南制造局');
  const brief = surveyBrief(view);
  assert.match(brief, /江南制造局/);
  assert.match(brief, /逐人 CSV/);
  assert.match(brief, /虚构调研演示/);
  assert.doesNotMatch(brief, /DEMO-HZ|<script|<link/);
});

test('local imported data is never silently relabeled synthetic in figures or briefs', () => {
  const local = { ...hangzhou, id:'local', name:'本地调研文件', local:true, evidence_class:'unverified', measure:'weekly_hours_unverified' };
  const view = makeSurveyView(local, resolveSurveyState(local));
  assert.match(distributionSvg(view), /来源未核验/);
  assert.match(distributionSvg(view), /unverified/);
  assert.doesNotMatch(distributionSvg(view), /虚构情景演示/);
  assert.match(surveyBrief(view), /来源与权限未核验/);
});

test('optional occupation columns roundtrip without inventing occupations for five-column imports', () => {
  const five = parseSurveyCsv(`${header}\n0001,2026-10-01,工坊,直接雇佣,40`);
  assert.equal(five.hasOccupations, false);
  assert.equal(five.records[0].occupation, undefined);
  assert.doesNotMatch(recordsCsv(five.records), /岗位/);
  const six = parseSurveyCsv('occupation,respondent_id,survey_date,organization,employment_type,weekly_hours\n产品设计师,0001,2026-10-01,工坊,direct_contract,42.5\n,0002,2026-10-01,工坊,labor_dispatch,44');
  assert.equal(six.hasOccupations, true);
  assert.deepEqual(six.occupations, ['', '产品设计师']);
  assert.deepEqual(parseSurveyCsv(recordsCsv(six.records)).records, six.records);
  assert.throws(() => parseSurveyCsv(`${header},姓名\n0001,2026-10-01,工坊,直接雇佣,40,某人`), /岗位/);
  const local = { ...hangzhou, survey:five };
  assert.equal(resolveSurveyState(local, new URLSearchParams('mode=occupation')).mode, 'none');
});

test('Tokyo workplace mixes the requested roles and relationships within a single factory', () => {
  const tokyo = sourceFor('tokyo');
  const factory = makeSurveyView(tokyo, resolveSurveyState(tokyo, new URLSearchParams({organization:'帝国电子厂'})));
  assert.equal(factory.current.total, 222);
  const count = (occupation, employment) => factory.current.records.filter(row => row.occupation === occupation && row.employment === employment).length;
  assert.equal(count('产品设计师','direct_contract'), 24);
  assert.equal(count('流水线工人','direct_contract'), 72);
  assert.equal(count('流水线工人','labor_dispatch'), 42);
  assert.equal(count('现场工程师','direct_contract'), 24);
  assert.equal(count('现场工程师','onsite_service'), 18);
  assert.equal(count('保安','labor_outsource'), 18);
  assert.ok(factory.current.records.filter(row => row.occupation === '产品设计师').every(row => row.employment === 'direct_contract'));
  assert.equal(factory.workforce, undefined);
  assert.match(tokyo.employment_context, /1978.*1986/);
});

test('legacy occupation filters are discarded instead of secretly narrowing employment groups', () => {
  const tokyo = sourceFor('tokyo');
  const state = resolveSurveyState(tokyo, new URLSearchParams({organization:'帝国电子厂', occupation:'流水线工人', mode:'employment', employment:'direct_contract', compareEmployment:'labor_dispatch'}));
  const view = makeSurveyView(tokyo, state);
  assert.equal(view.current.total,132);
  assert.equal(view.comparator.total,42);
  assert.ok([...view.current.records,...view.comparator.records].every(row => row.organization === '帝国电子厂' && row.date === '1978-09-01'));
  assert.ok(view.current.records.some(row => row.occupation === '产品设计师'));
  assert.equal(view.overview.find(row => row.id === 'direct_contract').total,132);
  assert.equal(view.overview.find(row => row.id === 'labor_dispatch').total,42);
  assert.equal(view.state.occupation,undefined);
  assert.equal(view.state.compareOccupation,undefined);
  assert.equal(view.workforce,undefined);
  assert.doesNotMatch(surveySummaryCsv(view), /岗位筛选/);
  assert.doesNotMatch(surveyBrief(view), /流水线工人/);
  assert.deepEqual(parseSurveyCsv(recordsCsv(view.current.records)).records, view.current.records);
});

test('occupations remain in raw CSV but never enter aggregate exports or saved comparison state', () => {
  const sensitive = 'PRIVATE_UNIQUE_OCCUPATION_712';
  const survey = parseSurveyCsv(`${header},岗位\n001,2026-10-01,工坊,直接雇佣,40,${sensitive}\n002,2026-10-01,工坊,直接雇佣,50,另一岗位\n003,2026-10-01,工坊,劳务派遣,60,另一岗位`);
  const source = { id:'local',name:'本地文件',survey,local:true,evidence_class:'unverified',measure:'weekly_hours_unverified',definition:'每周小时',context:'本地调研' };
  const state = { ...resolveSurveyState(source),mode:'occupation',occupation:sensitive,compareOccupation:'另一岗位' };
  const view = makeSurveyView(source,state);
  assert.equal(view.current.total,3);
  assert.equal(view.state.mode,'none');
  assert.equal(view.comparator,null);
  assert.equal(view.state.occupation,undefined);
  assert.match(recordsCsv(view.current.records),new RegExp(sensitive));
  for (const output of [surveySummaryCsv(view),surveyBrief(view),distributionSvg(view)]) {
    assert.doesNotMatch(output,new RegExp(`${sensitive}|另一岗位|occupation|岗位筛选`));
  }
});
