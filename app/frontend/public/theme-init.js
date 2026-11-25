// Apply saved theme/language before first paint (external file: no inline script, strict CSP).
try {
  var t = localStorage.getItem('ts_theme_mode');
  if (t !== 'light' && t !== 'dark') t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  var l = localStorage.getItem('ts_lang');
  if (l === 'en' || l === 'ro') document.documentElement.lang = l;
} catch (e) {}
