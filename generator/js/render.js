/* render.js — shared enhancements: hero rotator, This Week strip, stat counters,
   scroll reveals, audience selector, quick-find overlay, copy-link.
   Everything here is progressive enhancement; the HTML stands alone without it. */
(function () {
  'use strict';

  var DEPTH = parseInt(document.body.dataset.depth || '0', 10);
  var ROOT = new Array(DEPTH + 1).join('../');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fetchJSON(name) {
    return fetch(ROOT + 'data/' + name + '.json').then(function (r) {
      if (!r.ok) throw new Error(name + ': HTTP ' + r.status);
      return r.json();
    });
  }

  /* ------------------------------------------------------- stat rotation */
  var statLine = document.querySelector('[data-stat-line]');
  if (statLine && !reduceMotion) {
    var items = statLine.querySelectorAll('.sl-item');
    if (items.length > 1) {
      var si = 0;
      setInterval(function () {
        items[si].classList.remove('current');
        si = (si + 1) % items.length;
        items[si].classList.add('current');
      }, 2500);
    }
  }

  /* -------------------------------------------------------- mobile nav */
  var burger = document.querySelector('[data-nav-toggle]');
  var siteNav = document.getElementById('site-nav');
  if (burger && siteNav) {
    burger.addEventListener('click', function () {
      var open = siteNav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
  }

  /* ------------------------------------------------------- ambient video
     Plays only when motion is welcome; on phones it waits for a tap. */
  var ambient = document.querySelector('video[data-ambient]');
  if (ambient) {
    var smallScreen = window.matchMedia('(max-width: 760px)').matches;
    if (reduceMotion) {
      ambient.removeAttribute('loop');
    } else if (smallScreen) {
      ambient.preload = 'none';
      ambient.controls = true;   /* no LTE surprise: tap to play */
    } else {
      ambient.autoplay = true;
      var playAttempt = ambient.play();
      if (playAttempt && playAttempt.catch) playAttempt.catch(function () { /* autoplay blocked; leave poster */ });
    }
  }

  /* (rev A: hero rotator and QWA cycler removed — headline and quotes are static) */

  /* ------------------------------------------------------------ this week
     Renders once, re-renders when the audience selector changes. */
  var tw = document.querySelector('[data-this-week]');
  var twEvents = null;

  function audienceMatches(e, aud) {
    if (!aud) return true;
    if (aud === 'students') return e.audience.indexOf('Students') !== -1;
    if (aud === 'faculty') return e.audience.indexOf('Faculty') !== -1;
    if (aud === 'community') return e.audience.indexOf('Community') !== -1 || e.audience.indexOf('Small Business Owners') !== -1;
    if (aud === 'new') return !!e.beginner_friendly;
    return true;
  }

  function renderThisWeek(aud) {
    if (!tw || !twEvents) return;
    var now = new Date();
    var weekOut = new Date(now.getTime() + 7 * 864e5);
    var future = twEvents
      .filter(function (e) { return new Date(e.end) >= now && audienceMatches(e, aud); })
      .sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    var thisWeek = future.filter(function (e) { return new Date(e.start) <= weekOut; });

      function card(e) {
        var d = new Date(e.start);
        var now2 = new Date();
        var days = Math.ceil((d - now2) / 864e5);
        var when;
        if (new Date(e.start) <= now2 && new Date(e.end) >= now2) when = 'Happening now';
        else if (days <= 0) when = 'Today';
        else if (days === 1) when = 'Tomorrow';
        else when = d.toLocaleDateString('en-US', { weekday: 'long' }) + ' · in ' + days + ' days';
        var sample = e.sample ? ' <span class="chip chip-sample">Sample</span>' : '';
        var badge = e.beginner_friendly ? ' <span class="chip chip-beginner">No AI experience needed</span>' : '';
        return '<div class="tw-card">' +
          '<span class="tw-when">' + when + '</span>' +
          '<span class="tw-title"><a href="' + ROOT + 'events/#' + e.id + '" data-modal-event="' + e.id + '">' + e.title + '</a></span>' +
          '<span class="tw-meta">' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
          ' · ' + e.location + sample + badge + '</span>' +
          '</div>';
      }

      var audNote = aud ? ' <span class="muted">(filtered for you — <button type="button" class="filter-clear" data-audience-clear style="display:inline;padding:0">show all</button>)</span>' : '';
      if (thisWeek.length) {
        tw.innerHTML = thisWeek.slice(0, 3).map(card).join('') +
          (aud ? '<p class="tw-empty" style="grid-column:1/-1;margin:0">' + audNote + '</p>' : '');
      } else if (future.length) {
        var nxt = future[0];
        var d = new Date(nxt.start);
        tw.innerHTML = '<p class="tw-empty">Nothing scheduled this week' + (aud ? ' for you' : '') + ' — next up: <a href="' +
          ROOT + 'events/#' + nxt.id + '" data-modal-event="' + nxt.id + '"><strong>' + nxt.title + '</strong></a>, ' +
          d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) +
          (nxt.sample ? ' <span class="chip chip-sample">Sample</span>' : '') + audNote + '</p>';
      } else {
        tw.innerHTML = '<p class="tw-empty">The next season’s calendar is being finalized — ' +
          '<a href="' + ROOT + 'events/">browse past events and recordings</a> or subscribe on the events page.</p>';
      }
  }

  if (tw) {
    fetchJSON('events').then(function (data) {
      twEvents = data.events;
      renderThisWeek(currentAudience());
    }).catch(function () {
      tw.closest('.this-week').hidden = true;
    });
  }

  /* --------------------------------------------------------- stat counters */
  var stats = document.querySelectorAll('.stat-value[data-count]');
  if (stats.length && !reduceMotion && 'IntersectionObserver' in window) {
    var seen = new WeakSet();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting || seen.has(en.target)) return;
        seen.add(en.target);
        var raw = en.target.dataset.count;
        var m = raw.match(/^([\d,]+)(.*)$/);
        if (!m) return;
        var target = parseInt(m[1].replace(/,/g, ''), 10);
        var suffix = m[2] || '';
        var t0 = performance.now();
        (function tick(t) {
          var p = Math.min((t - t0) / 900, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          var val = Math.round(target * eased);
          en.target.textContent = val.toLocaleString('en-US') + suffix;
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.4 });
    stats.forEach(function (s) { io.observe(s); });
  }

  /* -------------------------------------------------------------- reveals */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      reveals.forEach(function (r) { r.classList.add('in'); });
    } else {
      var rio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); rio.unobserve(en.target); }
        });
      }, { threshold: 0.15 });
      reveals.forEach(function (r) { rio.observe(r); });
    }
  }

  /* ---------------------------------------------------- audience selector
     Rev 4: the selection genuinely changes content — This Week re-renders
     filtered to the audience, and Doors In shows only matching cards. */
  var audBar = document.querySelector('.audience-bar');

  function currentAudience() {
    return new URL(location.href).searchParams.get('audience');
  }

  if (audBar) {
    var grid = document.querySelector('[data-action-grid]');
    var buttons = audBar.querySelectorAll('button[data-audience]');
    var audiencePushed = false;   /* first user filter pushes history so Back undoes it */

    var applyAudience = function (aud, fromHistory) {
      buttons.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.audience === aud));
      });
      if (grid) {
        Array.prototype.forEach.call(grid.children, function (c) {
          c.hidden = !!aud && (c.dataset.audiences || '').split(' ').indexOf(aud) === -1;
        });
      }
      if (!fromHistory) {
        var url = new URL(location.href);
        if (aud) url.searchParams.set('audience', aud); else url.searchParams.delete('audience');
        if (!audiencePushed && aud) {
          history.pushState(null, '', url);
          audiencePushed = true;
        } else {
          history.replaceState(null, '', url);
        }
      }
      /* the choice travels: outbound events links carry the matching filter */
      var EV_PARAM = { students: 'audience=Students', faculty: 'audience=Faculty', community: 'audience=Community', new: 'beginner=1' };
      document.querySelectorAll('[data-aud-travel]').forEach(function (a) {
        var base = a.getAttribute('href').split('?')[0];
        a.setAttribute('href', aud ? base + '?' + EV_PARAM[aud] : base);
      });
      renderThisWeek(aud);
    };

    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        var already = b.getAttribute('aria-pressed') === 'true';
        applyAudience(already ? null : b.dataset.audience);
      });
    });

    /* "show all" link rendered inside the This Week strip */
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-audience-clear]')) applyAudience(null);
    });

    window.addEventListener('popstate', function () {
      applyAudience(currentAudience(), true);
    });

    var initial = currentAudience();
    if (initial) applyAudience(initial, true);
  }

  /* ------------------------------------------------------------ copy link */
  var copyBtn = document.querySelector('[data-copy-link]');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(location.href.split('#')[0]).then(function () {
        var old = copyBtn.textContent;
        copyBtn.textContent = 'Copied ✓';
        setTimeout(function () { copyBtn.textContent = old; }, 1600);
      });
    });
  }

  /* ----------------------------------------------------- quick-find overlay
     role=dialog, focus trap, Esc close, focus restore, aria-live results.   */
  var overlay = document.querySelector('[data-search-overlay]');
  var openBtn = document.querySelector('[data-search-open]');
  if (overlay && openBtn) {
    var input = overlay.querySelector('[data-search-input]');
    var resultsEl = overlay.querySelector('[data-search-results]');
    var lastFocus = null;
    var index = null;
    var activeIdx = -1;

    function buildIndex() {
      if (index) return Promise.resolve(index);
      return Promise.all([fetchJSON('labs'), fetchJSON('events'), fetchJSON('news'), fetchJSON('people'), fetchJSON('community')])
        .then(function (r) {
          var labs = r[0].labs, events = r[1].events, news = r[2].news, people = r[3].leaders, programs = r[4].programs;
          index = [];
          labs.forEach(function (l) {
            index.push({ group: 'Labs', title: l.name, meta: l.tagline, href: ROOT + 'labs/' + l.slug + '.html',
              text: (l.name + ' ' + l.tagline + ' ' + l.focus_questions.join(' ')).toLowerCase(), w: 3 });
          });
          events.forEach(function (e) {
            var d = new Date(e.start);
            index.push({ group: 'Events', title: e.title,
              meta: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + e.location + (e.sample ? ' · sample' : ''),
              href: ROOT + 'events/#' + e.id,
              text: (e.title + ' ' + e.description + ' ' + e.audience.join(' ') + ' ' + (e.themes || []).join(' ')).toLowerCase(), w: 2 });
          });
          people.forEach(function (p) {
            index.push({ group: 'People', title: p.name, meta: p.role_line, href: ROOT + 'labs/' + (r[0].labs.find(function (l) { return l.id === p.lab_ids[0]; }) || {}).slug + '.html#' + p.id,
              text: (p.name + ' ' + p.titles.join(' ') + ' ' + p.research_interests.join(' ')).toLowerCase(), w: 3 });
          });
          news.forEach(function (n) {
            index.push({ group: 'News', title: n.title, meta: n.dek || '', href: n.url,
              text: (n.title + ' ' + (n.dek || '')).toLowerCase(), w: 1 });
          });
          programs.forEach(function (p) {
            index.push({ group: 'Programs', title: p.name, meta: p.expanded_name, href: ROOT + 'community/#' + p.id,
              text: (p.name + ' ' + p.expanded_name + ' ' + p.summary).toLowerCase(), w: 2 });
          });
          return index;
        });
    }

    function defaultState() {
      buildIndex().then(function (idx) {
        var picks = idx.filter(function (it) { return it.group === 'Labs'; }).slice(0, 3)
          .concat(idx.filter(function (it) { return it.group === 'Events'; }).slice(0, 2))
          .concat(idx.filter(function (it) { return it.group === 'Programs'; }).slice(0, 2));
        renderResults(picks, 'Suggested');
      });
    }

    function renderResults(items, forcedGroup) {
      activeIdx = -1;
      if (!items.length) {
        resultsEl.innerHTML = '<div class="search-empty">No matches. Try fewer words — or the ' +
          '<a href="https://www.babson.edu/search/">full Babson search</a>.</div>';
        return;
      }
      var html = '', lastGroup = null;
      items.forEach(function (it, i) {
        var g = forcedGroup || it.group;
        if (g !== lastGroup) { html += '<div class="sr-group">' + g + '</div>'; lastGroup = g; }
        html += '<a href="' + it.href + '" data-idx="' + i + '">' + it.title +
          (it.meta ? '<span class="sr-meta">' + it.meta + '</span>' : '') + '</a>';
      });
      resultsEl.innerHTML = html;
    }

    function search(q) {
      buildIndex().then(function (idx) {
        var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
        if (!terms.length) { defaultState(); return; }
        var scored = [];
        idx.forEach(function (it) {
          var score = 0;
          terms.forEach(function (t) {
            if (it.title.toLowerCase().indexOf(t) !== -1) score += 4;
            else if (it.text.indexOf(t) !== -1) score += 1;
          });
          if (score > 0) scored.push({ it: it, score: score * it.w });
        });
        scored.sort(function (a, b) { return b.score - a.score; });
        var groupOrder = ['Labs', 'People', 'Events', 'Programs', 'News'];
        var items = scored.map(function (s) { return s.it; }).slice(0, 12)
          .sort(function (a, b) { return groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group); });
        renderResults(items);
      });
    }

    function openOverlay() {
      /* never stack on top of an open modal (two focus traps) */
      if (document.querySelector('.modal-overlay.open')) return;
      lastFocus = document.activeElement;
      overlay.hidden = false;
      overlay.classList.add('open');
      input.value = '';
      defaultState();
      input.focus();
      document.addEventListener('keydown', onKey, true);
    }
    function closeOverlay() {
      overlay.classList.remove('open');
      overlay.hidden = true;
      document.removeEventListener('keydown', onKey, true);
      if (lastFocus) lastFocus.focus();
    }
    /* let modal.js close us before it opens (single-overlay rule) */
    window.__genCloseSearch = closeOverlay;
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); closeOverlay(); return; }
      var links = resultsEl.querySelectorAll('a');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!links.length) return;
        activeIdx = e.key === 'ArrowDown'
          ? Math.min(activeIdx + 1, links.length - 1)
          : Math.max(activeIdx - 1, 0);
        links.forEach(function (l, i) { l.classList.toggle('active', i === activeIdx); });
        links[activeIdx].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && activeIdx >= 0 && links[activeIdx]) {
        e.preventDefault();
        links[activeIdx].click();
      } else if (e.key === 'Tab') {
        /* focus trap: keep focus inside the panel */
        var focusables = overlay.querySelectorAll('input, a, button');
        if (!focusables.length) return;
        var first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    openBtn.addEventListener('click', openOverlay);
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); overlay.hidden ? openOverlay() : closeOverlay(); }
    });
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeOverlay(); });
    input.addEventListener('input', function () { search(input.value); });
  }
})();
