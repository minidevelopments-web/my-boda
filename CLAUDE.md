## Agent skills

### Issue tracker

Issues are tracked using GitHub Issues. Skills like `to-tickets`, `triage`, and `to-spec` read from and write to this tracker. They need to know whether to call `gh issue create`, write a markdown file under `.scratch/`, or follow some other workflow you describe. Pick the place you actually track work for this repo. See `docs/agents/issue-tracker.md` for details.

### Triage labels

The default label vocabulary is: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. These labels are used by the `triage` skill to categorize issues. See `docs/agents/triage-labels.md` for details.

### Domain docs

Domain knowledge lives in `README.md`, `docs/ROLES.md`, `docs/SELF_HOSTING.md`,
`docs/THEMES.md`, and `prisma/schema.prisma` (data model source of truth).
There is no root `CONTEXT.md` and no `docs/adr/`. See `docs/agents/domain.md` for details.
