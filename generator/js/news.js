/* news.js — the sortable news table: lab/theme/search filters up top,
   click-to-sort column headers, rows open the story modal (modal.js). */
(function () {
  'use strict';

  var bar = document.querySelector('[data-news-filter]');
  var table = document.querySelector('[data-news-table]');
  if (!bar || !table) return;

  var DEPTH = parseInt(document.body.dataset.depth || '0', 10);
  var ROOT = new Array(DEPTH + 1).join('../');
  var tbody = table.querySelector('tbody');
  var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
  var countEl = document.querySelector('[data-news-count]');
  var emptyEl = document.querySelector('[data-news-empty]');
  var summaries = {};
  var sortKey = 'date', sortDir = -1;   /* newest first by default */

  fetch(ROOT + 'data/news.json')
    .then(function (r) { return r.ok ? r.json() : { news: [] }; })
    .then(function (d) {
      d.news.forEach(function (n) {
        summaries[n.id] = ((n.title || '') + ' ' + (n.dek || '') + ' ' + (n.summary || '')).toLowerCase();
      });
    })
    .catch(function () { /* search falls back to row text */ });

  function applyFilters() {
    var lab = bar.querySelector('[data-nf="lab"]').value;
    var theme = bar.querySelector('[data-nf="theme"]').value;
    var q = bar.querySelector('[data-nf="q"]').value.trim().toLowerCase();
    var shown = 0;
    rows.forEach(function (row) {
      var ok = true;
      if (lab && (row.dataset.labs || '').split(' ').indexOf(lab) === -1) ok = false;
      if (ok && theme && (row.dataset.themes || '').split('|').indexOf(theme) === -1) ok = false;
      if (ok && q) {
        var hay = summaries[row.dataset.modalNews] || row.textContent.toLowerCase();
        if (hay.indexOf(q) === -1) ok = false;
      }
      row.hidden = !ok;
      if (ok) shown++;
    });
    var any = lab || theme || q;
    if (countEl) countEl.textContent = any ? shown + ' of ' + rows.length + ' stories' : rows.length + ' stories';
    if (emptyEl) emptyEl.hidden = shown !== 0;
  }

  function applySort() {
    var sorted = rows.slice().sort(function (a, b) {
      var key = sortKey === 'lab-names' ? 'labNames' : sortKey;
      var av = a.dataset[key] || '';
      var bv = b.dataset[key] || '';
      return av < bv ? -sortDir : av > bv ? sortDir : 0;
    });
    sorted.forEach(function (r) { tbody.appendChild(r); });
    table.querySelectorAll('th[data-sort]').forEach(function (th) {
      var active = th.dataset.sort === sortKey;
      th.setAttribute('aria-sort', active ? (sortDir === 1 ? 'ascending' : 'descending') : 'none');
      th.querySelector('.sort-arrow').textContent = active ? (sortDir === 1 ? '↑' : '↓') : '';
    });
  }

  table.addEventListener('click', function (e) {
    var th = e.target.closest('th[data-sort]');
    if (!th) return;
    if (sortKey === th.dataset.sort) sortDir = -sortDir;
    else { sortKey = th.dataset.sort; sortDir = sortKey === 'date' ? -1 : 1; }
    applySort();
  });

  /* keyboard: rows are focusable; Enter/Space opens the modal (click handled by modal.js) */
  tbody.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr[data-modal-news]')) {
      e.preventDefault();
      e.target.click();
    }
  });

  bar.addEventListener('change', applyFilters);
  bar.addEventListener('input', function (e) {
    if (e.target.matches('[data-nf="q"]')) applyFilters();
  });

  applySort();
  applyFilters();
})();
