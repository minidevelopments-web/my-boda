# my-boda marketing site

Static, dependency-free landing page for the product — separate from the wedding app itself.

```bash
python3 -m http.server -d marketing   # http://localhost:8000
node --test marketing/demo.test.mjs   # countdown logic
```

Deploy by pointing any static host (Vercel, Netlify, GitHub Pages, nginx) at this folder. No build step.

- `index.html` — page and demo markup
- `styles.css` — page plus the three demo themes
- `demo.mjs` — theme switcher, countdown, copy button
- The demo is a sample-data replica of the home page; it is not the Next.js app.

Fonts are system stacks and there are no third-party requests, matching the product's privacy claim.
