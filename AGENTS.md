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
