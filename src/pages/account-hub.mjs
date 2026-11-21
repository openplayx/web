export const accountHubHTML=`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>用户中心 · OpenPlayX</title><link rel="stylesheet" href="/account/assets/app.css"><link rel="stylesheet" href="/account/assets/hub.css"></head>
<body><main><a class="brand" href="/">OpenPlayX</a><p class="eyebrow">平台账号与远程访问</p><h1>用户中心</h1><p>使用与手机相同的平台账号，连接你的服务并管理访问权限。</p>
<nav aria-label="用户功能" class="account-options">
<a href="/account/permissions"><h2>管理手机服务权限 <span aria-hidden="true">→</span></h2><p>登录后，选择手机可以访问的服务。</p></a>
<a href="/account/connector"><h2>绑定 Connector <span aria-hidden="true">→</span></h2><p>输入 Connector 管理页生成的配对码，确认绑定到你的账号。</p></a>
<a href="/account/register"><h2>注册账号 <span aria-hidden="true">→</span></h2><p>填写邮箱，通过验证邮件设置平台密码。</p></a>
<a href="/account/recover"><h2>找回密码 <span aria-hidden="true">→</span></h2><p>通过邮件重置平台账号密码。</p></a>
</nav><footer>平台账号与 Admin 的 Cloudflare 登录相互独立。<br><a href="/zh/">返回 OpenPlayX 主页</a></footer></main></body></html>`;
export const accountHubCSS=`main{max-width:760px}.account-options{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:28px 0}.account-options>a{display:block;min-width:0;padding:20px;border:1px solid #dce7e9;border-radius:12px;color:inherit;text-decoration:none}.account-options>a:hover{border-color:#177367;background:#f2f8f6}.account-options>a:focus-visible{outline:3px solid #177367;outline-offset:3px}.account-options h2{display:flex;justify-content:space-between;gap:12px;margin:0;font-size:18px}.account-options h2 span{color:#177367}.account-options p{margin:10px 0 0;font-size:14px}footer a{color:#177367}@media(max-width:600px){.account-options{grid-template-columns:1fr}}
`;
