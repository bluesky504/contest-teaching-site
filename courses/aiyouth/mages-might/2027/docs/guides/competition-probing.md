# 比赛探查的共享约束

本指南将原 `CLAUDE.md` 的项目专属约束共享给 Codex 与可选的 Claude 后端。比赛数据或浏览器任务开工前必读；停用 Claude 不改变这些边界。

## 浏览器与观测

平台探查用受控 Chrome + CDP，工具与方法见 `docs/debug-environment.md`。

- 启动：`chrome.exe --remote-debugging-port=9222 --user-data-dir=<临时目录>`，独立 profile，不碰日常浏览器。
- 观测用 `tools/scan-frames.mjs` 与 `tools/battle-observer.mjs` 读 `world.frames`；策略代码只写策略，不含观测用 `print`。
- 语言陷阱：`try/except` 包 `print` 会让整段代码解析失败；`str(游戏对象)`、`dir()`、`obj[key]` 都会静默中断。具体探测结果仍以本赛季 facts 与原始证据为准。
- 只点「运行」，不点「为我的代码评分」，除非用户明确要求提交天梯。
- 对战页为独占资源，同一时刻只运行一个对战脚本，防止互相覆盖编辑器。

## 策略代码禁止 print

2026-09-27 起作为硬约束：所有对战数据从 `world.frames` 读取。

| 理由 | 说明 |
|---|---|
| 速率限流 | 曾在 194 条后静默丢失，表现为「对局提前结束」并导致误判 |
| 污染被测对象 | 观测代码混在策略里，改观测就改了策略 |
| 可观察范围受限 | `world.frames` 可事后回查任意属性、任意帧，不限于事先想到的打印量 |

```bash
node tools/scan-frames.mjs
node tools/scan-frames.mjs health fire
STEP=10 node tools/scan-frames.mjs
node tools/run-matches.mjs 5
```

判定胜负一律用 `world.frames` 末帧的双方血量，不用事件推送的 `goalStates`，后者可能残留上一局结果。

## 账号与合规

遵循 `docs/competition-rules.md`。原接手记录的账号为非实名，不参与竞赛评奖；账号状态变化时重新核对规则，不把历史状态当成永久事实。

- 不使用多账号，不拷贝他人代码。
- 凭据不进仓库，不写进文档，不出现在提交记录或日志里。
- 不擅自提交参赛代码、报名或评分操作。

## 当前数据边界

003 变更的 D-003-4 明确目前只探测地图数据。对手出手时刻、t=120 血量等结果必须注明「当前内置对手」，不泛化为地图固定规则；T003-9 仍按既有决策暂缓。

2026-10-08 用户授权借真人对手补基础机制样本后，实际页面为2027联盟。补测快照发布在 `data/maps/mages-might/2026-10-08/`，保留真实来源和历史继承边界，不覆盖2026赛季历史facts。最新收口与可复算入口见 `docs/guides/basic-probe-status.md`；它不等于正式独立复验通过或归档。
