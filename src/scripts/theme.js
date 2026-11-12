// Light / dark theme toggle and mobile menu.
// The inline snippet in Base.astro's <head> has already set data-theme before first paint, so this module (bundled,
// hashed and deferred by Astro) only syncs the toggle labels and wires up events.
const root = document.documentElement;
const colors = { light: '#ffffff', dark: '#131a22' };
const systemDark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)');

function saved() {
  try {
    const t = localStorage.getItem('theme');
    return t === 'light' || t === 'dark' ? t : null;
  } catch (e) { return null; }
}

function apply(theme) {
  root.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', colors[theme]);
  const btn = document.querySelector('.theme-toggle');
  if (btn) {
    const label = 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }
}

apply(root.getAttribute('data-theme') || saved() || (systemDark && systemDark.matches ? 'dark' : 'light'));

const toggle = document.querySelector('.theme-toggle');
if (toggle) {
  toggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
  });
}

// Mobile menu: the Menu button (visible only under 52rem, once scripts run) opens and closes the primary links.
const nav = document.querySelector('.site-nav');
const menu = document.querySelector('.menu-toggle');
if (nav && menu) {
  const setOpen = (open) => {
    nav.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.textContent = open ? 'Close' : 'Menu';
  };
  menu.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); menu.focus(); }
  });
}

// Follow the system setting live, unless the visitor has made an explicit choice.
if (systemDark && systemDark.addEventListener) {
  systemDark.addEventListener('change', (e) => {
    if (!saved()) apply(e.matches ? 'dark' : 'light');
  });
}
