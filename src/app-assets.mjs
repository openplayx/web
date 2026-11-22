// Explicit release filename matching keeps TV packages and desktop ZIPs distinct.
export const appPlatforms = ['macos', 'windows', 'linux', 'android', 'android-tv', 'tvos'];
export function appAsset(name) {
  const match = name.match(/^openplayx-\d+\.\d+\.\d+-(macos-(?:arm64|x86_64|universal)|windows-x64|linux-(?:amd64|arm64)|tvos-(?:appstore-)?arm64|android(?:-(?:arm64|armv7|x64|tv))?)-[0-9a-f]{7,40}\.(zip|ipa|apk|AppImage|tar\.gz)$/);
  if (!match) return null;
  const [, target, format] = match;
  const platform = target === 'android-tv' ? target : target.split('-')[0];
  if (!({macos:['zip'],windows:['zip'],linux:['AppImage','tar.gz'],android:['apk'],'android-tv':['apk'],tvos:['ipa']}[platform]?.includes(format))) return null;
  const arch = target.slice(platform.length + 1);
  return {platform, architecture: {arm64: platform === 'macos' ? 'Apple Silicon' : 'ARM64', x86_64:'Intel', universal:'Universal', amd64:'x86_64', x64:'x86_64', armv7:'ARMv7', 'appstore-arm64':'ARM64 · App Store'}[arch] || 'Universal'};
}
export function sortAppAssets(assets) {
  const rank = ['Universal', 'Apple Silicon', 'Intel', 'ARM64', 'ARMv7', 'x86_64', 'ARM64 · App Store'];
  return assets.sort((a,b) => appPlatforms.indexOf(a.platform)-appPlatforms.indexOf(b.platform) || rank.indexOf(a.architecture)-rank.indexOf(b.architecture));
}
