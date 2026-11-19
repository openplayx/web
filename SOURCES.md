# 来源与致谢 / Sources and acknowledgements

本文件记录官网可核实的代码、依赖与素材来源。感谢这些项目的维护者。
参考设计、直接使用依赖和复制素材分别说明；每项上游保留自己的许可证。

## 开源依赖

| 项目 | 本站用途 | 版本依据 | 许可来源 |
|---|---|---|---|
| [PostHog JS](https://github.com/PostHog/posthog-js) | `src/analytics.js` 使用的浏览器统计 SDK；同意后启用，本地打包 | `package-lock.json`；当前直接依赖 1.451.2 | Apache-2.0；[随站保留的原文](public/licenses/posthog-js.txt) |
| [esbuild](https://github.com/evanw/esbuild) | 构建时打包统计脚本 | `package-lock.json`；当前直接依赖 0.28.2 | [MIT](https://github.com/evanw/esbuild/blob/main/LICENSE.md) |
| [Cloudflare Workers SDK / Wrangler](https://github.com/cloudflare/workers-sdk) | 静态资源部署与本地开发工具 | `package-lock.json`；当前直接依赖 Wrangler 4.162.0 | MIT OR Apache-2.0；以安装包中的许可文件为准 |

本表列出直接依赖；完整的 npm 解析版本和传递依赖以 `package-lock.json`
为准。构建工具没有作为独立浏览器运行时加载。`public/licenses/` 会随静态资源
复制到 `dist/licenses/`；如果打包器额外生成 `analytics.js.LEGAL.txt`，也应随脚本
一起发布，不应删除。

## 页面、图标与插画

- 双语文案、页面模板、样式和交互实现位于 `content/`、`src/` 和
  `public/assets/`，作为本仓库维护的官网源码发布。
- `afterglow.svg`、`orbit.svg`、`north.svg` 为本站原创示例插画；片名、年份、
  播放位置和界面示意为虚构内容。既有素材声明见 [public/NOTICE.md](public/NOTICE.md)。
- OpenPlayX 标志与应用图标来自 OpenPlayX 项目的设计素材。名称、商标和标志
  不表示第三方背书，也不因源码开放而授予商标权。
- 界面图标路径直接保存在 `src/render.mjs`，没有安装外部图标库。
  当前历史没有逐图标的上游映射；不能据此将所有图标声明为独立原创。
  后续引入或确认上游路径时，应记录项目、文件、版本及其原始许可声明。

## 设计参考的记录范围

当前仓库历史没有列出可核实的网站模板或外部设计参考项目，因此这里不推测
具体借鉴对象。新增参考时，请注明项目链接、参考的页面或交互、对应实现文件，
以及是否复制或改写源码/素材；复制或改写还须保留原始版权与许可文本。
“参考”或“致谢”不能代替对实际使用代码与素材的来源说明。

## 维护

升级依赖时同步检查此清单、锁文件和分发中的许可文本。原始官网代码适用
[MIT](LICENSE)；依赖保留自己的条款。应用、播放器和生态服务的来源与许可
应查看各自仓库，本清单不代表这些组件包含在网站中。
