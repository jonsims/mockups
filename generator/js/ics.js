/* ics.js — client-generated calendar files.
   Per docs/SPECS.md: SUMMARY/DTSTART;TZID/DTEND;TZID/LOCATION/URL + one-line
   DESCRIPTION. Full VTIMEZONE for America/New_York. No registration URLs. */
(function () {
  'use strict';

  var DEPTH = parseInt(document.body.dataset.depth || '0', 10);
  var ROOT = new Array(DEPTH + 1).join('../');
  var EVENTS = null;

  var VTIMEZONE = [
    'BEGIN:VTIMEZONE',
    'TZID:America/New_York',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0400',
    'TZNAME:EDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500',
    'TZNAME:EST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  ].join('\r\n');

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function localStamp(iso) {
    /* ISO strings in events.json carry the correct ET offset; render the
       local wall-clock time for DTSTART;TZID use. */
    var d = new Date(iso);
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).formatToParts(d).reduce(function (o, p) { o[p.type] = p.value; return o; }, {});
    return parts.year + parts.month + parts.day + 'T' + parts.hour + parts.minute + parts.second;
  }

  function escText(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  function vevent(ev) {
    var firstSentence = (ev.description.split('. ')[0] + '.').slice(0, 200);
    /* canonical events-page anchor regardless of which page triggered the export */
    var base = new URL(ROOT + 'events/', location.href).href;
    var pageURL = base + '#' + ev.id;
    return [
      'BEGIN:VEVENT',
      'UID:' + ev.id + '@generator.babson.edu',
      'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z'),
      'DTSTART;TZID=America/New_York:' + localStamp(ev.start),
      'DTEND;TZID=America/New_York:' + localStamp(ev.end),
      'SUMMARY:' + escText(ev.title + (ev.sample ? ' [SAMPLE]' : '')),
      'LOCATION:' + escText(ev.location),
      'DESCRIPTION:' + escText(firstSentence + ' Details: ' + pageURL),
      'URL:' + pageURL,
      'END:VEVENT'
    ].join('\r\n');
  }

  function calendar(events) {
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//The Generator at Babson College//Prototype//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      VTIMEZONE,
      events.map(vevent).join('\r\n'),
      'END:VCALENDAR'
    ].join('\r\n');
  }

  function download(text, filename) {
    var blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function withEvents(fn) {
    if (EVENTS) { fn(EVENTS); return; }
    fetch(ROOT + 'data/events.json')
      .then(function (r) { return r.json(); })
      .then(function (d) { EVENTS = d.events; fn(EVENTS); });
  }

  document.addEventListener('click', function (e) {
    var one = e.target.closest('[data-ics]');
    if (one) {
      withEvents(function (evs) {
        var ev = evs.find(function (x) { return x.id === one.dataset.ics; });
        if (ev) download(calendar([ev]), ev.id + '.ics');
      });
      return;
    }
    var all = e.target.closest('[data-ics-all]');
    if (all) {
      withEvents(function (evs) {
        var now = new Date();
        var upcoming = evs.filter(function (x) { return new Date(x.end) >= now; });
        if (upcoming.length) download(calendar(upcoming), 'the-generator-upcoming.ics');
      });
    }
  });
})();
