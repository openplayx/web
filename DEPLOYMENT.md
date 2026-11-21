# Deployment status

Checked on 2026-11-21.

## Live website

- Worker: `openplayx-web`, Cloudflare Workers Static Assets.
- Production: https://openplayx.com/ and https://www.openplayx.com/.
- Production Chinese: https://openplayx.com/zh/.
- Deployed version: `a97a959c-d3f9-424c-a717-2a68b7e140ea`.
- Default English: https://openplayx-web.zhyoulun.workers.dev/
- Chinese: https://openplayx-web.zhyoulun.workers.dev/zh/
- All 10 localized pages, CSS and JavaScript returned HTTP 200; an unknown path returned HTTP 404. Security headers were present.
- Desktop and mobile browser checks covered language switching, the mobile navigation, illustrative preview tabs and download pages.
- `npm run build`, `npm run check` and deployment passed. The checker validated 222 local references and release metadata.

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
