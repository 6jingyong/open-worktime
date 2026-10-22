// Independent fictional respondents, not expanded from the previous aggregate fixture.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseSurveyCsv, recordsCsv, resolveSurveyState, makeSurveyView, surveyBrief } from '../survey.mjs';

const settings = JSON.parse(readFileSync(new URL('../data/city-scenarios.json', import.meta.url), 'utf8'));
const definitions = {
  alexandria: { prefix: 'ALX', dates: ['前200-06-01','前200-09-01'], profiles: [
    ['港口自营作坊','自营手艺人','self_employed',72,47,10,3],
    ['纸草工坊','造纸工','direct_contract',48,48,8,4], ['纸草工坊','抄写员','direct_contract',24,42,7,2],
    ['纸草工坊','造纸工','labor_dispatch',12,49,9,3], ['纸草工坊','搬运工','labor_dispatch',24,51,10,4],
    ['纸草工坊','守门人','labor_outsource',12,44,8,-1], ['纸草工坊','搬运工','labor_outsource',12,50,10,2],
    ['纸草工坊','器具修理匠','onsite_service',18,43,9,1],
    ['王室文书署','文书','direct_contract',30,39,7,2], ['郊外租作农庄','佃作农人','labor_outsource',48,53,11,6]
  ] },
  hangzhou: { prefix: 'HZ', dates: ['1566-06-01','1566-09-01'], profiles: [
    ['淳安农户','自营农人','self_employed',72,46,11,6], ['淳安佃作农庄','佃作农人','labor_outsource',36,51,11,7],
    ['杭州府衙','官差','direct_contract',18,44,9,3], ['杭州府衙','文书','direct_contract',6,40,6,2],
    ['杭州府衙','院落看护','labor_outsource',6,43,8,0],
    ['江南制造局','织工','direct_contract',48,52,9,5], ['江南制造局','机修匠','direct_contract',12,47,9,3],
    ['江南制造局','账房','direct_contract',12,42,7,2], ['江南制造局','织工','labor_dispatch',24,54,10,4],
    ['江南制造局','机修匠','onsite_service',12,46,10,4], ['江南制造局','护院','labor_outsource',12,45,8,-1],
    ['江南制造局','货运工','labor_outsource',6,51,10,4], ['通运镖局','镖师','direct_contract',24,50,13,5],
    ['织机维修行','机修匠','direct_contract',12,43,10,2]
  ] },
  london: { prefix: 'LDN', dates: ['1840-06-01','1840-09-01'], profiles: [
    ['泰晤士自营修缮铺','自营修缮匠','self_employed',60,51,11,2],
    ['河岸纺织厂','纺织工','direct_contract',84,61,10,4], ['河岸纺织厂','机修工','direct_contract',18,55,10,3],
    ['河岸纺织厂','事务员','direct_contract',12,44,7,2], ['河岸纺织厂','纺织工','labor_dispatch',36,59,11,5],
    ['河岸纺织厂','门卫','labor_outsource',12,48,9,0], ['河岸纺织厂','清洁工','labor_outsource',12,43,9,-1],
    ['河岸纺织厂','机修工','onsite_service',18,50,11,4],
    ['码头转运公司','搬运工','direct_contract',24,56,12,3], ['郊区承包农庄','农务工','labor_outsource',24,51,11,5]
  ] },
  tokyo: { prefix: 'TKY', dates: ['1978-06-01','1978-09-01'], profiles: [
    ['帝国电子厂','产品设计师','direct_contract',24,44,8,3],
    ['帝国电子厂','流水线工人','direct_contract',72,45,9,5], ['帝国电子厂','流水线工人','labor_dispatch',42,46,10,4],
    ['帝国电子厂','现场工程师','direct_contract',24,46,9,4], ['帝国电子厂','现场工程师','onsite_service',18,44,10,2],
    ['帝国电子厂','保安','labor_outsource',18,44,8,-1], ['帝国电子厂','保洁员','labor_outsource',12,38,7,0],
    ['帝国电子厂','仓储员','direct_contract',12,44,9,3],
    ['街区自营商铺','自营店主','self_employed',32,45,12,1], ['街区自营商铺','自营修理师','self_employed',16,42,10,-2],
    ['城市配送承包社','配送员','labor_outsource',30,48,11,3]
  ] },
  scrapyard: { prefix: 'SCR', dates: ['2530-06-01','2530-09-01'], profiles: [
    ['废铁城自营修复摊','自营修复师','self_employed',72,55,14,4],
    ['地面零件工坊','装配工','direct_contract',60,59,11,5], ['地面零件工坊','机修师','direct_contract',18,53,10,3],
    ['地面零件工坊','协调员','direct_contract',12,44,8,1], ['地面零件工坊','装配工','labor_dispatch',42,58,12,4],
    ['地面零件工坊','搬运工','labor_dispatch',12,62,13,5], ['地面零件工坊','警卫','labor_outsource',18,52,10,-1],
    ['地面零件工坊','清洁工','labor_outsource',18,48,10,2], ['地面零件工坊','义体维修师','onsite_service',24,49,12,4],
    ['回收承包站','回收分拣工','labor_outsource',24,57,12,3]
  ] },
  matrix: { prefix: 'MTX', dates: ['1999-06-01','1999-09-01'], profiles: [
    ['模拟自营维修铺','自营维修师','self_employed',48,42,10,1],
    ['模拟办公室','软件开发员','direct_contract',60,43,8,3], ['模拟办公室','文书','direct_contract',36,39,7,2],
    ['模拟办公室','IT 工程师','direct_contract',24,42,9,4], ['模拟办公室','文书','labor_dispatch',36,40,8,1],
    ['模拟办公室','IT 工程师','labor_dispatch',12,43,9,2], ['模拟办公室','保洁员','labor_outsource',24,37,8,-1],
    ['模拟办公室','保安','labor_outsource',12,43,9,0], ['模拟办公室','IT 工程师','onsite_service',24,42,10,3],
    ['模拟市政事务所','市政文书','direct_contract',24,39,7,1]
  ] }
};

