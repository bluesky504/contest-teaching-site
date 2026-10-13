# 基础探测收口记录

更新日期：2026-10-08。当前登记状态见下一节；基础实跑、限时审查和2026-10-07内置对手阶段的历史记录保留在后文。

## 2026-10-08 当前登记状态

用户分别批准的两轮受控手工修复已经完成：陷阱004/005与API关联修复严格五文件，p9不足样本与陷阱002修复严格三文件。最新全套230项：229通过、1条件性跳过、0失败；引用、完整性、补测离线复算及差异检查通过。旧版红灯均已验证，事实和原始观测未重测或覆盖。

| 登记项 | 当前状态 | 持久入口 |
| --- | --- | --- |
| 004/005 | 已批准、已修、本地验收通过；p8定向31项通过 | `docs/guides/003-pitfall-fix-proposal.md` |
| p9/002 | 已批准、已修；p9定向20项通过，护盾六个证据行号核对通过 | `docs/guides/003-final-offline-fix-proposal.md` |
| 17项Task | 仍只有T003-1/2/3勾选；元数据校正为total 17、completed 3，status保留in-progress | `changes/active/003-mechanics-probe/03-tasks.md`、`.change.yaml` |
| 历史通过与决策 | T003-5/7/10/17保留历史pass记录；T003-4提交边界按D-003-2登记，不改历史报告 | `docs/guides/003-acceptance-reconciliation.md` |
| 暂缓与复验缺口 | T003-9按D-003-4暂缓；T003-11/12仍reviewer_unavailable；缺最终报告项仍未正式验收 | 同上逐项表 |

**收口不是正式独立复验通过。** 本次只同步维护者状态，不新增Task勾选、不伪填pass、不修改旧审查JSON、不归档或提交推送，也不重新启动长审查。completed 3表示现有勾选数量，不表示仅实现了3项；不要据其余14项未勾选重新跑全套基础探测。

有效补测仍在`data/maps/mages-might/2026-10-08/`，实际页面为2027联盟；2026历史facts未覆盖，跨版本等价未证明，精确土盾自然期限仍unknown。已有事实可用于保留这些边界的策略对照实验；下一实质阶段是JS果农数量与治疗时机优化，不必强等003归档，但实验和提交推送仍分别取得授权。本次状态登记没有开展该实验。

## 2026-10-08 基础实跑收口

本轮按用户要求优先完成基础探测，暂停胜率优化。实际比赛页为「AI世青赛全国(2027)联盟」的 `mages-might`，只运行、不评分、不读取对手源码。先系统阅读「提示 → 简介」，相克基准为火克土、水克火、土克水；费用、攻击威力和持续字段不混用。全文核对见 `docs/guides/battle-intro-reading.md`。

**本轮有效数据入口**：`data/maps/mages-might/2026-10-08/facts.json` 与同目录 `README.md`、`manifest.json`、`raw/`。历史 `data/seasons/2026-aiyouth/mages-might/facts.json` 未修改，避免把实际2027联盟观测直接覆盖成2026历史事实。有效快照的继承项保留原出处，不能把它们说成本轮重新实测，也未证明两赛季版本完全一致。

| 项目 | 实跑收口结果 | 证据范围 |
| --- | --- | --- |
| 护盾矩阵 | 27格均有配对来源，当前23格、历史4格；原先18个缺样格均取得当前补测证据 | 球类部分只有单样本；同时命中的不可分样本、加时流血、终局清场、缺失状态被排除。9999是实体耐久变化，不是英雄伤害 |
| 元素与种类 | 已测箭、光束、球的阻挡/耐久规则一致：克制扣1、同元素扣2、被克穿透且英雄受全额威力 | 有限27格的历史/当前混合证据，不外推到任意技能或所有版本 |
| 场地时限与平局 | `world.ended`、实际/最大1800帧、dt=0.1，双方末帧存活；当前源码绑定的同一完整世界最终目标均为incomplete，本地对局按平局分类 | 代码、网络、加载、审查器超时不算平局；没有提交评分，服务端排名计分未验证 |
| 果农自然死亡 | 无攻击对照中均衡采集82次、土系采集66次掉血均为归队入账同帧减1；血量耗尽可在双方英雄存活时独立死亡 | 与历史fire-burn致死配对并存，不能把所有旧果农死亡统一归因成敌方魔法或归队磨损 |
| 加时与果农 | 英雄在t>120同步持续掉血；上述控制中的果农负变化仍只见归队减1，未观察同频额外流血 | 是受控观测结果，不是内部所有机制不存在的证明 |
| 土盾自然寿命 | 单次施放后13.6至179.9秒满耐久连续存在，实测下界166.3秒 | 局末截断，没有自然到期事件；精确期限或永久性仍unknown，不为消掉unknown无限重跑 |
| API/采集/特殊法术 | 继承前阶段已校验的JS接口、果实生长/采集、fire-burn/water-refresh、earth-grow与错误检测证据 | 未再次穷举隐藏API；stamina不可读保留为接口边界，而非内部机制不存在 |

