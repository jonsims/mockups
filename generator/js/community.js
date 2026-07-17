/* community.js — the simple four-way program filter. One pill at a time;
   pressing the active pill clears it. */
(function () {
  'use strict';
  var bar = document.querySelector('[data-prog-filter]');
  if (!bar) return;
  var items = document.querySelectorAll('[data-prog]');
  var buttons = bar.querySelectorAll('button');

  function apply(tag) {
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.value === tag)); });
    items.forEach(function (it) {
      it.hidden = !!tag && (it.dataset.tags || '').split('|').indexOf(tag) === -1;
    });
  }
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    apply(b.getAttribute('aria-pressed') === 'true' ? null : b.value);
  });
})();
