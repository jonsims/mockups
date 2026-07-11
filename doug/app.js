/* SARIMA design concept — interactions */
(function () {
  "use strict";

  var PASS_HASH = "accc048499b8418b697201ef3cb7162f6a901238ce0fff79555adb86e96b962b";
  var gate = document.getElementById("gate");
  var site = document.getElementById("site");
  var form = document.getElementById("gate-form");
  var input = document.getElementById("gate-input");
  var msg = document.getElementById("gate-msg");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function sha256hex(str) {
    var data = new TextEncoder().encode(str);
    return crypto.subtle.digest("SHA-256", data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return b.toString(16).padStart(2, "0");
      }).join("");
    });
  }

  function unlock() {
    gate.remove();
    site.hidden = false;
    initSite();
  }

  if (sessionStorage.getItem("doug-ok") === "1") {
    unlock();
  }

  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    sha256hex(input.value.trim().toLowerCase()).then(function (hex) {
      if (hex === PASS_HASH) {
        sessionStorage.setItem("doug-ok", "1");
        unlock();
      } else {
        msg.textContent = "That’s not it. Ask Jon for the password.";
        var card = gate.querySelector(".gate-card");
        card.classList.remove("shake");
        void card.offsetWidth;
        card.classList.add("shake");
        input.select();
      }
    });
  });

  /* ---------- everything below runs once unlocked ---------- */
  function initSite() {
    var nav = document.getElementById("topnav");
    var hero = document.querySelector(".hero");
    var links = document.getElementById("nav-links");
    var burger = document.getElementById("nav-burger");

    /* nav solidifies past the hero */
    function navState() {
      var past = hero.getBoundingClientRect().bottom < 70;
      nav.classList.toggle("solid", past);
    }
    navState();
    window.addEventListener("scroll", navState, { passive: true });

    /* mobile menu */
    burger.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) nav.classList.add("solid");
      else navState();
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        links.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      }
    });

    /* active nav link */
    var sections = Array.prototype.slice.call(document.querySelectorAll("section[id], footer[id]"));
    var navAs = Array.prototype.slice.call(links.querySelectorAll("a"));
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navAs.forEach(function (a) {
          a.classList.toggle("is-here", a.getAttribute("href") === "#" + en.target.id);
        });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach(function (s) { spy.observe(s); });

    /* reveals */
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

    /* count-up stats */
    function countUp(el) {
      var end = parseInt(el.getAttribute("data-count"), 10);
      var suffix = el.getAttribute("data-suffix") || "";
      if (reduced) { el.textContent = end + suffix; return; }
      var t0 = null;
      var dur = 1200;
      function step(t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(end * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          countUp(en.target);
          cio.unobserve(en.target);
        }
      });
    }, { threshold: 0.6 });
    document.querySelectorAll("[data-count]").forEach(function (el) { cio.observe(el); });

    /* continuum thread fill */
    var fill = document.getElementById("thread-fill");
    var main = document.getElementById("main");
    function threadState() {
      if (!fill) return;
      var r = main.getBoundingClientRect();
      var vh = window.innerHeight;
      var total = r.height - vh;
      var done = Math.min(Math.max(-r.top, 0), total);
      fill.style.transform = "scaleY(" + (total > 0 ? done / total : 0) + ")";
    }
    threadState();
    window.addEventListener("scroll", threadState, { passive: true });
    window.addEventListener("resize", threadState);

    /* professionalisation tabs */
    var tabs = document.querySelectorAll(".tab");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
          var panel = document.getElementById(t.getAttribute("aria-controls"));
          panel.classList.toggle("is-active", on);
          panel.hidden = !on;
        });
      });
    });

    /* event filters */
    var pills = document.querySelectorAll(".pill");
    pills.forEach(function (pill) {
      pill.addEventListener("click", function () {
        pills.forEach(function (p) { p.classList.toggle("is-active", p === pill); });
        var f = pill.getAttribute("data-filter");
        document.querySelectorAll("#event-list .event").forEach(function (ev) {
          ev.classList.toggle("hide", f !== "all" && ev.getAttribute("data-cat") !== f);
        });
      });
    });

    /* projects drag-scroll */
    var strip = document.getElementById("proj-scroll");
    var dragging = false, startX = 0, startL = 0;
    strip.addEventListener("pointerdown", function (e) {
      dragging = true; startX = e.clientX; startL = strip.scrollLeft;
      strip.setPointerCapture(e.pointerId);
    });
    strip.addEventListener("pointermove", function (e) {
      if (dragging) strip.scrollLeft = startL - (e.clientX - startX);
    });
    ["pointerup", "pointercancel"].forEach(function (evn) {
      strip.addEventListener(evn, function () { dragging = false; });
    });

    /* membership calculator */
    var FEES = {
      regular: { 1: [985.14, "Regular individual membership, per year."],
                 3: [2955.42, "Regular 3-year membership: lock in the first-year rate for three years."] },
      student: { 1: [493.44, "Student membership (full-time students), per year."],
                 3: [1480.33, "Student 3-year membership: the first-year rate, held for three years."] },
      org: { 10: [8866.26, "10 individual memberships: pay for 9, get 1 free."],
             15: [11821.68, "15 individual memberships: pay for 12, get 3 free."],
             20: [13791.97, "20 individual memberships: pay for 14, get 6 free."] }
    };
    var state = { type: "regular", term: "1", size: "10" };
    var amountEl = document.getElementById("calc-amount");
    var noteEl = document.getElementById("calc-note");
    var termRow = document.getElementById("term-row");
    var sizeRow = document.getElementById("size-row");

    function fmt(n) {
      return "R " + n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function renderCalc() {
      var entry = state.type === "org" ? FEES.org[state.size] : FEES[state.type][state.term];
      var target = entry[0];
      noteEl.textContent = entry[1];
      termRow.hidden = state.type === "org";
      sizeRow.hidden = state.type !== "org";
      if (reduced) { amountEl.textContent = fmt(target); return; }
      var from = parseFloat(amountEl.textContent.replace(/[^\d.]/g, "")) || 0;
      var t0 = null, dur = 450;
      function step(t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 2);
        amountEl.textContent = fmt(from + (target - from) * eased);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    document.querySelectorAll(".seg[data-type]").forEach(function (b) {
      b.addEventListener("click", function () {
        document.querySelectorAll(".seg[data-type]").forEach(function (x) { x.classList.toggle("is-active", x === b); });
        state.type = b.getAttribute("data-type");
        renderCalc();
      });
    });
    document.querySelectorAll(".seg[data-term]").forEach(function (b) {
      b.addEventListener("click", function () {
        document.querySelectorAll(".seg[data-term]").forEach(function (x) { x.classList.toggle("is-active", x === b); });
        state.term = b.getAttribute("data-term");
        renderCalc();
      });
    });
    document.querySelectorAll(".seg[data-size]").forEach(function (b) {
      b.addEventListener("click", function () {
        document.querySelectorAll(".seg[data-size]").forEach(function (x) { x.classList.toggle("is-active", x === b); });
        state.size = b.getAttribute("data-size");
        renderCalc();
      });
    });
  }
})();
