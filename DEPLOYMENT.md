# Deployment status

Checked on 2026-11-22.

## Live website

- Worker: `openplayx-web`, Cloudflare Workers Static Assets.
- Production: https://openplayx.com/ and https://www.openplayx.com/.
- Production Chinese: https://openplayx.com/zh/.
- Deployed version: `820d84b2-ed33-41e0-b802-ee1d51fc3bfa`.
- Default English: https://openplayx-web.zhyoulun.workers.dev/
- Chinese: https://openplayx-web.zhyoulun.workers.dev/zh/
- All 10 localized pages, CSS and JavaScript returned HTTP 200; an unknown path returned HTTP 404. Security headers were present.
- Desktop and mobile browser checks covered language switching, the mobile navigation, illustrative preview tabs and download pages.
- `npm run build`, `npm run check` and deployment passed. The checker validated 222 local references and release metadata.

## Download platforms update (2026-11-22)

Published the complete website with v0.0.4 downloads: macOS Universal, Apple Silicon and Intel; Windows x86_64; Linux x86_64 AppImage; Android ARM64, ARMv7, x86_64 and Universal; Android TV. Both home pages link to platform cards, and the Worker supplements omitted assets in the existing same-tag KV manifest from the bundled snapshot. Future CI manifests now retain desktop and TV packages.

`npm run deploy` passed 32 website tests, Worker integration, the complete bilingual docs/site build, 262 local-reference checks and real Static Assets routing checks. Production checks confirmed English and Chinese home/download pages, all 10 installer links, `/release.json`, bilingual docs, an SMB deep route, account and health routes, plus the www download page.

## Full analytics update (2026-11-21)

Enabled browser/OS/device, screen and viewport, referral domains, pageleave duration, Web Vitals, autocapture, heatmaps, session replay, exception capture and anonymous person profiles. SDK extensions are bundled with `posthog-js/full/no-external`; no CDN scripts are needed. Project settings also enable replay (100% sampling), heatmaps, exceptions and Web Vitals. Consent now uses v2 so existing website visitors see the expanded scope before capture starts. Withdrawal stops recording and blocks outgoing events; re-acceptance restarts recording and sends a fresh pageview.

Updated English and Chinese privacy pages. Input values are masked, file-upload controls blocked, network bodies/headers and console recording disabled, and URL query strings/fragments removed. Referral URLs retain origin only. Raw IP discard remains enabled.

Validation: 5 website tests, build and 222-reference check passed. Chrome tests exercised consent, navigation, withdrawal and re-acceptance. Actual validation events retained Chrome/Desktop/viewport fields and pageleave durations with no stored IP; two browser recordings were confirmed via the recordings API. Representative queries for new device/performance, retention, foreground time, completion and funnel insights executed successfully. Managed dashboards now contain Web 16, App 20 and Operations 3 insights, scoped to production origins.

App source also gained screens, interactions, foreground/page duration, playback startup/playing/buffering/completion and task duration. App changes require a new build/install. Existing affected unit/widget suites passed 81 tests; macOS native SDK smoke test also built and passed; static analysis found no errors or warnings (existing informational lints remain); Flutter desktop replay is unsupported by the SDK. Details: `../build/docs/posthog.md`.

## GeoIP update (2026-11-21, prior deployment)

Enabled GeoIP enrichment for consented website events (`$geoip_disable: false`) and updated both privacy pages to describe IP-derived approximate location. PostHog GeoIP transformation is enabled; project IP anonymization stays enabled. The GitHub collector still disables GeoIP. App source also enables GeoIP, effective in newly built versions. Historical events are not backfilled.

Website analytics tests (3), build and reference checks passed; the existing App analytics privacy tests (2) passed. Deployed with the version above. Both production domains and the workers.dev endpoint serve the matching analytics bundle (production checks used public DNS via curl --resolve because the local resolver retains an old record). Direct ingestion validation events for both origins were enriched as Australia / AU with no stored `$ip`; these validate the backend, not an on-device App session.

## PostHog update (2026-11-19, superseded by the full update above)

Optional analytics is now live with English/Chinese consent controls and footer withdrawal. The SDK is bundled locally; CSP allows the US ingestion host. Replay, autocapture, heatmaps, surveys and automatic error collection are disabled. Project ID: 748276. Source contains a public Project Token only; no Personal API Key.

Consent rejection persisted across reload; enabling and withdrawal worked on the production domain. Both domains served the bundle and Chinese privacy page over HTTPS with the expected CSP. Website unit tests cover no initialization before consent, required ingestion token preservation, private URL/referrer removal and withdrawal. Local test events reached PostHog with sanitized URLs and channel attribution; use `?analytics_test=1` for production-domain validation.

`www.openplayx.com` continues to serve the site directly. A proposed host-based `_redirects` rule was rejected by Workers Static Assets and removed before successful deployment.

## Custom domains verified

The owner removed conflicting DNS records, after which `npm run deploy` successfully attached both production domains. Public DNS (1.1.1.1) resolves them to Cloudflare.

