# 第四课：攻防预算

**状态：教学示例草稿，待当前平台实跑与独立复验。** 本课只讲一个安全的预算顺序：已知火系来袭时，先保留并尝试一次水盾；没有可见来袭时，火池达到火球费用才尝试攻击；看到未知来袭时不猜测。

这不是完整策略，不包含动态护盾寿命、冷却预测、组合攻击、英雄血量、果农保护或胜率优化。它的价值是让学生看见“行动之间会争用时间和法力”，并学会把未知状态变成等待，而不是编造结论。

## 预算分支代码：资源输入单独声明

源码：`examples/teaching/mages-might/04-offense-defense-budget.js`。下面与页面、下载文件逐字一致。这是“决策分支”示例，不是完整的资源供给闭环：`chooseItem` 只返回 fire，水池达到3是外部 fixture/模型输入，示例本身不会自动产生水法力。无限主循环只能交给合适的平台或有界测试，不能直接当普通 Node 或网页脚本运行。

```javascript
var attackElement = "fire";
var attackSpell = "fire-ball";
var attackCost = 15;
var shieldElement = "water";
var shieldSpell = "water-shield";
var shieldCost = 3;
var shieldUsed = false;

hero.chooseItem = function (collector) {
  return attackElement;
};

while (true) {
  var attackMana = hero.getTotalMana(attackElement);
  var shieldMana = hero.getTotalMana(shieldElement);
  var incoming = hero.findEnemyMissiles();
  var hasArrayObservation = Array.isArray(incoming);
  var hasIncoming = hasArrayObservation && incoming.length > 0;
  var incomingMana = hasIncoming && incoming[0] ? incoming[0].mana : null;

  if (hasIncoming && incomingMana === "fire" && !shieldUsed && shieldMana >= shieldCost && hero.canCast(shieldSpell)) {
    hero.cast(shieldSpell);
    shieldUsed = true;
  } else if (hasArrayObservation && !hasIncoming && attackMana >= attackCost && hero.canCast(attackSpell)) {
    hero.cast(attackSpell);
  }
}
```

### 代码的预算含义

| 代码 | 教学含义 | 不能据此推出 |
| --- | --- | --- |
| `attackCost = 15` | 只在火池够支付火球时考虑攻击 | 15 是当前所有版本都相同的实战保证 |
| `shieldElement = "water"` | 按水克火的课程规则应对已知火来袭 | 所有未知飞弹都一定按同一表格处理 |
| `findEnemyMissiles()` | 先观察是否有飞行中的来袭样本 | 空列表证明对手没有施法或永远不会施法 |
| `incoming[0].mana` | 只使用已记录样本中的元素字段 | 其他飞弹字段、所有法术种类都已验证 |
| `shieldUsed` | 本课把一次防御支出当成显式预算 | 护盾只能用一次、自然寿命或冷却已被证明 |
| `hasArrayObservation && !hasIncoming` | 只有确认拿到数组且数组为空时才让攻击分支运行 | 非数组/缺失观测不等于没有飞弹 |

如果列表非空但元素不是已知的 `fire`，代码两个分支都不执行。这是刻意的保守行为：当前课程没有足够证据把未知来袭映射成某个盾，也不拿未知状态继续承诺攻击安全。

## 四种假设输入

| 来袭样本 | 防御预算 | 攻击池 | 结果 | 原因 |
| --- | --- | ---: | --- | --- |
| 无可见飞弹 | 未使用 | 15 | 尝试火球 | 攻击门槛满足，且没有本课已知威胁 |
| `mana="fire"` | 未使用，水池3 | 15 | 尝试一次水盾 | 防御优先；水克火是本课已知映射 |
| `mana="fire"` | 已使用 | 15 | 等待 | 不重复伪造护盾，也不在威胁可见时抢攻 |
| 列表非空但元素未知 | 任意 | 15 | 等待 | 未知不猜测，不把火球当成安全行动 |

这些是独立快照，不是连续帧，也不是比赛结果。`canCast` 的冷却语义没有在历史批次中完整测定；页面模型把可用性作为独立的输入，不把“法力够”冒充“平台一定允许”。

## 相克与护盾证据边界

课程使用的方向是**火克土、水克火、土克水**。已有补测快照记录了护盾与三种攻击元素的配对，但样本、来源和版本边界不同；球类部分还有单样本。`water-shield` 应对火来袭是本课的一个已记录对照，不等于所有护盾字段都可读，也不等于护盾一定在自然时限内消失。

不要把界面“持续时间”列直接当作护盾寿命：历史材料明确记录过字段含义不明、护盾被飞弹打碎与自然到期无法混同。也不要把 `findEnemyMissiles()` 中未测字段（如 `team`、`power` 等）读入策略。

## 小练习

1. 为什么火池达到15但看见未知来袭时仍等待？把“法力充足”和“行动安全”分开。
2. `shieldUsed` 是事实还是策略预算？怎样用连续帧证据判断护盾是否真的存在、被打碎或重新激活？
3. 如果把攻击从火球换成火箭，需要同时重新讨论费用、威力、攻击次数和防御预留哪些内容？
4. 这份代码看不到果农死亡。下一步应增加哪一种观测，而不是直接添加更多 if？

教师提示：先让学生画出四个分支，再讨论为什么“等待”是合法动作。组合攻击和动态采集属于后续高级内容，不在本课硬塞。

## 来源与验证边界

- `docs/guides/battle-intro-reading.md`：界面相克规则、法术表列义与费用/威力区别。
- `data/maps/mages-might/2026-10-08/README.md`：护盾配对快照、样本与 current/historical 来源标记。
- `data/seasons/2026-aiyouth/mages-might/api.json`：`findEnemyMissiles` 的已测列表/元素字段边界、带元素 `getTotalMana`、`canCast` 与 `cast` 的历史证据。
- `data/maps/mages-might/2026-10-08/facts.json`：火球费用15、火箭费用3、水盾费用3等历史事实层；不宣称当前页面重新测定。
- `docs/guides/competition-probing.md`：后续官方验证先点击“开始”，只运行不评分，从 `world.frames` 采证，不把 `print` 放进策略。

本地 fixture 只验证分支顺序、一次防御预算和未知等待；不证明真实护盾效果、飞弹全量覆盖、冷却、伤害或胜率。当前课页不连接官方比赛，不执行下载示例，尚未公开发布。
