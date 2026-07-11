/* SARIMA design concept — interactions */
(function () {
  "use strict";

  /* the gate needs a secure context (crypto.subtle) */
  if (location.protocol === "http:" && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    location.replace("https://" + location.host + location.pathname + location.search + location.hash);
    return;
  }

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
        pills.forEach(function (p) {
          p.classList.toggle("is-active", p === pill);
          p.setAttribute("aria-pressed", p === pill ? "true" : "false");
        });
        var f = pill.getAttribute("data-filter");
        document.querySelectorAll("#event-list .event").forEach(function (ev) {
          ev.classList.toggle("hide", f !== "all" && ev.getAttribute("data-cat") !== f);
        });
      });
    });

    /* ---------- modal manager ---------- */
    var modal = document.getElementById("modal");
    var modalTitle = document.getElementById("modal-title");
    var modalBody = document.getElementById("modal-body");
    var lastFocus = null;
    function openModal(title, buildBody) {
      lastFocus = document.activeElement;
      modalTitle.textContent = title;
      modalBody.className = "modal-body";
      modalBody.innerHTML = "";
      var extra = modal.querySelector(".modal-openfull");
      if (extra) extra.remove();
      buildBody(modalBody);
      modal.hidden = false;
      document.body.classList.add("modal-open");
      modal.querySelector(".modal-x").focus();
    }
    function closeModal() {
      modal.hidden = true;
      document.body.classList.remove("modal-open");
      var f = modalBody.querySelector("iframe");
      if (f) f.src = "about:blank";
      if (lastFocus) lastFocus.focus();
    }
    modal.addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-close")) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) closeModal();
    });

    /* project detail modals */
    var PROJECTS = [
      { t: "Building It Forward for Research (Management) Leadership in Southern Africa",
        b: ["Recognising the critical role that strong institutional research management capacity plays in driving research excellence and attracting external funding, this project specifically targets the advancement of Research Support Offices (RSOs) in universities within the region.", "The project aims to substantially strengthen the research management capacity within these universities, enhancing the overall research ecosystem of the region."] },
      { t: "South African Technology Transfer Survey (SATTS-3)",
        b: ["A South African survey of metrics related to intellectual property and technology transfer at publicly financed research institutions has been conducted twice before. SARIMA has been appointed to conduct the third survey on behalf of the Department of Science, Technology and Innovation (DSTI) and the National Intellectual Property Management Office (NIPMO).", "The data and reports provide insight into the impact of the IPR-PFRD Act and the performance of the Offices of Technology Transfer established in terms of the Act."] },
      { t: "Building the Profession of Research Management Through the Professional Recognition of Research Managers Programme",
        b: ["SARIMA has established the International Professional Recognition Council (IPRC) as an autonomous body to award professional recognition, developed a Pan-African professional recognition programme for research managers, and implemented the initial stages of the programme with the support of various funding partners."] },
      { t: "Science Granting Councils Initiative (SGCI, Phases I and II)",
        b: ["Phase I built sustainable research management capacity in science granting councils in Sub-Saharan Africa.", "Phase II strengthens the practices and resilience of science granting councils in Sub-Saharan Africa in research and grants management."] },
      { t: "Strengthening Research and Innovation Management II (SRIM II) in SADC",
        b: ["The SRIM II Programme follows on from the first SRIM Programme (SRIM I, 2014 to 2017), which was funded by the South African Department of Science and Innovation (DSI), endorsed by the SADC Ministers responsible for Science and Technology, and implemented in partnership with SARIMA, the SADC Secretariat and the SADC Member States."] },
      { t: "Capacity Building Programme: Pathways to Technology Commercialisation",
        b: ["SARIMA is tasked to deliver a bespoke programme for the training of personnel involved in establishing technology transfer functions at various institutions in Botswana."] },
      { t: "Africa Europe Innovation Partnership (AEIP)",
        b: ["The Africa Europe Innovation Partnership is an initiative that aims to accelerate innovation across Africa and Europe."] },
      { t: "Building Research Capacity for sustainable water and food security in drylands of sub-Saharan Africa (BRECcIA)",
        b: ["Developing research capacity across research institutions that is self-sustaining and aimed at improving food and water security for the poorest of society."] },
      { t: "Strengthening of Collaboration, Leadership and Professionalisation in Research Management in SADC and EU Higher Education Institutions (SToRM)",
        b: ["Strengthening research management capacity and collaborations in higher education institutions within the EU and SADC regions."] }
    ];
    document.querySelectorAll(".proj-open").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var p = PROJECTS[parseInt(btn.getAttribute("data-proj"), 10)];
        openModal(p.t, function (body) {
          p.b.forEach(function (par) {
            var el = document.createElement("p");
            el.textContent = par;
            body.appendChild(el);
          });
          var link = document.createElement("p");
          link.innerHTML = '<a class="modal-link" href="https://www.sarima.co.za/projects/" target="_blank" rel="noopener">Full project details on sarima.co.za</a>';
          body.appendChild(link);
        });
      });
    });

    /* newsletter reader modals */
    document.querySelectorAll(".js-newsletter").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var src = a.getAttribute("href");
        openModal(a.getAttribute("data-title"), function (body) {
          body.classList.add("frame");
          var f = document.createElement("iframe");
          f.src = src;
          f.title = a.getAttribute("data-title");
          body.appendChild(f);
          var full = document.createElement("a");
          full.className = "modal-openfull";
          full.href = src;
          full.target = "_blank";
          full.rel = "noopener";
          full.textContent = "Open full page";
          body.parentNode.appendChild(full);
        });
      });
    });

    /* newsletter signup (demo) */
    document.querySelectorAll(".js-signup").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = form.querySelector("input[type=email]");
        if (!input.value || input.value.indexOf("@") < 1) {
          input.focus();
          return;
        }
        var done = document.createElement("p");
        done.className = "signup-done";
        done.setAttribute("role", "status");
        done.innerHTML = "<strong>You're on the list.</strong> The next quarterly edition lands in your inbox." +
          '<span class="fine">Design demo: no address was stored. The production build would connect to SARIMA’s mailing platform.</span>';
        form.replaceWith(done);
        sessionStorage.setItem("nl-signed", "1");
        var nudge = document.getElementById("nudge");
        if (nudge) nudge.hidden = true;
      });
    });

    /* newsletter nudge — appears mid-scroll, once per session */
    var nudge = document.getElementById("nudge");
    function maybeNudge() {
      if (sessionStorage.getItem("nudge-done") || sessionStorage.getItem("nl-signed")) return;
      var doc = document.documentElement;
      var progress = (window.scrollY) / (doc.scrollHeight - window.innerHeight);
      if (progress > 0.45) {
        nudge.hidden = false;
        window.removeEventListener("scroll", maybeNudge);
      }
    }
    if (nudge) {
      window.addEventListener("scroll", maybeNudge, { passive: true });
      document.getElementById("nudge-x").addEventListener("click", function () {
        nudge.hidden = true;
        sessionStorage.setItem("nudge-done", "1");
      });
      document.getElementById("nudge-go").addEventListener("click", function () {
        nudge.hidden = true;
        sessionStorage.setItem("nudge-done", "1");
      });
    }

    /* continuum thread waypoints — one dot per section, lit once passed */
    var thread = document.querySelector(".thread");
    var dots = [];
    if (thread) {
      sections.forEach(function (s) {
        if (!s.closest("main")) return;
        var d = document.createElement("span");
        d.className = "thread-dot";
        thread.appendChild(d);
        dots.push({ el: d, sec: s });
      });
    }
    function placeDots() {
      dots.forEach(function (d) {
        d.el.style.top = (d.sec.offsetTop + 96) + "px";
        d.el.classList.toggle("on", d.sec.getBoundingClientRect().top < window.innerHeight * 0.45);
      });
    }
    placeDots();
    window.addEventListener("scroll", placeDots, { passive: true });
    window.addEventListener("resize", placeDots);
    window.addEventListener("load", placeDots);

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
    var ctaEl = document.getElementById("calc-cta");
    var CTA_LABELS = {
      regular: "Join as an Individual",
      student: "Join as a Student",
      org: "Set up organisational membership"
    };

    function fmt(n) {
      return "R " + n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function renderCalc() {
      var entry = state.type === "org" ? FEES.org[state.size] : FEES[state.type][state.term];
      var target = entry[0];
      noteEl.textContent = entry[1];
      if (ctaEl) ctaEl.textContent = CTA_LABELS[state.type];
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
    function segGroup(attr, key) {
      document.querySelectorAll(".seg[data-" + attr + "]").forEach(function (b) {
        b.addEventListener("click", function () {
          document.querySelectorAll(".seg[data-" + attr + "]").forEach(function (x) {
            x.classList.toggle("is-active", x === b);
            x.setAttribute("aria-pressed", x === b ? "true" : "false");
          });
          state[key] = b.getAttribute("data-" + attr);
          renderCalc();
        });
      });
    }
    segGroup("type", "type");
    segGroup("term", "term");
    segGroup("size", "size");
  }
})();