Both production hosts passed HTTPS checks for English and Chinese homepages, download pages, CSS and an unknown-path 404. Local DNS still returned the old address at verification time, so these checks connected to the public DNS result using curl `--resolve`, retaining hostname and TLS certificate verification. No certificate checks were disabled.

For subsequent deployments:

```sh
npm run deploy
```

The configured canonical URLs and sitemap target `https://openplayx.com`. The `workers.dev` URL stays available as a preview. Deployment touches only this website Worker and its two custom domains; the existing MCP service is separate.

No credentials are stored in this repository. Deployment uses the operator's local Wrangler authentication.

## Apple TV update (2026-11-22)

Deployed Worker `f53d7ace-6968-427f-af70-e498552e0a5f` with a separate Apple TV card and home-page entry in both languages. The v0.0.4 release now has 11 installers; the Apple TV asset is `openplayx-0.0.4-tvos-arm64-1b353cc389.ipa` (43,220,618 bytes, SHA-256 `86e123d8574aca348298f91f17bd67d3f2082480131818b03e7750f76e436b62`). GitHub re-download matched the local build. SHA256SUMS, release notes, the bundled website snapshot and Cloudflare KV all include the same asset.

This unsigned experimental tvOS 15+ ARM64 IPA requires developer re-signing before sideloading. It includes native VLC, the full FFmpeg codec build, whisper.cpp CPU recognition and sing-box transport. Real tvOS 27.2 simulator checks passed SQLite/cache storage, FFmpeg probe/snapshot, Whisper tiny-model transcription, remote-core lifecycle and VLC decode/pause/seek/resume. Physical-device and Siri Remote validation remain pending.

`npm run deploy` passed 33 website tests, Worker/session integration, bilingual docs generation, 264 website-reference checks and real Static Assets routing checks. Production checks confirmed both home pages, both download pages, Apple TV download targets and re-signing notices, `/release.json` and `/health`. The final IPA contains only release resources, with the required Payload directory and all native frameworks; old IPAs, debug snapshots and model/test-report files are excluded.

## Complete Apple TV update (2026-11-22, supersedes the initial build)

Deployed Worker `820d84b2-ed33-41e0-b802-ee1d51fc3bfa`. Both home/download pages, the bundled release snapshot and production KV now offer 12 installers, including these replacement tvOS 17+ ARM64 builds from app commit `b58c93e793` and Whisper commit `83ff1cf`:

- Sideload/re-sign: `openplayx-0.0.4-tvos-arm64-b58c93e793.ipa`, 131,935,637 bytes, SHA-256 `7861930631fa664568c30cbcb6b08bcfb62461157be91fef1ac5e603270b92e4`.
- Apple Distribution App Store export: `openplayx-0.0.4-tvos-appstore-arm64-b58c93e793.ipa`, 152,421,094 bytes, SHA-256 `11e176abe90696452265970c0c1e5e0b99283dcad95267092bc4d8de228c1cb8`.

The primary button stays on the re-signable IPA. The signed export is for Apple distribution and cannot be installed directly on arbitrary devices. The original export was not uploaded to TestFlight; the corrected signature was subsequently uploaded as recorded below. Both GitHub asset URLs return HTTP 200 with the expected sizes; production English/Chinese home and download pages and `/release.json` contain the current assets and exclude the superseded initial IPA.

The build adds native Sentry/PostHog, local file/folder selection, nearby-device authentication, Continuity recording integration, BGTaskScheduler integration, bundled verified Whisper tiny/Core ML models and Metal/Core ML/Accelerate backends. Existing VLC, full FFmpeg codecs and sing-box remain included. The native PostHog tvOS SDK does not offer iOS-only replay, surveys or push APIs. Simulator Metal is disabled after a reproducible simulator driver crash; physical tvOS still enables Metal. See the application `docs/tvos.md` for exact API and hardware limits.

Validation passed native simulator capture to local Sentry/PostHog endpoints, offline model restoration and real transcription, native channel registration, 51 feature regression tests and 44 final regression tests. The simulator cannot verify Continuity input, real nearby-device login, system background execution or Siri Remote behavior; these remain physical-device checks. The final normal application entry also builds and launches on the simulator. The release was built from isolated committed sources; the App Store export passed deep/strict code-sign verification with Apple Distribution authority.

Website deployment passed 34 tests, Worker/session integration and the bilingual build/reference checks. Build infrastructure validation and six manifest tests passed. The older Apple TV section above records the superseded initial release rather than the current download requirements.

## Apple TV TestFlight upload (2026-11-22)

Created the TV_OS platform for the existing OpenPlayX App Store Connect app and
successfully uploaded version 0.0.4 (4). The first upload exposed a Sentry static
resource framework identifier mismatch; normalizing its linker-generated ad-hoc
signature before Apple export fixed the validation failure. The corrected signed
IPA and SHA256SUMS replace the prior signed export in GitHub Release. The sideload
IPA and application functionality are unchanged. Processing, compliance and beta
review are distinct from successful upload; the shared public group invitation
is https://testflight.apple.com/join/dmt8K5er and does not guarantee tvOS build
availability. Apple’s current TestFlight client requires tvOS 18+.
