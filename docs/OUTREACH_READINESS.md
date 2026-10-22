# 首轮邮件推荐准备 · 2026-10-23

判断：值得邀请少量研究者试用并反馈。现在能演示完整的 CSV 导入、用工比较、工时分档和离线简报，足以说明具体用途；是否能节省对方时间，还需要真实使用者验证。首轮定位为工具试用，随后再讨论数据合作。

## 可交付的体验

1. 英文入口 `partners.html#preview` 自动加载虚构汇总样例，无账号、无需安装；只含一个组时不显示多余的选择器。CSV 格式和本地导入按需展开，图表先于格式说明。
2. 中文城市页提供完整样表，支持一键“同单位不同用工”和“同单位跨期”；东京分别为 132 / 42 条和 222 / 222 条，均来自实际样表记录。岗位不参与展示统计或汇总导出。
3. 导出区保留两个常用按钮，其他格式按需展开。离线简报包含图表、计数和筛选范围；原始 CSV 可保留岗位，须与汇总结果区分。

验证：65 项 Node 测试通过；Edge 实测一键比较、简报下载及其中的筛选/人数、390px 手机无横向溢出、英文链接自动加载、本地汇总文件两轮切换、再次点击入口不覆盖本地数据、清空后移除文件与结果。观察期间浏览器存储为空。截图和测试文件位于本地忽略目录 `output/playwright/usability/`，未纳入仓库。

这些验证不能替代真实用户试用、屏幕阅读器测试或正式的隐私审查。

## 发送前还需完成

- **公开新版。** 本次核验时，公开合作页为 HTTP 200，`https://6jingyong.github.io/open-worktime/cities.html` 为 HTTP 404。功能分支推送不会触发仅监听 `main` 的 Pages 部署。发布后应重新检查英文示例、六份 CSV、模板和离线简报的公开地址；本地测试成功不能证明公开站可用。
- **确认署名。** 邮件应由项目负责人的真实账号发送，说明独立项目身份。当前没有机构合作背书或真实品牌/工厂工人工时数据。
- **只承诺已经实现的能力。** 英文汇总预览可独立试用；完整城市分析器和简报目前是中文。不要把它称为已经完整支持英文的研究平台。

已有 ILO 国家均值只作背景，不能证明已取得真实工人工时分布。工具也没有自动执行面向公开发布的小样本抑制；若进入真实数据试点，先约定可用汇总粒度、问卷口径、权限和抑制规则，再讨论公开结果。首封邮件无需索取微观数据或工厂身份映射。

## 建议的首次接触方式

先选 3–5 位与工时调查、劳动研究或数据传播直接相关的对象，每人单独写信。给一个能立即试用的链接，问一个问题：这个视图是否能帮助他们解释现有调研？得到明确兴趣后，再询问现成的问卷、数据字典或获批汇总表。

这一人数和顺序是项目推进建议，尚无转化率证据。第一轮观察能否收到具体使用反馈、是否有人愿意讨论一个小试点，据此决定是否继续投入。

Better Work 的[官方研究页](https://betterwork.org/research/)仍将研究提案和数据请求指向 `research@betterwork.org`，可作为候选入口；这不代表对方同意合作或愿意试用。其[约旦项目页](https://betterwork.org/jordan/our-programme/)仍说明自 2025 年 6 月起因资金削减暂停运营。若进入数据讨论，应询问历史资料及现有条件，不能假定当地仍在持续采集。以上于 2026-10-23 重新核验。

## 英文邮件草稿

状态：供项目负责人审阅，未发送。确认新版公开链接和本人署名后再使用。

候选收件人：Better Work research team · `research@betterwork.org`

Subject: Could this local working-hours preview help your research?

Hello Better Work research team,

I’m building Open Worktime, an independent open-source tool for making weekly working-time distributions easier to explore and explain.

Here is a small English demo using fictional aggregate counts:
https://6jingyong.github.io/open-worktime/partners.html#preview

It runs in the browser without an account. An approved aggregate CSV can be explored locally, without uploading or saving its contents. The sample preserves counts and keeps factory and survey rounds separate.

Would this kind of view be useful for explaining any of your existing research? I would value a brief reaction, especially if a different presentation would be more useful. No data transfer is needed to try the example.

Thank you.

（发送时补上真实姓名及项目身份，不冒用机构或合作关系。）
