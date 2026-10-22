// Original, deterministic fictional counts. No historical or survey data is used.
import { writeFileSync } from 'node:fs';

const cities = [
  {
    id: 'alexandria', name: '亚历山大里亚', english: 'Alexandria', setting: '希腊化时期 · 历史氛围创作',
    motif: '港口、作坊与纸草', number: '01',
    premise: '把港口的忙碌写进一周：同一座城，作坊、码头与文书的时间分布可以很不一样。',
    pressure: '船期集中到来的假想一周；让部分记录移入更长工时档，观察分布怎样变化。',
    definition: '情景角色在一个假想七天周期中的实际劳动时间，按现代小时计。', measure: 'fictional_actual_week',
    context: '借用希腊化时期亚历山大里亚的题材。职业、样本和时间均为作者编排，不是古代劳动制度的复原。',
    sources: [{ title: 'OpenStax · The Hellenistic Era', url: 'https://openstax.org/books/world-history-volume-1/pages/6-3-the-hellenistic-era', note: '仅用于时代背景，不是数字来源。' }],
    roles: [
      ['craft', '陶器与纸草作坊', [3,7,14,25,30,23,13,7,3,1], 0.30],
      ['logistics', '码头转运', [1,3,7,12,20,23,17,10,5,2], 0.40],
      ['clerical', '文书抄录', [6,12,18,20,14,8,4,2,1,0], 0.15]
    ]
  },
  {
    id: 'hangzhou', name: '杭州', english: 'Hangzhou', setting: '《大明王朝1566》· 剧作氛围创作',
    motif: '织机、账房与交期', number: '02',
    premise: '给一个虚构织坊安排两种交期：总记录数不变，时间却在不同角色之间重新分配。',
    pressure: '假设织坊遇到赶织交期，制作角色的右移比例高于账房角色；这是可审查的创作规则。',
    definition: '情景角色在一个假想七天周期中的实际劳动时间，按现代小时计。', measure: 'fictional_actual_week',
    context: '借用用户指定电视剧的杭州题材。没有采用史料或剧中数字，也不对应具体人物或真实织坊。', sources: [],
    roles: [
      ['craft', '丝织坊', [1,3,8,15,26,29,20,11,5,2], 0.55],
      ['logistics', '运河转运', [3,6,12,20,24,18,10,5,2,0], 0.30],
      ['clerical', '商号账房', [5,11,19,22,13,7,3,0,0,0], 0.20]
    ]
  },
  {
    id: 'london', name: '伦敦', english: 'London', setting: '工业革命时期 · 历史氛围创作',
    motif: '蒸汽、车间与钟声', number: '03',
    premise: '让车间、码头和账房进入同一张图，看看城市汇总怎样掩盖不同角色的时间差异。',
    pressure: '编排一个订单集中的假想一周。这里的分布变化不代表任何历史事件或工厂法的影响。',
    definition: '情景角色在一个假想七天周期中的实际劳动时间，按现代小时计。', measure: 'fictional_actual_week',
    context: '使用工业革命时期伦敦的题材。所有工时与职业构成都是演示假设，不是英国历史工时估计。', sources: [],
    roles: [
      ['craft', '纺织车间', [0,1,2,5,10,18,30,25,15,8], 0.35],
      ['logistics', '码头装卸', [1,2,4,8,15,20,24,17,8,3], 0.40],
      ['clerical', '厂务账房', [3,8,15,21,20,12,7,3,1,0], 0.10]
    ]
  },
  {
    id: 'tokyo', name: '东京', english: 'Tokyo', setting: '昭和后期 · 历史氛围创作',
    motif: '流水线、办公室与末班车', number: '04',
    premise: '把车间与办公室并排观察：在这套创作设定里，两类角色的长尾会在压力周拉开。',
    pressure: '假设制作与文书角色在交付高峰中承受不同幅度的时间变化；不据此概括日本劳动文化。',
    definition: '情景角色在一个假想七天周期中的实际劳动时间，按现代小时计。', measure: 'fictional_actual_week',
    context: '借用昭和后期东京的题材。未使用真实日本统计、企业资料或加班调查，通勤不计入劳动时间。', sources: [],
    roles: [
      ['craft', '装配车间', [2,6,18,30,26,16,9,5,2,0], 0.45],
      ['logistics', '城市配送', [3,6,12,20,22,18,11,6,2,0], 0.30],
      ['clerical', '事务办公室', [1,3,9,17,25,27,21,13,6,2], 0.50]
    ]
  },
  {
    id: 'scrapyard', name: '废铁城', english: 'Scrapyard', setting: '《铳梦》· 作品氛围创作',
    motif: '废件、修缮与天空', number: '05',
    premise: '以废铁城的题材想象劳动：修复、回收和协调的时间如何分布？这里只回答创作设定中的问题。',
    pressure: '假设回收与修缮需求同时增加。变动来自作者的右移规则，不是漫画里的工时设定。',
    definition: '情景角色在一个假想七天周期中的实际劳动时间，按现代小时计。', measure: 'fictional_actual_week',
    context: '“废铁城 / Scrapyard”借自《铳梦》题材。岗位与全部数字为独立创作，不是原作设定资料。',
    sources: [{ title: 'Kodansha · Battle Angel Alita', url: 'https://kodansha.us/series/battle-angel-alita/', note: '出版社作品介绍，仅用于作品背景，不是数字来源。' }],
    roles: [
      ['craft', '废件修复', [1,2,4,8,14,19,24,22,14,12], 0.20],
      ['logistics', '回收转运', [2,3,5,9,14,20,20,16,11,10], 0.30],
      ['clerical', '委托协调', [6,8,14,18,19,13,9,6,4,3], 0.10]
    ]
  },
  {
    id: 'matrix', name: '母体', english: 'The Matrix', setting: '《黑客帝国》· 缸中之脑思想实验',
    motif: '意识、工作日与舱体', number: '06',
    premise: '意识体验到的工作，与身体接入系统的时间，是同一个指标吗？用两层口径演示为什么不能随意合并数字。',
    pressure: '只调整模拟意识体验到的劳动时间；舱体接入仍单列为背景设定，不进入工时分布。',
    definition: '角色在模拟意识中体验到的一个假想七天周期的劳动时间；不是身体实际劳动时间。', measure: 'fictional_subjective_week',
    context: '用户指定的母体／缸中之脑创作场景。与其他五城的“实际劳动时间”口径不同，跨城差值不计算。',
    body_context: { hours: 168, label: '舱体接入时间', note: '额外假设一周 7 × 24 小时持续接入。不是工时调查，不计入劳动时间，也不归入 75+ 档。' },
    sources: [{ title: 'Warner Bros. · The Matrix', url: 'https://www.warnerbros.com/movies/matrix', note: '作品入口；本页口径与数字为作者思想实验，并非电影提供的统计。' }],
    roles: [
      ['craft', '模拟修缮岗', [2,6,18,36,22,10,4,1,1,0], 0.20],
      ['logistics', '模拟服务岗', [4,8,20,28,21,11,5,2,1,0], 0.20],
      ['clerical', '模拟办公室', [3,10,24,38,17,6,2,0,0,0], 0.20]
    ]
  }
];

