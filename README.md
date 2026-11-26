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
npm test
npm run test:integration    # real workerd; mocked API binding, no cloud purchases
npm run dev                 # Wrangler local Worker and static assets
```

No framework or runtime package is needed by visitors. `content/copy.mjs` contains both languages; `src/render.mjs` renders pages; `public/assets/` contains local styles, scripts and original artwork. `dist/` is generated and ignored.

## Downloads

The home and download pages (both languages), `/release.json` and the account center's Connector packages are rendered by the Worker from the Cloudflare KV namespace `openplayx-web-releases` (binding `RELEASES`, keys `release/openplayx` and `release/connector`). After a published production release, the Jenkins release job writes the new manifest there (`build/scripts/release/website_manifest.py`), so the site shows the new version within about a minute without a redeploy. The Worker validates the value (version tag, GitHub release URLs, macOS Apple Silicon ZIP and Android ARM64 APK present) and otherwise falls back to the bundled snapshots `content/releases.json` and `content/connector-release.json`.

Refresh the snapshots occasionally so the fallback stays recent:

```sh
npm run refresh:releases     # reads GitHub's public API; optional GITHUB_TOKEN stays in environment
npm run build
npm run check
```

The home page and download page list available macOS (Universal, Apple Silicon, Intel), Windows, Linux, Android, Android TV and experimental Apple TV (tvOS) packages from the manifest. Release filenames are matched explicitly, so TV APKs and desktop ZIPs keep their own platforms. The bundled snapshot includes v0.0.4 and supplements omitted assets in a KV manifest with the same tag. Assets are never mixed across release versions.

Installers remain hosted on GitHub, not copied to Cloudflare.

## Cloudflare deployment

Production releases are deployed through **Jenkins `web/site-publish`** (polling `openplayx/web` and `openplayx/docs` `main` every 5 minutes; `web/deploy` is the manual Jenkins entry). Do **not** bypass the Jenkins pipeline with direct local `wrangler deploy` / `npm run deploy` for routine production deployments—Jenkins pins `web`, `docs` and `build` commits under the `web-cloudflare-production` lock, verifies digests, records a rollback baseline and runs live post-deploy checks.

For local verification before pushing:

```sh
npm test
npm run test:integration
npm run build:site
npm run test:docs
npm run check
```

`wrangler.jsonc` names the Worker `openplayx-web`, serves `dist/`, and binds only `openplayx.com` and `www.openplayx.com`. It does not change `mcp-tavily.openplayx.com`, other Workers, email records or other DNS services. Cloudflare manages certificates for the custom domains. Existing conflicting domain bindings must be inspected before replacement.

A dry run is available with `npx wrangler deploy --dry-run`. For Git-connected Cloudflare Builds, use `npm run build && npm run check` as the build command and `npx wrangler deploy` as the deploy command. Authorize that integration separately; no repository integration is automatically installed here.

Do not commit OAuth credentials, API tokens or `.dev.vars`. No account ID, upstream API key or visitor account database is needed in the source. Deployment authorization uses the operator's Cloudflare login.

## Content boundaries

- Product claims follow implemented capabilities; cross-device sync and unvalidated platforms are not presented as finished.
- App illustration and original sample artwork are visibly labelled, and do not expose personal media data.
- Original main app code is MIT; ecosystem services retain their own licenses. Some app build dependencies remain private. This site does not relicense them.
- Account and admin pages use the private API through a fixed service binding. PostHog US analytics (including autocapture, heatmaps and masked session replay) runs on every marketing page by default, with no consent prompt; account pages carry no analytics. See the published privacy page.

## Usage analytics

`content/analytics.json` contains only the public Project Token and US ingestion host. Never add a Personal API Key. `src/analytics.js` is bundled locally; CSP permits only the US ingestion endpoint beyond same-origin resources. `node --test scripts/analytics.test.mjs` checks startup without a prompt, event filtering and URL sanitization.

UTM values are allowlisted in `content/campaigns.json`. Use `?analytics_test=1` for validation events excluded from production dashboards; localhost also uses validation. Normal visits use production. Website clicks are not completed downloads or installs. GitHub counters and backend operations live in the sibling repository `build/docs/posthog.md`.

## License and contribution

See [SOURCES.md](SOURCES.md) for dependency sources, asset provenance and attribution maintenance.

Website code and original illustrations: [MIT](LICENSE). See [NOTICE.md](NOTICE.md), [asset notices](public/NOTICE.md), [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). The app preserves separate third-party licenses, including GPL terms for builds linking sing-box.

## User account center

`/account/` is a signed-in workspace with **My services**, **Connector** and **Account settings**. Guests receive the separate `/account/login` page and return to their intended page after login. Registration, email verification, password setup and recovery have distinct routes and forms. No account page includes marketing analytics or replay.

Services are read-only synchronized results: configuration and add/edit/enable/delete belong to the edge Connector. Every active device signed into the same account automatically receives the account’s enabled services; there is no per-device service grant UI. Connector binding/unbinding and account profile/password/session management remain user-controlled, with confirmation and recent-password reauthentication for sensitive changes. Configuration state is distinguished from real network availability.

`src/account-session.mjs` provides the same-origin `/account/api/*` BFF and an independent **AccountSession** SQLite Durable Object. The browser holds only an opaque `__Host-opx-account` Secure/HttpOnly/SameSite=Lax cookie; Access/Refresh Tokens remain in private server-side storage. The object serializes refresh requests, expires after 30 days and revokes only the current Web login on logout. Each browser session has a separate random identity. Account passwords are sent only to the existing private auth API; request bodies, cookies and tokens are never logged or sent to analytics.

The BFF allowlist permits reading account services/connectors/devices, confirming Connector pairing, removing Connector/device identities, editing display name and reading owned operation progress. It cannot mutate services, grant per-device services, forward arbitrary destinations or access admin/LLM/machine APIs. Writes require exact Origin and JSON. If-Match and pending operation responses are preserved. Public email auth forms use a separate narrow stateless proxy.

`npm test` covers the DOM flows, request contracts, cookie/credential isolation, concurrent refresh and reauthentication. `npm run test:integration` runs the real Worker, persistent session object, mocked API and DOM together, including recovery after object eviction. Tests never send actual mail or buy cloud resources. `wrangler.jsonc` adds only the Web session namespace (`account-sessions-v1`); the API database and all machine identities are separate and unchanged by this binding.

## Independent private admin project

Administrator pages, their JSON proxy, deployment configuration and tests are maintained in the private repository **https://github.com/openplayx/admin**. Its separate **openplayx-admin** Worker serves **https://admin.openplayx.com/**, protected by Cloudflare Access. The API still independently validates admin identities. The main website does not serve admin pages or forward management requests.

`npm run deploy` publishes only the main website and user pages. To update the admin, use its own private repository and deployment command. Old public Git history may still contain the previously published UI; removal from this branch does not make that history private. No credentials were migrated or exposed.

## Public documentation

The independent sibling `docs/` checkout builds Docusaurus at `/docs/` and
`/docs/zh-Hans/`. Use Node 24.16.0 and install both checkouts with `npm ci`.
`npm run build:site` builds both sites, verifies the docs digest manifest and
assembles a clean `dist/docs/`. `npm run dev` / `preview` use this complete build.
`npm run build` is the marketing-only build step for CI assembly, not a complete
production artifact. `npm run deploy` now builds and tests the complete site.

`npm run test:docs` exercises the real local Wrangler Static Assets router,
including nested 404 status, CSP, asset requests and existing website routes.
The Worker handles only `/docs` and `/docs/*` in addition to its existing paths.
Executable Docusaurus bootstrap code is externalized; only the docs subtree
allows inline styles. Marketing and account policies retain their existing CSP.

Standalone docs have no analytics dependency. Assembly adds this site's PostHog
bundle; document SPA navigations each emit one sanitized pageview, including
back/forward navigation but excluding query/hash-only changes. Document analytics
have no autocapture, replay, heatmaps or search text. Unknown document paths map
to a fixed 404 analytics path. Keep `docsRoute()` in `src/analytics.js` aligned
with newly published article routes (unknown paths are deliberately redacted).

Jenkins `web/site-publish` and the legacy `web/deploy` share the same full-run
production lock. The private build repository pins docs as a companion, packages
one Worker plus all assets, blocks old web-only archives, verifies the public
site and restores the previous complete Worker version if verification fails.

Apple TV downloads use a distinct `tvos` platform and an ARM64 IPA. The home page links to its download card; both languages explain that it includes FFmpeg, Whisper and the remote-access core, requires re-signing, and has simulator rather than physical-device validation.

The extended Apple TV build requires tvOS 17+ and includes offline Whisper/Core ML models, platform services and telemetry. Downloads distinguish the re-signable IPA from the Apple Distribution signed App Store export; the signed export does not permit arbitrary-device sideloading.
