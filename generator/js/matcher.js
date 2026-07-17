/* matcher.js — the find-your-lab compass. Transparent weights from
   data/matcher.json; top-2 labs by score, pin_position breaks ties;
   role-forked next step. No black box, no funnel bias. */
(function () {
  'use strict';

  var form = document.querySelector('[data-matcher]');
  if (!form) return;

  var DEPTH = parseInt(document.body.dataset.depth || '0', 10);
  var ROOT = new Array(DEPTH + 1).join('../');
  var resultEl = form.querySelector('[data-matcher-result]');

  function val(name) {
    var el = form.querySelector('select[name="' + name + '"], input[name="' + name + '"]:checked');
    return el && el.value ? el.value : null;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var role = val('q1'), draw = val('q2'), engage = val('q3');
    if (!role || !draw || !engage) {
      resultEl.innerHTML = '<p class="muted">Answer all three questions to get a match — every answer moves the needle.</p>';
      return;
    }
    Promise.all([
      fetch(ROOT + 'data/matcher.json').then(function (r) { return r.json(); }),
      fetch(ROOT + 'data/labs.json').then(function (r) { return r.json(); })
    ]).then(function (res) {
      var m = res[0], labs = res[1].labs;
      var byId = {};
      labs.forEach(function (l) { byId[l.id] = l; });

      var opt = m.q2.options.find(function (o) { return o.id === draw; });
      var scores = {};
      Object.keys(opt.weights).forEach(function (id) { scores[id] = opt.weights[id]; });

      var ranked = Object.keys(scores).sort(function (a, b) {
        return (scores[b] - scores[a]) || (byId[a].pin_position - byId[b].pin_position);
      }).slice(0, 2);

      var next = (m.next_steps[role] || {})[engage];
      var cards = ranked.map(function (id) {
        var lab = byId[id];
        return '<div class="mr-card">' +
          '<h3><a href="' + ROOT + 'labs/' + lab.slug + '.html">' + lab.name + '</a></h3>' +
          '<p class="lab-q">“' + lab.focus_questions[0] + '”</p>' +
          '<p class="muted">' + lab.get_involved + '</p>' +
          '</div>';
      }).join('');

      var nextHtml = next
        ? '<p><a class="btn" href="' + next.href.replace(/^\.\.\//, ROOT) + '">' + next.label + ' →</a></p>'
        : '';

      resultEl.innerHTML =
        '<h3 style="margin-top:0">Your labs</h3>' + cards + nextHtml +
        '<p class="muted">Not the right fit? Every tile above shows its lab\'s focus question.</p>';
      resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
})();