mkdirSync(new URL('../data/surveys/', import.meta.url), { recursive: true });
const manifest = { version: 'fictional-surveys-v1', evidence_class: 'synthetic', authored_on: '2026-10-20',
  revision: 'mixed-workplaces-v2', organization_definition: '实际工作单位或服务现场，不必是劳动合同中的雇主。',
  construction: '以实际工作单位为范围，独立设定岗位 × 用工标签的人数和基准工时；同一岗位可有多种关系。两项确定性偏移相加形成个体差异，少量记录增加延时；第二轮变化按岗位群组设置，也可能持平或下降。数值仅为创作，不是对某类用工工时更长的预判。没有使用或扩展任何真实或旧版汇总记录。', cities: [] };

for (const city of settings.cities) {
  const specification = definitions[city.id], records = [];
  for (let round = 0; round < specification.dates.length; round += 1) {
    let person = 0;
    specification.profiles.forEach(([organization, occupation, employment, count, base, spread, change], profileIndex) => {
      for (let index = 0; index < count; index += 1) {
        person += 1;
        const offset = (index * 17 + profileIndex * 11) % (spread + 1) + (index * 7 + profileIndex * 3) % (spread + 1) - spread;
        const hours = base + offset + (index % 13 === 0 ? 4 : 0) + (index % 4 === 0 ? 0.5 : 0) + (round ? change + index % 5 - 2 : 0);
        records.push({ id: `DEMO-${specification.prefix}-${String(person).padStart(4, '0')}`, date: specification.dates[round], organization, occupation, employment, hours });
      }
    });
  }
  const csv = recordsCsv(records), survey = parseSurveyCsv(csv);
  const path = `data/surveys/${city.id}.synthetic.csv`;
  writeFileSync(new URL(`../${path}`, import.meta.url), csv, 'utf8');
  const context = city.id === 'hangzhou'
    ? '按照用户设定，淳安农户、佃作农庄、杭州府衙、江南制造局、通运镖局与织机维修行同时进入架空杭州。江南制造局等机构名及现代雇佣分类只作跨时代演示，不是对1566年制度的复原。'
    : `${city.context} 样表中的单位、人物、调研日期和雇佣分类均为新编架空资料。`;
  const entry = { id: city.id, name: city.name, setting: city.setting, motif: city.motif, number: city.number,
    path, evidence_class: 'synthetic', sha256: createHash('sha256').update(csv).digest('hex'), rows: survey.records.length,
    people: survey.people, dates: survey.dates, measure: city.measure, definition: city.definition,
    context, body_context: city.body_context ?? null, sources: city.sources,
    employment_context: city.id === 'tokyo'
      ? '东京样表保留1978年的时代氛围；日本《劳动者派遣法》于1986年7月施行，因此这里的“劳务派遣”是后世工作关系的架空映射，不表示1978年已有相同制度。现代日本的“派遣”与“请负”可分别帮助理解接收单位指挥、承包商组织服务的差别，不能与中国分类作法律等同。帝国电子厂为虚构厂名。'
      : '中文用工标签用于跨情境对照：历史样表按直接工作、经中介安排、承包服务、设备商驻场等关系作架空映射。不同地区与年代的制度不等同；驻场售后优先标记服务场景，不重复计入外包组。',
    profiles: specification.profiles.map(([organization, occupation, employment, count, base, spread, change]) => ({ organization, occupation, employment, people: count, baseline_hours: base, spread_hours: spread, second_round_change: change })) };
  manifest.cities.push(entry);
}
const template = recordsCsv([
  { id: '001', date: '2026-10-01', organization: '示例自营农庄', employment: 'self_employed', hours: 46 },
  { id: '002', date: '2026-10-01', organization: '示例工坊', employment: 'direct_contract', hours: 52.5 },
  { id: '003', date: '2026-10-01', organization: '示例工坊', employment: 'labor_dispatch', hours: 61 },
  { id: '004', date: '2026-10-01', organization: '示例承包农庄', employment: 'labor_outsource', hours: 58 },
  { id: '005', date: '2026-10-01', organization: '示例工坊', employment: 'onsite_service', hours: 43 },
  { id: '001', date: '2026-11-01', organization: '示例自营农庄', employment: 'self_employed', hours: 55 },
  { id: '002', date: '2026-11-01', organization: '示例工坊', employment: 'direct_contract', hours: 60 }
]);
writeFileSync(new URL('../docs/examples/survey-template.csv', import.meta.url), template);
manifest.template = { name: '五列 CSV 模板', evidence_class:'synthetic', path:'docs/examples/survey-template.csv',
  sha256:createHash('sha256').update(template).digest('hex'), measure:'fictional_actual_week',
  definition:'用于说明格式的虚构每周工时。', context:'五列模板中的编号、单位、日期和工时都是格式演示值。', setting:'虚构 CSV 模板' };
writeFileSync(new URL('../data/survey-manifest.json', import.meta.url), JSON.stringify(manifest, null, 2) + '\n');
const sample = manifest.cities.find(city => city.id === 'hangzhou');
const source = { ...sample, survey: parseSurveyCsv(readFileSync(new URL(`../${sample.path}`, import.meta.url), 'utf8')) };
writeFileSync(new URL('../docs/examples/fictional-city-brief.html', import.meta.url), surveyBrief(makeSurveyView(source, resolveSurveyState(source))));
console.log(`Generated ${manifest.cities.length} independent fictional survey CSVs, 600 rows and 300 anonymous characters per city, plus the five-column template and brief.`);