累计26次基础采样中25次可信、1次无效时限尝试保留但不纳入结论。有效快照180个叶子：measured 156、estimated 21、doc 2、unknown 1，最后一个为精确土盾自然期限。当前23格与历史4格的逐项出处见快照 `_supplement.publications`。

2026-10-08全套本地回归共206项：205通过、1条件性跳过、0失败；日志为 `docs/reports/003/foundation-closeout-tests-20261008.log`。历史引用校验、新压缩原始行号校验、有效快照完整性和全量离线复算通过，错误与警告均为0。原2026历史facts和默认策略哈希未变，对战锁已释放，未提交评分。

完整原始JSONL按原字节gzip持久保存（原文27,915,563字节，压缩1,512,356字节），不只保留摘要；引用按解压后行号解析。`manifest.json`记录原文、压缩、简介、有效facts、生成说明和历史facts的SHA-256。离线校验会重算所有可信对局、逐帧配对、控制结果与来源引用，排除篡改、旧源码、错误运行及评分操作。

```bash
node probe/closeout-foundation.mjs --verify
node --test test/closeout-foundation.test.mjs test/p10-shield-matrix.test.mjs test/diagnose-match.test.mjs
```

**收口不是正式复验通过或归档。** 独立正式复验仍未取得新结论，不自行勾选Task，不自动提交推送，不把唯一右删失边界填成已测常量。基础实跑及证据整理可以停止重复采样；用户决定继续策略前不再开展胜率调优。

## 2026-10-08 限时复验与修复闸门

11:33:36至11:38:38（UTC+08:00）对提交 `85a488d` 的基础补测生成器和实际归档帧启动全新只读隔离复验，300秒硬限制触发，实际302秒，进程树已停止。未产生有效最终报告，记 `reviewer_unavailable`，不是pass，也不是正式代码fail；不重复启动无期限长审查。

主会话随后直接核对发现一个实质元数据缺口：`level.endCondition` 与 `match.endCondition` 的值已新增本轮时限平局路径，但叶子顶层日期、方法、source和raw仍只指向旧死亡实验。新引用只出现在嵌套observations，标准元数据入口因此不完整。该核实不是独立审查器结论，也不要求重新测对局。

修复方案已写入 `docs/reports/003/foundation-fix-proposal.md`，用户于2026-10-08批准并已应用，随后明确授权提交推送。方案只同步两个叶子的证据元数据、补回归并更新派生快照哈希；保留历史facts和原始观测，不评分、不改策略，正式复验与归档状态不因提交推送而改变。

FND-PROV-001已修复：两个叶子的日期、复合方法、历史+当前source、scope和顶层raw已同步；`supersedes`保留原值与旧元数据。新增回归在旧版失败、修复后28项定向回归通过；全套207项为206通过、1条件性跳过、0失败。离线复算、引用校验和5文件差异核对均通过。原始gzip、简介、历史facts及默认策略哈希未变。

12:01:15至12:03:47（UTC+08:00）对该修复单独运行150秒短复验，仍未得到有效最终JSON，记 `reviewer_unavailable`，不计pass，也不冒充003全部Task通过；不再重复启动。短复验元数据：`docs/reports/003/foundation-provenance-20261008-r1-meta.json`。

结构门检查通过（17个Task、1个历史目录声明提示），但仍有14个Task未正式勾选，其中包含暂缓项和缺失/不可用/有阻塞意见的旧报告。因此不能以此次结构或测试通过强制归档。独立审查隔离快照因含额外文件保留，未强制删除；主仓库代码未被审查器改动。

过程日志：`docs/reports/003/foundation-85a488d-20261008-meta.json`、`foundation-85a488d-20261008-events.jsonl`；主会话核实结果：`foundation-85a488d-20261008-manual-check.json`。

