/* Sets the theme before first paint: the saved choice, otherwise the system setting. */
(function () {
  var t = null;
  try { t = localStorage.getItem('bm-theme'); } catch (e) { /* storage unavailable */ }
  if (t !== 'light' && t !== 'dark') t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
})();
