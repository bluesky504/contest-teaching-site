# 巫师之战基础补测快照

由 `probe/closeout-foundation.mjs` 生成，勿手改。

实际范围：AI世青赛全国(2027)联盟、mages-might、JavaScript本地对局。2026历史源文件不变；本快照继承项并非重新实测，版本等价未证明。

## 护盾配对

简介规则：火克土、水克火、土克水。27格均有证据，23格来自当前补测，其他格来自明确标注的历史实测。球类部分为单样本。9999是穿透时实体耐久的原始扣减，不是英雄伤害。

| 护盾 | 来袭 | 英雄扣血 | 盾扣点 | 样本 | 来源 |
| --- | --- | ---: | ---: | ---: | --- |
| fire-shield | fire-arrow | 0 | 2 | 3 | current |
| fire-shield | fire-beam | 0 | 2 | 5 | current |
| fire-shield | fire-ball | 0 | 2 | 1 | current |
| fire-shield | water-arrow | 25 | 9999 | 16 | current |
| fire-shield | water-beam | 75 | 9999 | 1 | historical |
| fire-shield | water-ball | 200 | 9999 | 1 | current |
| fire-shield | earth-arrow | 0 | 1 | 4 | current |
| fire-shield | earth-beam | 0 | 1 | 5 | current |
| fire-shield | earth-ball | 0 | 1 | 1 | historical |
| water-shield | fire-arrow | 0 | 1 | 4 | current |
| water-shield | fire-beam | 0 | 1 | 6 | current |
| water-shield | fire-ball | 0 | 1 | 1 | current |
| water-shield | water-arrow | 0 | 2 | 3 | current |
| water-shield | water-beam | 0 | 2 | 8 | current |
| water-shield | water-ball | 0 | 2 | 1 | current |
| water-shield | earth-arrow | 25 | 9999 | 16 | current |
| water-shield | earth-beam | 75 | 9999 | 6 | current |
| water-shield | earth-ball | 200 | 9999 | 1 | historical |
| earth-shield | fire-arrow | 25 | 9999 | 19 | current |
| earth-shield | fire-beam | 75 | 9999 | 7 | current |
| earth-shield | fire-ball | 200 | 9999 | 1 | current |
| earth-shield | water-arrow | 0 | 1 | 14 | current |
| earth-shield | water-beam | 0 | 1 | 6 | current |
| earth-shield | water-ball | 0 | 1 | 1 | current |
| earth-shield | earth-arrow | 0 | 2 | 2 | current |
| earth-shield | earth-beam | 0 | 2 | 7 | current |
| earth-shield | earth-ball | 0 | 2 | 1 | historical |

## 时限与平局

双方存活达到场地最大帧数且最终无获胜目标时，当前本地对局按平局分类。场地达到1800帧、dt=0.1、world.ended，双方末帧均存活；源码绑定的同一世界最终目标均为incomplete。仅用于本地对局分类，代码/网络/页面/审查器超时不算平局，未验证服务器计分。

## 果农与盾寿命

无攻击控制确认归队减1血、耗尽可独立死亡；历史fire-burn致死配对另保留。不把所有旧果农死亡归因到同一原因。英雄加时流血时，控制局没有观测果农同频额外流血。

单次土盾满耐久连续存在至局末，下界166.3秒；自然到期或永久性仍未知，不能把局末当作盾到期。不可读stamina是接口边界，不是内部机制不存在的证明。

## 验证与证据

本轮25局可信观测，1局无效尝试保留但不计结论。有效快照置信度：measured 156、estimated 21、doc 2、unknown 1。仍unknown的精确盾寿命属于已登记的有限观测边界。

`raw/shield-matrix.jsonl.gz` 保留完整原始JSONL字节，引用行号按解压后计算；`raw/intro.json` 是当前简介表头与全文快照。`manifest.json` 记录压缩和原文字节哈希、历史facts哈希，`facts.json` 是有效补测快照。独立正式复验尚未完成，不自动勾选Task、归档、提交或推送。

离线全量复算：`node probe/closeout-foundation.mjs --verify`。
