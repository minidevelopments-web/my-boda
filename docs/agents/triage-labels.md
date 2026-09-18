# Triage labels

All five labels exist on `minidevelopments-web/my-boda` (verified via `gh label list`).
The `triage` skill moves issues through them:

| Label | Meaning | Next step |
|---|---|---|
| `needs-triage` | New, unreviewed issue | Triage it: reproduce/clarify, then relabel |
| `needs-info` | Blocked on a question to the reporter | Ask, then wait; return to `needs-triage` when answered |
| `ready-for-agent` | Specified, agent-grabbable work | An agent may pick it up and implement |
| `ready-for-human` | Needs a human decision (scope, product call, secret access) | A human owns it until unblocked |
| `wontfix` | Out of scope or intentionally declined | Close the issue |

Rules:

- Every open issue should carry exactly one of the four state labels
  (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`).
- `wontfix` is terminal: apply it and close.
- Topic labels (`bug`, `enhancement`, `question`, `documentation`, …) are orthogonal
  and may be combined with one state label.
