export const accountAppHTML=`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="color-scheme" content="light dark"><title>用户中心 · OpenPlayX</title><link rel="stylesheet" href="/account/assets/basecoat.css"><link rel="stylesheet" href="/account/assets/opx-theme.css"><link rel="stylesheet" href="/account/assets/account.css"><script src="/account/assets/opx-theme.js"></script><script defer src="/account/assets/account.js"></script></head><body><div id="account-app"><svg class="opx-sprite" aria-hidden="true"><defs><symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></symbol><symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 12h16M4 6h16M4 18h16"/></symbol><symbol id="i-x" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></symbol><symbol id="i-services" viewBox="0 0 24 24"><rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 6h.01M6 18h.01"/></symbol><symbol id="i-connectors" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></symbol><symbol id="i-settings" viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></symbol></defs></svg>
<aside id="account-sidebar" class="sidebar" data-side="left" aria-hidden="false" hidden><nav aria-label="用户中心导航"><header><a class="opx-brand" href="/" aria-label="返回 OpenPlayX 主页"><svg viewBox="0 0 1024 1024" aria-hidden="true"><path fill="#FF5B2B" fill-rule="evenodd" d="M144 220H374Q384 220 390 228L512 346L634 228Q640 220 650 220H880Q890 220 884 228L652 501Q642 512 652 523L884 796Q890 804 880 804H650Q640 804 634 796L512 678L390 796Q384 804 374 804H144Q134 804 140 796L362 523Q372 512 362 501L140 228Q134 220 144 220Z M394 390Q394 354 426 372L614 490Q650 512 614 534L426 652Q394 670 394 634Z"/></svg> OpenPlayX<small>用户中心</small></a></header><section class="scrollbar"><div role="group" aria-labelledby="account-nav-label"><h3 id="account-nav-label">个人工作空间</h3><ul id="account-nav"></ul></div></section><footer class="opx-small">你的媒体，你做主。</footer></nav></aside>
<div class="acct-shell"><header class="opx-topbar"><div class="opx-actions"><button type="button" id="account-sidebar-toggle" class="btn opx-sidebar-toggle" data-variant="ghost" data-size="icon" data-sidebar-toggle aria-label="打开导航" hidden><svg class="opx-icon"><use href="#i-menu"/></svg></button><a id="account-brand" class="opx-brand" href="/" aria-label="返回 OpenPlayX 主页"><svg viewBox="0 0 1024 1024" aria-hidden="true"><path fill="#FF5B2B" fill-rule="evenodd" d="M144 220H374Q384 220 390 228L512 346L634 228Q640 220 650 220H880Q890 220 884 228L652 501Q642 512 652 523L884 796Q890 804 880 804H650Q640 804 634 796L512 678L390 796Q384 804 374 804H144Q134 804 140 796L362 523Q372 512 362 501L140 228Q134 220 144 220Z M394 390Q394 354 426 372L614 490Q650 512 614 534L426 652Q394 670 394 634Z"/></svg> OpenPlayX<small>用户中心</small></a></div><div id="account-identity"><span class="opx-small">平台账号</span></div></header>
<div id="account-notice-wrap" class="acct-notice"><div id="account-notice" class="alert" data-variant="info" role="status" aria-live="polite" hidden></div></div>
<div id="account-content"><main class="opx-container"><div class="opx-page-head"><div><h1>正在打开用户中心</h1><p role="status">正在验证登录状态…</p></div></div></main></div></div>
<dialog id="account-dialog" class="dialog" aria-labelledby="dialog-title"></dialog><noscript><p class="alert" data-variant="warning">用户中心需要启用 JavaScript。</p></noscript></div></body></html>`;
export const accountAppCSS=`/* Account-center layout on top of the shared OpenPlayX UI kit (ui/). */
.sidebar[hidden] + *{margin-left:0}
.acct-shell{min-width:0}
@media (min-width:768px){#account-sidebar:not([hidden]) + .acct-shell #account-brand{display:none}}
.acct-notice{width:100%;max-width:1040px;margin:0 auto;padding:16px 24px 0}
.acct-notice:has(> [hidden]){display:none}
.acct-avatar{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--muted);font-size:12px;font-weight:600}
.acct-name{max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.acct-toolbar{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap}
.acct-search{width:280px;max-width:100%}
.acct-action-cell{text-align:right}
.acct-code{font-family:var(--font-mono);letter-spacing:2px;text-transform:uppercase}
.acct-full{width:100%}
.acct-between{display:flex;justify-content:space-between;align-items:center;gap:12px}
.acct-auth{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,420px);gap:56px;align-items:center;max-width:980px;margin:0 auto;padding:72px 24px}
.acct-story h2{font-size:34px;line-height:1.2;font-weight:650;letter-spacing:-.8px;margin:12px 0}
.acct-story p{color:var(--muted-foreground);margin:0 0 8px}
.acct-auth-card h1{font-size:22px;line-height:1.3;font-weight:650;letter-spacing:-.4px;margin:0}
.acct-auth-card > header > p{margin-top:6px}
@media (max-width:860px){.acct-auth{grid-template-columns:1fr;padding:32px 16px}.acct-story{display:none}.acct-name{display:none}}
@media (max-width:640px){.acct-notice{padding:12px 16px 0}}
`;
