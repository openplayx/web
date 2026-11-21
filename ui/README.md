# OpenPlayX UI kit

Shared look for the OpenPlayX web tools: the account center (`web /account`), the admin
console (`admin`) and the Connector manager (`openplayx-connector`). The marketing site keeps
its own stylesheet and only reuses the colors.

- **Components**: [Basecoat](https://basecoatui.com) 1.1.0 (`basecoat-css`, MIT, see
  `vendor/basecoat/LICENSE.md`), the prebuilt `basecoat.cdn.min.css`. No Tailwind and no build
  step; Basecoat's own JavaScript is not used.
- **Theme**: `opx-theme.css` maps the Flutter app's palette (Zinc + teal primary, semantic
  status colors) onto shadcn token names and adds a few `opx-*` layout helpers.
- **Behaviour**: `opx-theme.js` follows the OS light/dark setting by default (overridable with
  `?theme=` or `localStorage["opx-theme"]`), turns any `<button data-theme-toggle>` into a
  system → light → dark switch (icon and label filled in; add `data-theme-toggle-text` to show
  the label too) and drives `.sidebar` on narrow screens.
- **Language**: `opx-i18n.js` is the English / Simplified Chinese runtime. Each project keeps
  its strings in an `i18n/<locale>/<namespace>.json` folder (`en`, `zh-CN`) and registers them
  with `opxI18n.register({en, 'zh-CN'})`. Language comes from `?lang=`, then
  `localStorage["opx-lang"]`, then the browser languages, defaulting to English. Mark static
  markup with `data-i18n="key"` / `data-i18n-attr="placeholder:key"`, call `opxI18n.t(key, vars)`
  from scripts (`{name}` placeholders), and add `<button data-lang-toggle>` for the EN / 中文
  switch. Re-render on the `opx:langchange` event.
- **Logo**: `opx-logo.svg`, the orange mark. Orange is used for the logo only.

Load order in `<head>`:

```html
<link rel="stylesheet" href="…/basecoat.cdn.min.css">
<link rel="stylesheet" href="…/opx-theme.css">
<script src="…/opx-i18n.js"></script>
<script src="…/opx-theme.js"></script>
```

## Source of truth and sync

Edit files here, in `openplayx/web/ui`, then run:

```sh
node scripts/sync-ui.mjs --all   # regenerates ui-kit.mjs + manifest.json, copies to admin and connector
```

`ui-kit.mjs` exports the files as strings for Workers. Every copy checks itself with
`node ui/kit.mjs --check` (the Connector checks the manifest from Go tests), so edits made
to a copy fail its tests.
