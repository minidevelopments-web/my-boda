# Issue tracker

Issues are tracked with **GitHub Issues** on `minidevelopments-web/my-boda`.

Skills like `to-tickets`, `triage`, and `to-spec` read from and write to this tracker.

## Workflow

- Create issues with `gh issue create --title "<title>" --body "<body>" --label needs-triage`.
- List and filter with `gh issue list --label <label> --state open`.
- View one issue with `gh issue view <number>`.
- Close with `gh issue close <number>`.
- Do NOT write ticket markdown under `.scratch/` (that directory does not exist in this repo).
- Do NOT invent a separate tracker file; GitHub Issues is the single source of truth.

## Labels

Triage state labels are defined in `docs/agents/triage-labels.md`. The repo already
carries them (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`,
`wontfix`) alongside the GitHub defaults (`bug`, `enhancement`, `question`, …).
