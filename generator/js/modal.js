/* modal.js — Luma-pattern modals. Any [data-modal-event] link opens the full
   event record in a dialog (the inline card/anchor stays as the no-JS path);
   [data-modal-person] opens a leader profile from its hidden [data-person-full]
   twin. Deep links: arriving with #<event-id> opens that event's modal.
   A11y: role=dialog, focus trap, Esc, scrim click, focus restore. */
(function () {
  'use strict';

  var DEPTH = parseInt(document.body.dataset.depth || '0', 10);
  var ROOT = new Array(DEPTH + 1).join('../');
  var EVENTS = null, LABS = null, PEOPLE = null;
  var lastFocus = null;

  /* ------------------------------------------------------------ scaffold */
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.hidden = true;
  overlay.innerHTML = '<div class="modal-panel" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(overlay);
  var panel = overlay.querySelector('.modal-panel');

  var pushedState = false;   /* we pushed a #hash entry when opening — Back should undo it */
  var currentId = null;

  function openModal(html, label) {
    if (window.__genCloseSearch) window.__genCloseSearch();   /* single-overlay rule */
    newsIdx = -1;   /* arrow-key nav only re-arms via openNews */
    if (!overlay.classList.contains('open')) lastFocus = document.activeElement;
    panel.setAttribute('aria-label', label || 'Details');
    panel.innerHTML = '<button class="modal-close" type="button" aria-label="Close">✕</button>' + html;
    overlay.hidden = false;
    overlay.classList.add('open');
    panel.querySelector('.modal-close').focus();
    document.addEventListener('keydown', onKey, true);
  }
  function closeModal(viaHistory) {
    overlay.classList.remove('open');
    overlay.hidden = true;
    document.removeEventListener('keydown', onKey, true);
    /* focus restore: invoker, else the matching inline anchor (deep-link case), else main */
    var target = lastFocus && document.contains(lastFocus) ? lastFocus
      : (currentId && document.getElementById(currentId)) || document.getElementById('main');
    if (target) { if (!target.hasAttribute('tabindex') && !/^(a|button|input|select)$/i.test(target.tagName)) target.setAttribute('tabindex', '-1'); target.focus(); }
    if (pushedState && !viaHistory) {
      pushedState = false;
      history.back();          /* undo our pushState; hash returns to pre-open state */
    }
    /* deep-link arrival (no push): leave the hash alone — it's a shareable anchor */
    currentId = null;
  }
  window.addEventListener('popstate', function () {
    if (overlay.classList.contains('open')) { pushedState = false; closeModal(true); }
  });

  function loadingModal(label) {
    openModal('<div class="modal-body"><p class="muted">Loading…</p></div>', label);
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
    if (e.key === 'Tab') {
      var f = panel.querySelectorAll('button, a[href], input, select, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) closeModal(); });
  overlay.addEventListener('click', function (e) { if (e.target.closest('.modal-close')) closeModal(); });

  /* --------------------------------------------------------- event modal */
  var NEWS = null, PROGRAMS = null;

  function loadData() {
    if (EVENTS) return Promise.resolve();
    return Promise.all([
      fetch(ROOT + 'data/events.json').then(function (r) { return r.json(); }),
      fetch(ROOT + 'data/labs.json').then(function (r) { return r.json(); }),
      fetch(ROOT + 'data/people.json').then(function (r) { return r.json(); }),
      fetch(ROOT + 'data/news.json').then(function (r) { return r.json(); }),
      fetch(ROOT + 'data/community.json').then(function (r) { return r.json(); })
    ]).then(function (r) { EVENTS = r[0].events; LABS = r[1].labs; PEOPLE = r[2].leaders; NEWS = r[3].news; PROGRAMS = r[4].programs; });
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function eventModal(ev) {
    var s = new Date(ev.start), e = new Date(ev.end);
    var opts = { hour: 'numeric', minute: '2-digit' };
    var when = s.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) +
      ' · ' + s.toLocaleTimeString('en-US', opts) + '–' + e.toLocaleTimeString('en-US', opts) + ' ET';
    var chips = '';
    ev.audience.forEach(function (a) { chips += '<span class="chip chip-audience">' + esc(a) + '</span>'; });
    (ev.themes || []).forEach(function (t) { chips += '<span class="chip chip-theme">' + esc(t) + '</span>'; });
    if (ev.beginner_friendly) chips += '<span class="chip chip-beginner">No AI experience needed</span>';
    if (ev.sample) chips += '<span class="chip chip-sample">Sample — prototype data</span>';
    (ev.lab_ids || []).forEach(function (id) {
      var lab = LABS.find(function (l) { return l.id === id; });
      if (lab) chips += '<a class="chip chip-lab" href="' + ROOT + 'labs/' + lab.slug + '.html">' + esc(lab.short_name) + ' Lab</a>';
    });
    var img = ev.image ? '<img src="' + ROOT + esc(ev.image) + '" alt="">' : '';
    var reassure = ev.reassurance ? '<span class="reassure">“' + esc(ev.reassurance) + '”</span>' : '';
    var past = new Date(ev.end) < new Date();
    var actions = '';
    if (!past) {
      actions += '<button class="btn btn-sm" type="button" data-ics="' + esc(ev.id) + '">Add to calendar</button>';
      if (ev.registration_url) actions += ' <a class="btn btn-sm btn-ghost" href="' + esc(ev.registration_url) + '">Register</a>';
    } else {
      if (ev.recording_url) actions += '<a class="btn btn-sm btn-ghost" href="' + esc(ev.recording_url) + '">Recording</a>';
      if (ev.materials_url) actions += ' <a class="btn btn-sm btn-ghost" href="' + esc(ev.materials_url) + '">Materials</a>';
      if (!actions) actions = '<span class="muted">This event has passed — recording/materials not yet posted.</span>';
    }
    if (ev.contact) actions += ' <span class="contact muted" style="margin-left:8px">Contact: ' + esc(ev.contact) + '</span>';
    return img +
      '<div class="modal-body">' +
      '<h2>' + esc(ev.title) + '</h2>' +
      '<div class="event-meta"><span>' + when + '</span><span>' + esc(ev.location) + '</span></div>' +
      '<div class="event-chips">' + chips + '</div>' +
      '<p class="modal-desc">' + esc(ev.description) + reassure + '</p>' +
      '<div class="event-actions">' + actions + '</div>' +
      '</div>';
  }

  function openEvent(id, push, fallbackHref) {
    currentId = id;
    loadingModal('Event details');
    loadData().then(function () {
      var ev = EVENTS.find(function (x) { return x.id === id; });
      if (!ev) { closeModal(); return; }
      panel.innerHTML = '<button class="modal-close" type="button" aria-label="Close">✕</button>' + eventModal(ev);
      panel.setAttribute('aria-label', ev.title);
      panel.querySelector('.modal-close').focus();
      if (push) { history.pushState(null, '', '#' + id); pushedState = true; }
    }).catch(function () {
      closeModal();
      if (fallbackHref) location.href = fallbackHref;   /* data failed: honor the link */
    });
  }

  /* ------------------------------------------------------------ lab modal */
  function labModal(lab) {
    var qs = lab.focus_questions.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('');
    var leaders = PEOPLE.filter(function (p) { return p.lab_ids.indexOf(lab.id) !== -1; })
      .map(function (p) { return p.name; }).join(', ');
    var now = new Date();
    var upcoming = EVENTS.filter(function (ev) {
      return ev.lab_ids.indexOf(lab.id) !== -1 && new Date(ev.end) >= now;
    });
    var evLink = upcoming.length
      ? '<a class="btn btn-sm btn-ghost" href="' + ROOT + 'events/?lab=' + lab.id + '">' + upcoming.length + ' upcoming event' + (upcoming.length > 1 ? 's' : '') + '</a>'
      : '';
    return '<div class="modal-body">' +
      '<div class="modal-lab-head"><img src="' + ROOT + esc(lab.icon) + '" alt="">' +
      '<h2>' + esc(lab.name) + '</h2></div>' +
      '<p class="muted" style="margin:0 0 10px">' + esc(lab.tagline) + '</p>' +
      '<ul class="focus-list">' + qs + '</ul>' +
      '<p class="modal-lab-leaders"><strong>Led by:</strong> ' + esc(leaders) + '</p>' +
      '<div class="event-actions">' +
      '<a class="btn btn-sm" href="' + ROOT + 'labs/' + lab.slug + '.html">Visit the lab page</a>' + evLink +
      '</div></div>';
  }

  /* ------------------------------------------------------------ news modal */
  function newsModal(n, idx) {
    var labs = '';
    (n.lab_ids || []).forEach(function (id) {
      var lab = LABS.find(function (l) { return l.id === id; });
      if (lab) labs += '<a class="chip chip-lab" href="' + ROOT + 'labs/' + lab.slug + '.html">' + esc(lab.short_name) + '</a>';
    });
    (n.themes || []).forEach(function (t) { labs += '<span class="chip chip-theme">' + esc(t) + '</span>'; });
    var dek = n.dek ? '<p class="muted" style="margin:2px 0 0">' + esc(n.dek) + '</p>' : '';
    var summary = n.summary
      ? '<div class="nm-summary">' + esc(n.summary) + '</div>' +
        '<p class="nm-attrib">Prototype summary, written from babson.edu source copy — July 2026. The full story is the source of truth.</p>'
      : '';
    var verb = n.video ? 'Watch on babson.edu' : 'Read the full story on babson.edu';
    return '<div class="modal-body">' +
      '<h2>' + esc(n.title) + '</h2>' + dek +
      '<div class="event-chips" style="margin-top:10px">' + labs + '</div>' +
      summary +
      '<div class="event-actions"><a class="btn" href="' + esc(n.url) + '" rel="external">' + verb + ' →</a></div>' +
      '<div class="nm-nav">' +
      '<button type="button" data-news-nav="-1"' + (idx <= 0 ? ' disabled' : '') + '>← Previous</button>' +
      '<button type="button" data-news-nav="1"' + (idx >= NEWS.length - 1 ? ' disabled' : '') + '>Next story →</button>' +
      '</div></div>';
  }

  var newsIdx = -1;
  function openNews(id) {
    loadingModal('Story');
    loadData().then(function () {
      newsIdx = NEWS.findIndex(function (x) { return x.id === id; });
      if (newsIdx === -1) { closeModal(); return; }
      panel.innerHTML = '<button class="modal-close" type="button" aria-label="Close">✕</button>' + newsModal(NEWS[newsIdx], newsIdx);
      panel.setAttribute('aria-label', NEWS[newsIdx].title);
      panel.querySelector('.modal-close').focus();
    }).catch(function () { closeModal(); });
  }

  panel.addEventListener('click', function (e) {
    var nav = e.target.closest('[data-news-nav]');
    if (nav && NEWS) {
      var next = newsIdx + parseInt(nav.dataset.newsNav, 10);
      if (next >= 0 && next < NEWS.length) openNews(NEWS[next].id);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (!overlay.classList.contains('open') || newsIdx === -1 || !NEWS) return;
    if (e.key === 'ArrowLeft' && newsIdx > 0) openNews(NEWS[newsIdx - 1].id);
    if (e.key === 'ArrowRight' && newsIdx < NEWS.length - 1) openNews(NEWS[newsIdx + 1].id);
  });

  document.addEventListener('click', function (e) {
    var pr = e.target.closest('[data-modal-prog]');
    if (pr) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      var progId = pr.dataset.modalProg;
      var fallback = pr.getAttribute('href');
      loadingModal('Program');
      loadData().then(function () {
        var prog = PROGRAMS.find(function (x) { return x.id === progId; });
        if (!prog) { closeModal(); return; }
        var bullets = (prog.details || []).map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('');
        var ext = /^https?:/.test(prog.cta.href);
        var cta = '<a class="btn" href="' + esc(ext ? prog.cta.href : ROOT + 'community/' + prog.cta.href) + '"' + (ext ? ' rel="external"' : '') + '>' + esc(prog.cta.label) + ' →</a>';
        openModal(
          '<div class="modal-body">' +
          '<h2>' + esc(prog.name) + '</h2>' +
          '<p class="muted" style="margin:2px 0 8px">' + esc(prog.expanded_name) + ' · Standing Program · ' + esc((prog.filter_tags || []).join(' · ')) + '</p>' +
          '<p>' + esc(prog.summary) + '</p>' +
          (bullets ? '<ul class="prog-details">' + bullets + '</ul>' : '') +
          '<div class="event-actions">' + cta + '</div>' +
          '</div>',
          prog.name
        );
      }).catch(function () { closeModal(); if (fallback) location.href = fallback; });
      return;
    }
    var nr = e.target.closest('[data-modal-news]');
    if (nr) {
      e.preventDefault();
      openNews(nr.dataset.modalNews);
      return;
    }
    var t = e.target.closest('[data-modal-event]');
    if (t) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;   /* honor open-in-new-tab */
      e.preventDefault();
      openEvent(t.dataset.modalEvent, true, t.getAttribute('href'));
      return;
    }
    var lt = e.target.closest('[data-modal-lab]');
    if (lt) {
      e.preventDefault();
      loadingModal('Lab overview');
      loadData().then(function () {
        var lab = LABS.find(function (l) { return l.id === lt.dataset.modalLab; });
        if (lab) openModal(labModal(lab), lab.name); else closeModal();
      }).catch(function () { closeModal(); });
      return;
    }
    var p = e.target.closest('[data-modal-person]');
    if (p) {
      e.preventDefault();
      var personId = p.dataset.modalPerson;
      loadingModal('Profile');
      loadData().then(function () {
        var person = PEOPLE.find(function (x) { return x.id === personId; });
        if (!person) { closeModal(); return; }
        var photo = person.photo
          ? '<img class="leader-photo" src="' + ROOT + esc(person.photo) + '" alt="" width="120" height="120" style="float:right;margin:0 0 10px 14px">'
          : '';
        var pubs = (person.publications || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
        var pubsHtml = pubs ? '<p style="margin-bottom:4px"><strong>Recent publications</strong></p><ul>' + pubs + '</ul>' : '';
        var prof = person.profile_url
          ? '<div class="event-actions"><a class="btn btn-sm" href="' + esc(person.profile_url) + '" rel="external">Babson faculty profile →</a></div>'
          : '';
        openModal(
          '<div class="modal-body">' + photo +
          '<h2>' + esc(person.name) + '</h2>' +
          '<p class="muted" style="margin:2px 0 8px">' + person.titles.map(esc).join('<br>') + '<br><em>' + esc(person.role_line) + '</em></p>' +
          (person.quote ? '<blockquote style="border-left:2px solid var(--babson-gold);padding-left:14px;font-style:italic;color:var(--babson-green)">“' + esc(person.quote) + '”</blockquote>' : '') +
          '<p><strong>AI research interests:</strong> ' + person.research_interests.map(esc).join(', ') + '</p>' +
          '<p>' + esc(person.bio) + '</p>' + pubsHtml + prof +
          '</div>',
          person.name + ' — full profile'
        );
      }).catch(function () { closeModal(); });
    }
  });

  /* deep link: #event-id opens the modal on arrival (events page and beyond) */
  if (location.hash) {
    var id = location.hash.slice(1);
    loadData().then(function () {
      if (EVENTS.some(function (x) { return x.id === id; })) openEvent(id, false);
    }).catch(function () { /* data unavailable: the inline anchor still works */ });
  }
})();