const dataset = {
  version: 'fictional-cities-v1', authored_on: '2026-10-20', evidence_class: 'synthetic',
  title: '六座城的虚构劳动周',
  disclosure: '全部数值是为演示功能编写的合成数据。没有真实受访者，不是历史统计、作品原设定或机构研究结果。',
  count_license: 'CC0-1.0',
  rights_note: 'CC0 仅适用于本项目原创的合成计数。作品名称和世界观的引用不改变原权利归属；未使用作品图片或台词。',
  bucket_ids: ['lt_35','35_40','40_45','45_50','50_55','55_60','60_65','65_70','70_75','gte_75'],
  roles: [{ id: 'craft', label: '制作与修缮' }, { id: 'logistics', label: '运输与服务' }, { id: 'clerical', label: '文书与协调' }],
  rounds: [{ id: 'baseline', label: '常态情景' }, { id: 'pressure', label: '压力情景' }],
  construction: '常态计数逐档手工编写；压力情景把每档 floor(计数 × 该角色 transfer_fraction) 条记录右移一档，75+ 保留。总记录数不变。没有随机抽样、个人微观记录或现实校准。',
  cities: cities.map(city => ({
    ...city,
    roles: city.roles.map(([id, label, baseline, fraction]) => {
      const pressure = baseline.map((count, index) => count - (index < 9 ? Math.floor(count * fraction) : 0)
        + (index > 0 ? Math.floor(baseline[index - 1] * fraction) : 0));
      return { id, label, transfer_fraction: fraction, counts: { baseline, pressure } };
    })
  }))
};

writeFileSync(new URL('../data/city-scenarios.json', import.meta.url), `${JSON.stringify(dataset, null, 2)}\n`);
console.log('Wrote six original fictional city scenarios; no external worker data was used.');
