# Area survey pilot

This is a fallback acquisition path for Open Worktime when brand/factory-level external data is unavailable or slow to obtain.

The pilot asks about **work city + employment relationship + broad role + weekly hours**, without requiring a brand or factory.

It is designed to be easy to recreate in Wenjuanxing or another questionnaire service.

## Purpose

The pilot answers a narrower question:

> In a given city, what does the actual weekly working-time distribution look like across different manufacturing employment relationships?

It is useful for validating real collection and regional comparisons, but it must not be presented as brand-level evidence.

## Minimal questionnaire

### 1. Work city

Chinese label:

> 你目前工作的城市是？

Guidance:

> 请填写工作所在地级市/直辖市，例如“上海”“苏州”“深圳”。不要填写家庭住址、园区地址或精确定位。

Required free-text field.

### 2. Employment relationship

Chinese label:

> 你与实际工作单位的雇佣关系更接近哪一种？

Options:

- 直接劳动合同 → `direct_contract`
- 劳务派遣 → `labor_dispatch`
- 劳务外包 / 外包驻场 → `labor_outsource`
- 售后 / 服务人员驻场 → `onsite_service`
- 不确定 / 其他 → `other_unknown`

### 3. Broad work role

Chinese label:

> 你的工作类型更接近哪一种？

Options:

- 一线生产 / 装配 → `manufacturing_frontline`
- 质检、设备、仓储、生产支持 → `manufacturing_support`
- 管理岗位 → `management`
- 销售岗位 → `sales`
- 总部 / 职能岗位 → `corporate_function`
- 不确定 / 其他 → `other_unknown`

Do not ask for exact job title.

### 4. High-income relevance flag

Chinese label:

> 你的总收入是否大约达到当地普通全职劳动者收入的 5 倍或以上？

Options:

- 否 → `no`
- 是 → `yes`
- 不确定 / 不愿判断 → `unknown`

Do not collect exact salary.

### 5. Average actual weekly hours

Chinese label:

> 过去四个完整周里，你平均每周实际工作多久？

Guidance:

> 包括实际加班时间；不要只填写合同工时。如果四周差异很大，请按四周平均情况选择最接近的一档。

Options:

- 少于 35 小时 → `lt_35`
- 35–<40 小时 → `35_40`
- 40–<45 小时 → `40_45`
- 45–<50 小时 → `45_50`
- 50–<55 小时 → `50_55`
- 55–<60 小时 → `55_60`
- 60–<65 小时 → `60_65`
- 65–<70 小时 → `65_70`
- 70–<75 小时 → `70_75`
- 75 小时及以上 → `gte_75`

## Recommended opening copy

> Open Worktime 是一个开源公益项目，希望了解不同地区制造业劳动者真实的每周工作时间分布。本问卷不要求填写姓名、手机号、公司名称、精确工资或家庭住址。当前试运行只统计工作城市、雇佣关系、岗位大类和工时区间。
>
> 数据仅用于生成群体分布，不用于识别个人，也不对企业或个人进行道德评分。

## Fields intentionally excluded

Do not ask for:

- name;
- mobile number / email;
- employee ID;
- exact employer or factory in this pilot;
- exact job title;
- exact salary;
- home address;
- factory street address;
- GPS/location permission;
- free-text complaint narrative;
- document/photo uploads.

The first pilot should prefer low information richness over perfect segmentation.

## Export contract

Map questionnaire exports into `schema/area-survey-submission.schema.json`:

```json
{
  "schema_version": "area-survey-v1",
  "country": "CN",
  "work_city": "苏州",
  "employment_type": "labor_dispatch",
  "work_role": "manufacturing_frontline",
  "high_income_5x": "no",
  "weekly_hours_bucket": "55_60",
  "period_basis": "last_4_complete_weeks"
}
```

Questionnaire-platform metadata such as account IDs, IP addresses, device IDs, precise location, invitation identifiers or contact details must not be included in the public Open Worktime dataset.

## Analysis rule

Reuse the existing manufacturing-relevance role weights:

- frontline / manufacturing support: `1.0`;
- management: `0.25`;
- sales / corporate function: `0`;
- unknown role: `0.5`;
- `high_income_5x = yes` caps weight at `0.25`.

Employment identity itself does not reduce weight.

The primary pilot cuts are:

```text
city × weekly-hours distribution
city × employment_type × weekly-hours distribution
```

Role is mainly a relevance control, not a headline leaderboard.

## Launch threshold

Do not over-design the pilot before launch.

A useful first milestone is simply enough responses to see whether several cities produce non-empty distributions. Small groups should be suppressed from public display until a privacy threshold is chosen.

The long-term next step remains adding brand/factory identity once participation and collection quality are proven.
