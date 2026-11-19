# OpenPlayX website

The English/Chinese website for **https://openplayx.com**, deployed to the owner's Cloudflare account using **Workers Static Assets**. This repository is the website, not the Flutter Web player.

Production: **https://openplayx.com/** (English) and **https://openplayx.com/zh/** (Chinese). `www.openplayx.com` also serves the site. The [Cloudflare preview](https://openplayx-web.zhyoulun.workers.dev/) remains available; see [deployment status](DEPLOYMENT.md).

## Pages

| English (default) | Chinese | Purpose |
|---|---|---|
| `/` | `/zh/` | Product, features, interactive interface illustration, FAQ |
| `/download/` | `/zh/download/` | Verified GitHub Release download links and platform status |
| `/ecosystem/` | `/zh/ecosystem/` | Public MCP services and connection overview |
| `/contribute/` | `/zh/contribute/` | Issue, code, documentation and integration contributions |
| `/privacy/` | `/zh/privacy/` | Website hosting and app/service data boundaries |

Language links keep the corresponding page and current hash. The root always defaults to English; there is no locale-detection redirect. Localized copy is rendered to HTML at build time, so reading and navigation work without JavaScript. JavaScript handles navigation, illustrative tabs and optional consented analytics.

## Local development

Requires Node.js 22+.

```sh
npm install
npm run build
npm run check
npm run dev                 # http://127.0.0.1:4173
```

No framework or runtime package is needed by visitors. `content/copy.mjs` contains both languages; `src/render.mjs` renders pages; `public/assets/` contains local styles, scripts and original artwork. `dist/` is generated and ignored.

## Downloads

`content/releases.json` is a reviewed snapshot of the real public GitHub Release. The initial version is `v0.0.1`: macOS Apple Silicon and Android APKs. Other platforms are described as in progress, with no invented download links.

```sh
npm run refresh:releases     # reads GitHub's public API; optional GITHUB_TOKEN stays in environment
npm run build
npm run check
```

Review architecture names and installation notes when refreshing. Publishing does not happen just because GitHub has a new release; build and deploy the reviewed website snapshot. Installers remain hosted on GitHub, not copied to Cloudflare.

## Cloudflare deployment

```sh
npx wrangler login          # local interactive owner authentication, if not already logged in
npm run deploy
```

`wrangler.jsonc` names the Worker `openplayx-web`, serves `dist/`, and binds only `openplayx.com` and `www.openplayx.com`. It does not change `mcp-tavily.openplayx.com`, other Workers, email records or other DNS services. Cloudflare manages certificates for the custom domains. Existing conflicting domain bindings must be inspected before replacement.

A dry run is available with `npx wrangler deploy --dry-run`. For Git-connected Cloudflare Builds, use `npm run build && npm run check` as the build command and `npx wrangler deploy` as the deploy command. Authorize that integration separately; no repository integration is automatically installed here.

Do not commit OAuth credentials, API tokens or `.dev.vars`. No account ID, upstream API key or visitor account database is needed in the source. Deployment authorization uses the operator's Cloudflare login.

## Content boundaries

- Product claims follow implemented capabilities; cross-device sync and unvalidated platforms are not presented as finished.
- App illustration and original sample artwork are visibly labelled, and do not expose personal media data.
- Original main app code is MIT; ecosystem services retain their own licenses. Some app build dependencies remain private. This site does not relicense them.
- No mailing-list form, ads or account system is included. PostHog US analytics starts only after consent; visitors can reject or withdraw through the footer. No replay or automatic click collection. See the published privacy page.

## Usage analytics

`content/analytics.json` contains only the public Project Token and US ingestion host. Never add a Personal API Key. `src/analytics.js` is bundled locally; CSP permits only the US ingestion endpoint beyond same-origin resources. `node --test scripts/analytics.test.mjs` checks consent, withdrawal and URL sanitization.

UTM values are allowlisted in `content/campaigns.json`. Use `?analytics_test=1` for validation events excluded from production dashboards; localhost also uses validation. Normal visits use production. Website clicks are not completed downloads or installs. GitHub counters and backend operations live in the sibling repository `build/docs/posthog.md`.

## License and contribution

See [SOURCES.md](SOURCES.md) for dependency sources, asset provenance and attribution maintenance.

Website code and original illustrations: [MIT](LICENSE). See [NOTICE.md](NOTICE.md), [asset notices](public/NOTICE.md), [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). The app preserves separate third-party licenses, including GPL terms for builds linking sing-box.
