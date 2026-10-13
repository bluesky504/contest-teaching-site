# 第二课：采集与基本攻击

**状态：完整教学示例草稿，待当前平台实跑。** 使用 ES5 风格 JS，独立于排名程序；没有复制参赛源码、修改默认策略或承诺胜率。示例有无限主循环，不能直接用 Node 或浏览器执行；本地测试只用能主动结束的 fixture。

## 本课目标

把第一课的接口串成一个最小闭环：设置采集回调 → 查询单池法力 → 满足费用条件 → 检查可用性 → 发出施法调用 → 下一次重新观察。

这里刻意不主动增加果农，只利用简介说明的初始果农；不代表一个果农适合实战，也不代表单元素采集最优。扩张会带来阻塞成本，放到第三课单独比较。防御、辅助、组合攻击和动态预算不挤进入门示例。

## 完整代码

可下载文件：`examples/teaching/mages-might/02-gather-and-attack.js`。下面与下载文件逐字一致，不含日志或打印。

```javascript
var gatheringElement = "fire";
var attackSpell = "fire-arrow";
var attackCost = 3;

hero.chooseItem = function (collector) {
  return gatheringElement;
};

while (true) {
  var availableMana = hero.getTotalMana(gatheringElement);
  if (availableMana >= attackCost && hero.canCast(attackSpell)) {
    hero.cast(attackSpell);
  }
}
```

## 每段为什么存在

| 代码 | 目的 | 容易混淆的地方 |
| --- | --- | --- |
| `gatheringElement`、`attackSpell` | 让采集元素与攻击法术相匹配 | 固定用火是教学选择，不是三元素的最优比例 |
| `attackCost = 3` | 设置火箭费用门槛 | 3 来自界面规则的费用列，不是伤害，也不是本示例重新测得的值 |
| `hero.chooseItem` | 果农请求下一目标时返回元素字符串 | 不读取未验证果农字段，不保证固定往返时间或收入率 |
| `hero.getTotalMana(gatheringElement)` | 每次判断重新读取对应池 | 不拿无参三池合计当单池，不沿用旧读数 |
| `availableMana >= attackCost` | 法力不足时不尝试施法 | `&&` 短路，此时连后面的可用性检查也不调用 |
| `hero.canCast(attackSpell)` | 增加平台可用性检查 | false 不证明唯一原因，尤其不自行推断冷却语义 |
| `hero.cast(attackSpell)` | 满足两道条件后发出调用 | 不依赖返回值，不把调用当命中、扣血或胜利 |

循环中不添加未验证的 `hero.wait()`。已有 JS 基线也是无限主循环，但这不证明新示例在当前平台的时序或强度；平台实际运行需要另行验收。浏览器课页只显示、下载代码，不执行它。

## 三组假设输入，演示分支而不是模拟比赛

| 输入 | 可用性检查 | 是否调用 cast | 能下的结论 |
| --- | --- | --- | --- |
| 火法力 2、示例可用性为 true | 被费用条件短路，不调用 | 不调用 | 不够教学费用门槛 |
| 火法力 3、可用性为 false | 调用，返回 false | 不调用 | 平台未允许此次尝试；原因不能凭此确定 |
| 火法力 3、可用性为 true | 调用，返回 true | 调用一次 | 代码发出了调用；效果仍须观察 |

这三组是独立的假设快照，不是连续对局帧，不代表真实法力增长、支出测量、冷却时间、命中或胜负。页面的“下一种情况”不推进比赛时间。

## 小练习

1. 为什么只把采集改成 water、攻击仍用 fire-arrow，可能会攒错池？应该同时核对哪些设置？
2. 法力为 2 时，程序会调用 `canCast` 吗？说明 `&&` 的短路作用。
3. 法力够、`canCast` 为 true、`cast` 返回 undefined，能宣布命中了吗？还需要哪些帧证据？

教师提示：保持采集、查询池、法术元素与费用来源一致；短路决定本轮检查顺序；调用成功与实际效果分开。不要为了让示例“显得更强”一次加入扩张、防御和所有法术，先对每个改动设计可解释的对照。

## 来源与验证状态

- `docs/guides/battle-intro-reading.md`：2027 页面简介，初始果农、chooseItem 调度说明、箭费用列为 3；这是界面文档证据。
- `data/seasons/2026-aiyouth/mages-might/api.json`：chooseItem、带元素参数 getTotalMana、canCast 与 cast 的历史 JS 访问证据；不把字段状态或冷却外推为当前版本全测。
- `strategy/current.js`：仅核对已有循环与调用形式，不复制其排名参数、不修改其源码。
- `docs/guides/competition-probing.md`：后续到比赛页验证时先点“开始”，只运行不评分，检查报错与原始帧，不在策略中加 print。

本地 fixture 可证明示例的分支、调用顺序、池与法术选择、回调安装及不依赖返回值，不能证明比赛调度、采集速率或实战效果。当前没有独立复验、官方新对局或公开发布。
