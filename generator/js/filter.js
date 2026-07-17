/* filter.js — events page filtering. URL-param driven and shareable:
   ?audience=Faculty&lab=ai-ethics-society&theme=Critical+Inquiry&month=2026-10&beginner=1
   Cards are pre-rendered in HTML; this only shows/hides. */
(function () {
  'use strict';

  var bar = document.querySelector('[data-filter-bar]');
  if (!bar) return;

  var cards = document.querySelectorAll('[data-event]');
  var groups = document.querySelectorAll('[data-month-group]');
  var emptyFiltered = document.querySelector('[data-empty-filtered]');
  var countEl = document.querySelector('[data-results-count]');
  var clearBtns = document.querySelectorAll('[data-filter-clear]');

  var state = { audience: null, lab: null, theme: null, month: null, beginner: null, q: null };
  var cardText = new Map();
  cards.forEach(function (c) { cardText.set(c, c.textContent.toLowerCase()); });

  function readURL() {
    var p = new URL(location.href).searchParams;
    state.audience = p.get('audience');
    state.lab = p.get('lab');
    state.theme = p.get('theme');
    state.month = p.get('month');
    state.beginner = p.get('beginner');
    state.q = p.get('q');
  }

  var filterPushed = false;   /* first user-applied filter pushes history so Back undoes it */

  function writeURL() {
    var url = new URL(location.href);
    ['audience', 'lab', 'theme', 'month', 'beginner', 'q'].forEach(function (k) {
      if (state[k]) url.searchParams.set(k, state[k]); else url.searchParams.delete(k);
    });
    var any = Object.keys(state).some(function (k) { return state[k]; });
    if (!filterPushed && any) {
      history.pushState(null, '', url);
      filterPushed = true;
    } else {
      history.replaceState(null, '', url);
    }
  }

  function syncUI() {
    bar.querySelectorAll('button[data-f]').forEach(function (b) {
      var k = b.dataset.f === 'theme' ? 'theme' : b.dataset.f;
      b.setAttribute('aria-pressed', String(state[k] === b.value));
    });
    bar.querySelectorAll('select[data-f]').forEach(function (sel) {
      sel.value = state[sel.dataset.f] || '';
    });
    var begChk = bar.querySelector('input[data-f-check="beginner"]');
    var qIn = bar.querySelector('[data-f-q]');
    if (qIn && qIn.value !== (state.q || '')) qIn.value = state.q || '';
    if (begChk) begChk.checked = state.beginner === '1';
    /* a hidden-dimension filter arriving via deep link must be visible */
    var more = bar.querySelector('[data-fb-more]');
    if (more && (state.lab || state.month || state.beginner)) more.open = true;
    var any = Object.keys(state).some(function (k) { return state[k]; });
    clearBtns.forEach(function (c) { c.hidden = !any; });
  }

  function matches(card) {
    if (state.audience && (card.dataset.audience || '').split('|').indexOf(state.audience) === -1) return false;
    if (state.lab && (card.dataset.labs || '').split(' ').indexOf(state.lab) === -1) return false;
    if (state.theme && (card.dataset.themes || '').split('|').indexOf(state.theme) === -1) return false;
    if (state.month && card.dataset.month !== state.month) return false;
    if (state.beginner && card.dataset.beginner !== '1') return false;
    if (state.q && (cardText.get(card) || '').indexOf(state.q.toLowerCase()) === -1) return false;
    return true;
  }

  function apply() {
    var shownUpcoming = 0, shownTotal = 0;
    var hashId = location.hash ? location.hash.slice(1) : null;
    cards.forEach(function (c) {
      var ok = matches(c);
      /* a deep-linked event stays visible even if filters exclude it — and counts */
      if (!ok && hashId && c.id === hashId) ok = true;
      c.hidden = !ok;
      if (ok) {
        shownTotal++;
        if (c.dataset.past === '0') shownUpcoming++;
      }
    });
    groups.forEach(function (g) {
      var visible = g.querySelectorAll('[data-event]:not([hidden])').length;
      g.hidden = visible === 0;
    });
    var any = Object.keys(state).some(function (k) { return state[k]; });
    if (emptyFiltered) emptyFiltered.hidden = !(any && shownTotal === 0);
    if (countEl) {
      countEl.textContent = any
        ? 'Showing ' + shownTotal + ' event' + (shownTotal === 1 ? '' : 's') +
          ' (' + shownUpcoming + ' upcoming) matching your filters'
        : 'Showing all ' + shownTotal + ' events (' + shownUpcoming + ' upcoming)';
    }
    syncUI();
    writeURL();
  }

  bar.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-f]');
    if (!b) return;
    var k = b.dataset.f;
    state[k] = state[k] === b.value ? null : b.value;
    apply();
  });
  bar.addEventListener('input', function (e) {
    if (e.target.matches('[data-f-q]')) {
      state.q = e.target.value.trim() || null;
      apply();
    }
  });
  bar.addEventListener('change', function (e) {
    var s = e.target.closest('select[data-f]');
    if (s) {
      state[s.dataset.f] = s.value || null;
      apply();
      return;
    }
    var c = e.target.closest('input[data-f-check]');
    if (c) {
      state[c.dataset.fCheck] = c.checked ? c.value : null;
      apply();
    }
  });
  clearBtns.forEach(function (c) {
    c.addEventListener('click', function () {
      state = { audience: null, lab: null, theme: null, month: null, beginner: null, q: null };
      apply();
    });
  });

  window.addEventListener('popstate', function () {
    readURL();
    apply();
  });

  readURL();
  apply();
})();
