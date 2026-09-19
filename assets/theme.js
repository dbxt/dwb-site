/* Light / dark theme. Runs in <head> so the theme is set before first paint.
   Order of precedence: saved choice, then the visitor's system setting. */
(function () {
  var root = document.documentElement;
  var colors = { light: '#ffffff', dark: '#131a22' };

  function saved() {
    try {
      var t = localStorage.getItem('theme');
      return t === 'light' || t === 'dark' ? t : null;
    } catch (e) { return null; }
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', colors[theme]);
    var btn = document.querySelector('.theme-toggle');
    if (btn) {
      var next = theme === 'dark' ? 'light' : 'dark';
      var label = 'Switch to ' + next + ' mode';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    }
  }

  var systemDark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)');
  apply(saved() || (systemDark && systemDark.matches ? 'dark' : 'light'));

  document.addEventListener('DOMContentLoaded', function () {
    apply(root.getAttribute('data-theme'));
    var btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
    });
  });

  // Follow the system setting live, unless the visitor has made an explicit choice.
  if (systemDark && systemDark.addEventListener) {
    systemDark.addEventListener('change', function (e) {
      if (!saved()) apply(e.matches ? 'dark' : 'light');
    });
  }
})();
