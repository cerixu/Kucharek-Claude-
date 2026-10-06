/* Kucharek — wczesne ustawienie wyglądu przed startem modułu aplikacji.
   Osobny plik umożliwia restrykcyjne CSP bez inline JavaScript. */
(function () {
  try {
    var t = localStorage.getItem('k:theme');
    var z = localStorage.getItem('k:tap');
    var s = localStorage.getItem('k:ts');
    var d = document.documentElement;
    if (t) d.setAttribute('data-theme', t);
    if (z) d.setAttribute('data-tap', z);
    if (s) d.style.setProperty('--ts', String(+s / 100));
  } catch (e) {}
})();
