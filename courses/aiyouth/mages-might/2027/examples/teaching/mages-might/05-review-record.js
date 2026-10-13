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
