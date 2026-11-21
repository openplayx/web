const menu = document.querySelector('.menu-toggle');
const closeMenu = () => {
  document.body.removeAttribute('data-menu');
  menu?.setAttribute('aria-expanded', 'false');
};
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  if (open) document.body.dataset.menu = 'open';
  else document.body.removeAttribute('data-menu');
});
document.querySelectorAll('#site-nav a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.body.dataset.menu === 'open') {
    closeMenu();
    menu?.focus();
  }
});
window.matchMedia('(min-width: 641px)').addEventListener('change', closeMenu);
// Route-based language selection keeps the matching page and section.
// The default root is always English; there is no browser-language redirect.
for (const link of document.querySelectorAll('[data-language]')) {
  const destination = new URL(link.href);
  destination.hash = window.location.hash;
  link.href = destination.href;
  // Remember the choice for the account center and other OpenPlayX web tools (ui/opx-i18n.js).
  link.addEventListener('click', () => {
    try { localStorage.setItem('opx-lang', link.getAttribute('hreflang') === 'zh-CN' ? 'zh-CN' : 'en'); } catch {}
  });
}
const tabs = [...document.querySelectorAll('[data-preview]')];
function activate(tab, focus = false) {
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(item.getAttribute('aria-controls'));
    if (panel) panel.hidden = !selected;
  }
  if (focus) tab.focus();
}
for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => activate(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      activate(tabs[next], true);
    }
  });
}
