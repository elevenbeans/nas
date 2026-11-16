## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore

## Gstack opt-in policy

Before invoking gstack proactively for this repository, the assistant SHOULD ask the repo owner whether to use gstack. To record a persistent choice for this worktree, create a file named `.gstack-proactive` at the repository root containing one of the values below (plain text):

- ask    — (recommended/default) always ask the user before using gstack
- on     — allow proactive gstack invocation without asking
- off    — never invoke gstack proactively; only run gstack when explicitly requested

Agents should read `.gstack-proactive` and follow its setting when present. If the file is missing, treat the policy as `ask`.

This gives humans a simple, repo-local opt-in for gstack before any automated or proactive skill use.

## 部署与线上服务（NAS portal）

线上是 launchd 任务 `com.nas.portal`（`next start -p 3000`），部署入口是 `nas-portal/scripts/deploy.sh`。

- **不要在 DSH 沙箱里跑部署。** 沙箱只允许写工作区，而 launchd 要写工作区外的系统状态，`launchctl bootstrap` 会返回 `Bootstrap failed: 5: Input/output error`。要么用完整权限执行，要么让用户在 Terminal 里跑——脚本开头那句 “not a sandbox” 是准确的。
- **不要先 `bootout` 再 `bootstrap`。** `deploy.sh` 的 restart 正是这个顺序：bootstrap 失败（如上面那条）时，回滚分支同样要 bootstrap，于是站点直接停掉。2026-11-16 实际发生，停机约 3 分钟。任务已加载时改用 `launchctl kickstart -k gui/$(id -u)/com.nas.portal`，实测约 1 秒完成换进程，不需要 bootout。
- **动手前先做无副作用探测。** `launchctl print gui/501/com.nas.portal` 确认任务在跑；只有 `kickstart -k` 能成功，才说明当前会话有重启权限。不要在没确认之前执行会停服的步骤。
- **服务被停时先恢复，再继续。** 优先把旧构建拉起来，不要在停服状态下继续构建、换目录或排查。
- **部署后分层验证。** 本机 `127.0.0.1:3000` → 公网 `https://nas.elevenbeans.me/`（客户端 Origin 为 `https://elevenbeans.me`）→ 端到端 POST，三层都过才算完成。
- **计分是线上共享数据。** `POST /api/earth-score` 会真实加分并写 `.data/earth-online-scores.json`；测试前先想好怎么清。2026-11-16 验证时给 `marrakech` 留了 +5。