## 2026-10-07 历史阶段

范围：`2026-aiyouth / mages-might`，JavaScript，当前内置简单电脑对局环境。以下为该阶段当时状态；unknown清单和下一阶段安排不覆盖上方最新补测结果。

## 结论与验收边界

当前环境可取得的基础观测已补测并整理，数据、API 手册、规则手册及原始证据可以用于后续策略实验。这里的「收口」指已取得结果或如实登记尝试与限制，**不等于所有机制都已测定，也不等于 003 变更已正式验收或归档**。

遵循 D-003-4：只推进地图规则，T003-9 对手伤害速率继续暂缓。没有对战真人、切换对手、提交天梯评分或开展 Python 重测；内置对手行为不能当作地图固定规则。

规范数据仍以 `data/seasons/2026-aiyouth/mages-might/facts.json`、`api.json` 为准，本文件是本次收口的证据索引，不是新增数值契约。

## 已取得的结果

| 项目 | 本次收口状态 | 规范记录或证据入口 |
| --- | --- | --- |
| 运行与观测基础 | 已有校准、源码身份核验、快速模拟、运行错误和报错弹窗检查；不在策略中打印 | `probe/lib.mjs`、`probe/p9-rate-limit.mjs`、`docs/debug-environment.md` |
| JavaScript API | 必需字段无缺项，显式未测字段为零；不可用与读取即拦截的字段保留原始结论，不再重复试探隐藏 API | `api.json`、`raw/p8-api-surface.jsonl`、`pitfalls/008-language-dependent-behavior.md` |
| 结束与胜负 | 分别观测我方死亡、敌方死亡；结束后帧仍可读取。源码核验后的末帧双方血量为权威，goalStates/DOM 只交叉核对 | `match.endCondition`、`match.verdictRule`、`level.endCondition`；`raw/p1-match-end.jsonl#9389`、`#10816`、`#11981` |
| 护盾与相克 | 已发布自然出现的配对证据；未用过的组合不填已知。被打碎的护盾不能据此推定自然寿命；举盾耗时不外推全部施法 | `defense.shieldVs`、`spells.*-shield.observedEffect`、`raw/p3-shield.jsonl` |
| 果实与采集 | 三元素的跳变、采摘、返程入账与往返周期有观测；常量估计补齐公式和依赖，历史纵向距离不写成真实欧氏距离 | `fruits.*.roundTrip`、`collector.yieldRate`、`raw/p4-fruit-value.jsonl` |
| 果农与特殊法术 | 主动构造暴露场景；water-refresh 加血、fire-burn 减血有单次对照。低血量敌方果农被 fire-burn 致死已有配对证据；可重建，ID 可能复用 | `collector.deathCondition.spellEffectObservations`、`.lethalSpellObservations`、`collector.rebuildCostAfterDeath`；`raw/p5-collector-death.jsonl#48`、`#50`、`#52` |
| stamina | 最新有效活跃果农逐帧观测未提供可读字段；只说明当前观测接口的限制，不证明内部不存在体力机制，也不证明特殊法术无效 | `collector.stamina`；`raw/p6-stamina.jsonl#11`、`#12` |
| earth-grow | 三局同参数基线与一次施法对照；确认生长速率变化，区分首帧价值比、生效窗口、采集收入与扣费后净差，不外推整局或多果农收益 | `spells.earth-grow.growthBonus`；`raw/p7-earth-grow.jsonl#35`、`#37`、`#39`、`#41`、`#44`、`#46` |
| 数据与文档 | API 水盾坐标改用规范 factRef；引用校验排除诊断编号等非游戏常量，仍检查真实重复常量和坏引用；生成手册与源数据同步 | `probe/verify-refs.mjs`、`probe/verify-completeness.mjs`、`generated/` |

上表中的 `raw/`、`pitfalls/`、`generated/` 路径均相对于赛季地图目录 `data/seasons/2026-aiyouth/mages-might/`。完整原始引用以对应事实的 `raw` 字段为准。

最新终局批次为 `p1-muxp8lhk`，最新 stamina 批次为 `p6-e8fc4d79-e52f-46b4-9a4a-b33e72b1d396`。earth-grow 的源批次为 `p7-848b7029-2c29-40d4-91f1-0878174b6ca6`，复算记录通过 `sourceRunId` 与 `sourceRaw` 指向源证据。

## 仍未测定的边界

