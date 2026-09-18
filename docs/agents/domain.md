# Domain docs

There is no `CONTEXT.md` at the repo root and no `docs/adr/` directory.
Domain knowledge lives in these files (read them, don't invent others):

| File | What it defines |
|---|---|
| `README.md` | Product pitch, themes, env vars, tech stack |
| `docs/ROLES.md` | Role matrix (guest / couple / planner / sysadmin) + interaction diagram |
| `docs/SELF_HOSTING.md` | Deploy, users & roles, backup |
| `docs/THEMES.md` | Theme system, `ThemeDef` shape, adding a theme |
| `docs/VERCEL.md` | Vercel Postgres deploy notes |
| `prisma/schema.prisma` | Data model source of truth (`User`, `Household`, `Guest`, `RsvpResponse`) |
| `docs/superpowers/specs/` | Approved design specs (history of why things are the way they are) |
| `docs/superpowers/plans/` | Implementation plans (how specs were built) |

Conventions for agents:

- Treat `prisma/schema.prisma` as authoritative for entities and relations.
- Treat `docs/ROLES.md` as authoritative for what each role may do.
- Do not reference `CONTEXT.md` or `docs/adr/` — they do not exist.
  If the project later adopts ADRs, create `docs/adr/` then and update this file.
