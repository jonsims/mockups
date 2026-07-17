/* calendar.js — mini month calendar on the events page. A wayfinding glance,
   not a date picker: dots mark event days, today gets a ring, clicking an
   event day scrolls to that day's first card. Fill = selected only. */
(function () {
  'use strict';

  var host = document.querySelector('[data-mini-cal]');
  if (!host) return;

  var DEPTH = parseInt(document.body.dataset.depth || '0', 10);
  var ROOT = new Array(DEPTH + 1).join('../');
  var DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  fetch(ROOT + 'data/events.json')
    .then(function (r) { if (!r.ok) throw new Error('events'); return r.json(); })
    .then(function (data) {
      var byDay = {};   /* 'YYYY-MM-DD' -> [event, …] */
      data.events.forEach(function (e) {
        var d = new Date(e.start);
        var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        (byDay[key] = byDay[key] || []).push(e);
      });

      var now = new Date();
      var minMonth = new Date(now.getFullYear(), now.getMonth(), 1);   /* looks forward */
      var months = Object.keys(byDay).map(function (k) { return k.slice(0, 7); });
      var maxKey = months.sort().pop();
      var maxMonth = maxKey ? new Date(+maxKey.slice(0, 4), +maxKey.slice(5, 7) - 1, 1) : minMonth;
      var view = new Date(minMonth);
      var selectedKey = null;

      function monthGrid(y, m) {
        var label = new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        var startDow = (new Date(y, m, 1).getDay() + 6) % 7;   /* Monday-first */
        var daysIn = new Date(y, m + 1, 0).getDate();
        var html = '<div class="mc-month"><div class="mc-head"><span class="mc-label">' + label + '</span></div>' +
          '<div class="mc-grid" role="grid">';
        DOW.forEach(function (d) { html += '<span class="mc-dow" aria-hidden="true">' + d + '</span>'; });
        for (var b = 0; b < startDow; b++) html += '<span class="mc-day other"></span>';
        for (var day = 1; day <= daysIn; day++) {
          var key = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
          var evs = byDay[key];
          var cls = 'mc-day';
          if (evs) cls += ' has-events';
          if (key === selectedKey) cls += ' selected';
          var today = now.getFullYear() === y && now.getMonth() === m && now.getDate() === day;
          if (today) cls += ' today';
          if (evs) {
            html += '<button type="button" class="' + cls + '" data-day="' + key + '" ' +
              'aria-label="' + label + ' ' + day + ' — ' + evs.length + ' event' + (evs.length > 1 ? 's' : '') + '"' +
              (today ? ' aria-current="date"' : '') + '>' + day + '</button>';
          } else {
            html += '<span class="' + cls + '"' + (today ? ' aria-current="date"' : '') + '>' + day + '</span>';
          }
        }
        return html + '</div></div>';
      }

      function render() {
        var atMin = view <= minMonth;
        var next = new Date(view.getFullYear(), view.getMonth() + 1, 1);
        var atMax = next >= maxMonth;
        var html = '<div>' +
          '<button type="button" class="mc-nav" data-mc="-1" aria-label="Earlier"' + (atMin ? ' disabled' : '') + '>‹</button></div>' +
          monthGrid(view.getFullYear(), view.getMonth()) +
          monthGrid(next.getFullYear(), next.getMonth()) +
          '<div><button type="button" class="mc-nav" data-mc="1" aria-label="Later"' + (atMax ? ' disabled' : '') + '>›</button></div>';
        host.innerHTML = html;
      }

      host.addEventListener('click', function (e) {
        var nav = e.target.closest('[data-mc]');
        if (nav) {
          view = new Date(view.getFullYear(), view.getMonth() + parseInt(nav.dataset.mc, 10), 1);
          render();
          return;
        }
        var dayBtn = e.target.closest('[data-day]');
        if (dayBtn) {
          var key = dayBtn.dataset.day;
          selectedKey = selectedKey === key ? null : key;
          render();
          if (selectedKey) {
            var ev = byDay[key][0];
            var card = document.getElementById(ev.id);
            if (card) {
              card.hidden = false;
              var g = card.closest('[data-month-group]');
              if (g) g.hidden = false;
              card.scrollIntoView({ behavior: 'smooth', block: 'center' });
              card.classList.remove('flash');
              void card.offsetWidth;   /* restart animation */
              card.classList.add('flash');
            }
          }
        }
      });

      render();
    })
    .catch(function () { host.hidden = true; });
})();
