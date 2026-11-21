// Marketing-site copy. The strings live in i18n/<locale>/site.json; this keeps the
// route-language keys (en → /, zh → /zh/) used by the renderer.
import en from '../i18n/en/site.json' with { type: 'json' };
import zh from '../i18n/zh-CN/site.json' with { type: 'json' };
export const copy = { en, zh };
