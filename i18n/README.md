# i18n

All user-facing strings of openplayx.com, in English (`en`) and Simplified Chinese (`zh-CN`).

```
i18n/
  en/
    site.json      marketing pages (/, /download/, …) — rendered at build time
    account.json   account center (/account/) — loaded in the browser
  zh-CN/
    site.json      marketing pages (/zh/…)
    account.json
```

- Every namespace file exists in both locales with the same keys; `npm test` and
  `npm run check` fail otherwise. Placeholders use `{name}` and must match across locales.
- **Marketing site**: language is part of the route (`/` English, `/zh/` Chinese). The header
  switch links to the same page in the other language and remembers the choice in
  `localStorage["opx-lang"]`. `content/copy.mjs` maps the files to the renderer.
- **Account center**: `ui/opx-i18n.js` picks the language from `?lang=`, then
  `localStorage["opx-lang"]`, then the browser languages (English by default). The EN / 中文
  button in the top bar switches in place. `src/pages/index.mjs` serves both `account.json`
  files as `/account/assets/i18n.js`; client code calls `T('section.key', {vars})`, static markup
  uses `data-i18n` / `data-i18n-attr`. API error codes map to `account.errors.<code>`.
- Write the English and Chinese strings together. Product names (OpenPlayX, Connector, Relay)
  stay untranslated.
