# 第五课：复盘与知识归纳

**状态：课程闭环草稿。** 本课不增加新的比赛策略，而是教你把一次实验写成别人可以检查、自己可以继续改进的记录。示例是静态 JavaScript 对象，不连接平台、不执行对局。

## 复盘不是复述结果

“这局赢了”或“这局输了”只是结果，不是解释。一份可用复盘至少回答：

1. **问题**：这次想知道什么？
2. **假设**：如果什么成立，应该观察到什么？
3. **唯一主要改动**：这次只改变了哪件事？
4. **控制项**：哪些设置保持不变？
5. **证据**：哪些是文档、运行观测、假设或未知？
6. **结论**：证据真正支持到哪一步？
7. **未知与下一测**：还缺什么，下一次怎样只改变一个因素？

流程可以画成：

```text
问题 → 假设 → 单一改动 → 对照运行 → 原始证据 → 限定结论 → 下一实验
```

## 完整记录对象

源码：`examples/teaching/mages-might/05-review-record.js`。这是一个资料结构示例，不是策略程序；它没有 `hero`、网络、账号或比赛调用。

```javascript
var reviewRecord = {
  title: "一次扩张调用的复盘模板",
  question: "增加一次果农生成调用，是否值得占用英雄行动窗口？",
  hypothesis: "如果新增收入能覆盖阻塞和响应窗口损失，扩张才可能值得；否则应保持原方案。",
  change: "只增加一次 hero.spawnCollector()，其他采集与攻击设置不变。",
  controls: [
    "采集元素仍为 fire",
    "攻击法术仍为 fire-arrow",
    "不新增防御、辅助或组合攻击",
  ],
  evidence: [
    { kind: "document", statement: "简介中的生成时间是页面文档说明，不直接当作实测耗时。", source: { kind: "document", file: "docs/guides/battle-intro-reading.md", section: "果农与采集", pageVersion: "AI世青赛全国(2027)联盟", checkedAt: "2026-10-08" } },
    { kind: "observed", statement: "有界 fixture 观察到回调先安装、生成返回后才进入后续英雄调用。", source: { kind: "bounded-fixture", file: "test/teaching-third-lesson.test.mjs", case: "spawn is attempted once after callback installation and before later hero calls", version: "teaching-fixture@2026-10-12", sequence: ["chooseItem-installed", "spawnCollector", "getTotalMana"], errors: "none" } },
    { kind: "hypothesis", statement: "更多果农可能增加后续法力收入。" },
    { kind: "unknown", statement: "原有果农在英雄生成阻塞期间是否继续采集，尚未由本记录证明。" },
  ],
  conclusion: "本记录只支持调用顺序和证据边界，不支持实战回本或胜率结论。",
  unknown: [
    "当前页面版本的真实生成耗时",
    "新增果农的实际入账和死亡影响",
    "真人对手下的扩张收益",
  ],
  nextTest: "在相同对手和攻击设置下，只改变是否生成一次果农，并保存逐帧证据。",
};
```

## 四类证据标签

| 标签 | 可以说 | 不可以偷换成 |
| --- | --- | --- |
| **文档说明** | “简介这样写，来源和版本是……” | 当前运行一定如此 |
| **运行观测** | “这次 runId 的某帧看到了……” | 所有对局和对手都如此 |
| **策略假设** | “如果……可能……” | 已被证实的机制 |
| **未知** | “当前没有足够证据……” | “大概就是这样” |

`unknown` 是结果的一部分，不是需要删除的空白。比如护盾在飞弹落地时消失，只能先记录“消失与命中同帧”；没有额外对照，就不能把它改写成自然到期。

本对象里的 `observed` 特指**有界 Node fixture 的调用序列**，不是官方比赛的 `world.frames` 观测。它保留 fixture 文件、测试用例、版本、调用序列和错误状态；若要写平台运行观测，还必须补充 runId、源码身份、帧范围和原始证据引用。

## 结论要有边界

### 过度结论

> 这一局造了更多果农并且赢了，所以果农越多越好。

它同时混入了生成时序、采集收入、对手行为、攻击法术和随机过程，不能知道胜负由哪一个变化造成。

### 有边界的结论

> 在这个有界 fixture 中，只观察到 `chooseItem` 先安装、`spawnCollector` 返回后才继续读取法力；它没有证明真实生成耗时、收入、死亡或胜率。

这个结论较小，但可以复核，也能明确下一次实验要补什么证据。

## 小练习

1. 把“火球比火箭强”改写成一个可验证假设，并列出至少两个控制项。
2. “本次没有看到飞弹”属于哪类证据？为什么不能写成“对手没有施法”？
3. 复盘记录缺少 `nextTest` 会有什么问题？怎样避免下一轮又同时改采集和防御？
4. 找出本课对象里的一个 `unknown`，说明需要什么观测才能缩小它，而不是直接填一个数字。

教师提示：先检查学生有没有把“结果”写成“原因”，再检查是否只改变一个主要因素。最后让学生从 unknown 中挑一个，写出下一次观测的输入、输出和失败判据。

## 来源与验证边界

- `docs/guides/basic-probe-status.md`：基础探测收口不等于所有机制测定，unknown 和复验缺口需要保留。
- `docs/guides/competition-probing.md`：从 `world.frames` 读取证据，保留错误和异常，不在策略中加入 print。
- `docs/measurements-corrected.md`：历史纠错和失败过程说明；不能只抄最后的结论。
- `docs/teaching/mages-might-first-lesson.md` 至 `docs/teaching/mages-might-fourth-lesson.md`：前四课的规则、接口、扩张和预算边界。
- `docs/guides/跨项目协作约定.md`：教学版与参赛版分工，不自动公开参赛源码。

本课示例只验证记录结构和标签，不验证任何新比赛机制。第五课完成后，课程先停在复盘闭环，等待教师审阅，不自动进入真人对战或排名策略开发。