本次完整性扫描共有 178 个事实叶子：measured 131、estimated 21、doc 2、unknown 24。以下按事实路径分组，**不是还有 24 项实现任务未做**。

| unknown 分组 | 叶子数 | 原因与使用限制 |
| --- | ---: | --- |
| `defense.shieldVs` 未出现的法术 × 护盾组合 | 18 | 内置对手未使用对应法术。D-003-4 下不擅自换对手；不能把元素关系外推成已测配对 |
| `defense.shieldRuleIndependentOfSpellKind` | 1 | 样本不足以证明护盾效果与法术种类无关 |
| `spells.earth-shield.activeDurationSeconds` | 1 | 已观察到的消失是被攻击打碎，不能当作自然到期；已有观测下界保留在事实中 |
| `collector.deathCondition` | 1 | 已证明部分法术可减血、致死，但历史自然掉血的完整归因仍未确定。归队/法力入账关联不等于魔法攻击；未发现英雄同频流血不能外推所有果农机制 |
| `match.timeLimitPath` | 1 | 空策略及多种防御尝试均先发生英雄死亡，未独立观测时间耗尽裁决。配置时限不等于已实测终局规则 |
| `match.drawRule`、`level.drawRule` | 2 | 尚未构造有效平局；同一规则在两个数据入口表示，不能据配置或残局时间推断 |

estimated 与 doc 也不是已实测常量。下游必须保留置信度，不能把全部 178 个叶子称为 measured。

## 自动验证与证据保护

- 定向回归：`test/p4-fruit-value.test.mjs`、`test/p8-api-surface.test.mjs`、`test/probe-connect.test.mjs`、`test/probe-data.test.mjs`、`test/probe-run-match.test.mjs`；104 项中通过 103、跳过 1（Windows 符号链接条件）、失败 0。
- 引用校验通过；完整性校验错误 0、警告 0；API 必需字段缺失 0、显式未测 0。
- 最新 p1/p6 批次的源码身份、错误检查和分类已经核对；p7 原始重分析与当前分析函数、已发布加成全量比对一致。
- 相对本次工作开始时的 HEAD `c45786b`，p1 原始文件只追加 4155 行、p6 只追加 3 行；旧文件字节前缀保留，没有删除或改写历史证据。
- `node probe/generate-docs.mjs` 已刷新三份生成手册；`git diff --check` 通过。

## 独立复验状态

2026-10-07 14:16:28（UTC+08:00）启动了一次隔离、只读、当前证据聚焦核对，设置 180 秒硬超时。14:19:31 记录结果为 `reviewer_unavailable`，退出码 124；进程树已停止，隔离快照保留，没有合并到主仓库。

这次超时**不是 pass，也不是已发现代码缺陷的 fail**；它没有给出可采纳的最终审查结论。自动验证与主会话证据核对不冒充独立复验。历史 T003-11 的失败报告与 T003-12 的不可用状态也不能仅凭本次定向核对改成通过。因此本次不勾选 Task、不更新归档状态、不宣布正式验收完成，也不重复启动无期限长审查。

本地过程日志位于 `docs/reports/003/basic-current-20261007-review.json`、`basic-current-20261007-review-meta.json`、`basic-current-20261007-supervisor.log` 和 `final-probe-regression-20261007.log`。报告目录中的日志可能不随版本管理分发；本节持久记录其实际状态。

## 复核入口与下一阶段

不启动浏览器的验证：

```bash
node probe/verify-refs.mjs
node probe/verify-completeness.mjs
node --test test/p4-fruit-value.test.mjs test/p8-api-surface.test.mjs test/probe-connect.test.mjs test/probe-data.test.mjs test/probe-run-match.test.mjs
git diff --check
```

刷新生成手册用 `node probe/generate-docs.mjs`，不要手改 `generated/`。重新采集用 `probe/p1-match-end.mjs`、`probe/p6-stamina.mjs`、`probe/p7-earth-grow.mjs`；这些不是只读验证，会运行对局并追加证据，应按实际缺口选择，不为消除 unknown 无限重跑。

浏览器重新进入或刷新后先点击右下角「开始」，单脚本独占对战页；只运行、不评分，不必要等回放时采用快速结果，需要时再逐帧回放。

实质工作的下一阶段是以已取得的事实推进 JavaScript 策略和对照实验，把每个未知项对策略的影响显式列出来。正式验收、提交推送、归档与扩大到真人对手仍分别遵守审批和复验闸门，本记录不代替这些授权。
