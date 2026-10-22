# my-boda — Reddit launch pack

How to use this file:

1. Copy a **Title** line into Reddit's title field.
2. Copy everything **after the Body line** down to the next `---` into the post
   body.
3. In Reddit, switch the editor to **Markdown** first (the "Markdown editor"
   toggle), otherwise Reddit's rich-text editor may escape the formatting.

The post bodies below are plain Markdown, not wrapped in code fences, so a
straight copy/paste keeps the bold text, bullets and code block intact.

Links used below:

- Code: https://github.com/minidevelopments-web/my-boda
- Preview: https://my-boda.pages.dev
- Self-hosting guide: https://github.com/minidevelopments-web/my-boda/blob/main/docs/SELF_HOSTING.md
- License: https://github.com/minidevelopments-web/my-boda/blob/main/LICENSE
- Commercial terms: https://github.com/minidevelopments-web/my-boda/blob/main/COMMERCIAL.md

---

## 1. Primary post — r/selfhosted, r/homelab, r/SideProject

### Title

I built a self-hosted, privacy-first wedding website — invite-only RSVP, guest admin, photo gallery, no per-guest fees

### Body

**Disclosure: I built this.** It's free for your own wedding. Sharing because the "your guest list is our data" model of wedding sites bothered me.

When we started planning, every wedding website wanted the guest list in their database, a per-guest upgrade, or both. I wanted something we could run on a €4 VPS and keep.

**my-boda** is a source-available wedding platform you host yourself.

What's in it:

- **Three themes** — classic, modern, garden; one env var to switch.
- **Invite-code RSVP** — households get codes, so only invited guests can respond. Conditional form: attending, headcount, meal, dietary notes.
- **Guest admin** — search/filter, stats, CSV export, and photo ZIP export.
- **Logistics hub** — schedule, venue map, accommodations, all env-driven.
- **Registry** — IBAN/Bizum or external links, no payment processing.
- **Five languages** — EN, ES, FR, DE, PT.
- **Photo gallery (new)** — invite-only uploads from phones, browser-side resize, auto-published, staff can delete. Owners download every photo as a ZIP from `/admin`. Images are re-encoded server-side, so EXIF/GPS is stripped.

**Stack:** Next.js 16, React 19, Postgres + Prisma, Tailwind, Docker Compose. No analytics, no third-party scripts, no telemetry. Guest data stays in your database; photos stay on your disk.

    git clone https://github.com/minidevelopments-web/my-boda.git
    cd my-boda
    cp .env.example .env   # names, date, venue, passwords
    docker compose up --build -d
    docker compose exec app npx prisma migrate deploy

**License, plainly:** PolyForm Noncommercial 1.0.0. Free for your own wedding, a friend's, or a non-profit event. If you charge people to host their wedding on it, it needs a commercial license (5% of gross, US$100/year minimum). It is source-available, not OSI open source.

**Honest limits:** single-container design; the gallery needs persistent disk (not Vercel's ephemeral filesystem); no S3/R2 backend yet; raw HEIC in Chrome falls back to the original upload and may be rejected. It's early, and feedback is welcome.

- Code: https://github.com/minidevelopments-web/my-boda
- Interactive preview + docs: https://my-boda.pages.dev
- Self-hosting guide: https://github.com/minidevelopments-web/my-boda/blob/main/docs/SELF_HOSTING.md

If you self-host things: what would stop you from using this for a wedding? Happy to answer setup questions.

---

## 2. Shorter variant — wedding communities

Use only where self-promotion is allowed, or in a weekly tools thread after asking the mods.

### Title

We got tired of per-guest wedding website fees, so we built a self-hosted one (free for your own wedding)

### Body

**Disclosure: my project.** Free for your own wedding — not a trial.

We wanted a wedding site without a per-guest paywall or our guest list sitting in someone else's database. So we built **my-boda**: RSVP with invite codes, guest admin with CSV export, schedule/venue/accommodation pages, registry info, five languages, and a private photo gallery where guests upload from their phones and you can export everything as a ZIP.

You run it on a small VPS (~€3–5/month) or even a Raspberry Pi with Docker. No tracking, no ads, no vendor holding your data. There's an interactive preview on the site before you install anything.

It's source-available and free for non-commercial use; planners who charge for client weddings need a separate license.

- Preview: https://my-boda.pages.dev
- Code/setup: https://github.com/minidevelopments-web/my-boda

Happy to answer questions about setup or whether it fits your wedding.

---

## 3. Where to post

| Subreddit | Why it fits | Watch out |
|---|---|---|
| **r/selfhosted** | Best audience: people who actually run Docker/Postgres | Read the showcase/self-promo rules. Post as text + screenshots, not a bare link |
| **r/homelab** | Same crowd, projects welcome | Keep it about the build/stack, not sales |
| **r/SideProject** | Explicitly built for launches | Disclose ownership; don't repost the same day |
| **r/nextjs** | Technical angle: Next 16, App Router, Prisma | Use the showcase flair/thread if required |
| **r/docker** | Show the compose setup and volumes | Lead with the stack, not the wedding pitch |
| **r/webdev** | Large dev reach | Usually only **Showoff Saturday**; check the sidebar |
| **r/opensource** | Source-available projects get interest | Be explicit it's **not OSI open source**; some will object to the license |
| **r/privacy** | Strong privacy angle | Very strict self-promo; use a weekly thread or ask mods first |
| **r/weddingplanning** | Biggest couple audience | **No direct advertising.** Use weekly tool threads or ask mods before posting |
| **r/Weddingsunder10k** | Cost-focused, strong fit | Check rules; lead with the no-per-guest-fee angle |
| **r/DIYweddings** | DIY/self-hosted couples | Smaller, but receptive |
| **r/wedding** | Huge reach | Usually removes promo; avoid unsolicited posts |

---

## 4. Posting order

1. **r/selfhosted** first. Answer every comment for the first few hours; that's what keeps a project post visible.
2. Wait 2–3 days, then post a **different angle** to **r/SideProject** (what you learned building it) and **r/homelab** (Docker/volume/backup details).
3. Do **r/nextjs** and **r/docker** with technical titles, not the same copy — crossposting identical text looks like spam.
4. For **r/weddingplanning** / **r/Weddingsunder10k**, message the mods or use their weekly thread. A removed post there can get the domain flagged.
5. Don't post the same link to 8 subs in one hour. Reddit's spam filter will bury it.

---

## 5. Before you post

- Attach 2–3 screenshots: the three themes, and the gallery grid. Posts with images get far more engagement.
- Have answers ready for the obvious comments:
  - *Why not Zola / Withjoy / The Knot?* → data ownership, no per-guest fees, self-hosted.
  - *Is it really free?* → free for your own wedding; commercial license for planners.
  - *Do I need Docker?* → no, Node 20+ and Postgres work too.
  - *What about GDPR?* → data stays in your Postgres; no analytics or third-party scripts.
- Mention the license and limitations in the post. Reddit forgives a paid product that's honest; it does not forgive a hidden one.
- Use your personal account, not a fresh brand account. Brand-new accounts posting links get filtered.
