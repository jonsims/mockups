/* password gate — content isn't secret; this keeps casual traffic out */
(function () {
  "use strict";
  if (location.protocol === "http:" && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    location.replace("https://" + location.host + location.pathname + location.search + location.hash);
    return;
  }
  if (sessionStorage.getItem("gen-ok") === "1") return;
  var PASS_HASH = "76dc8c7c1d5c6d2b099e30bad24c5b96763cbe9201c32a39702ef8d401e21cf3";
  document.documentElement.style.visibility = "hidden";
  function sha256hex(str) {
    var data = new TextEncoder().encode(str);
    return crypto.subtle.digest("SHA-256", data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return b.toString(16).padStart(2, "0");
      }).join("");
    });
  }
  function showGate() {
    document.documentElement.style.visibility = "";
    var d = document.createElement("div");
    d.id = "gen-gate";
    d.innerHTML = '<style>#gen-gate{position:fixed;inset:0;z-index:9999;background:#006643;display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif}#gen-gate .gc{background:#fff;border-radius:8px;padding:34px 38px;max-width:400px;text-align:center}#gen-gate p{margin:0 0 6px;color:#4a4f4c;font-size:13px;text-transform:uppercase;letter-spacing:.1em;font-weight:600}#gen-gate h1{margin:0 0 14px;font-size:22px;color:#006643}#gen-gate input{width:100%;padding:10px 12px;font-size:16px;border:1px solid #d6d8d2;border-radius:4px;margin-bottom:10px}#gen-gate button{width:100%;padding:10px;font-size:14px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;background:#006643;color:#fff;border:0;border-radius:4px;cursor:pointer}#gen-gate .gm{color:#8e2b2b;font-size:13px;min-height:18px;margin-top:8px}</style>' +
      '<div class="gc"><p>Private design concept</p><h1>The Generator — redesign mock-up</h1>' +
      '<form id="gen-gate-form"><input id="gen-gate-in" type="password" placeholder="Password" autofocus autocomplete="off">' +
      '<button type="submit">Enter</button><div class="gm" id="gen-gate-msg"></div></form></div>';
    document.body.appendChild(d);
    document.body.style.overflow = "hidden";
    document.getElementById("gen-gate-form").addEventListener("submit", function (e) {
      e.preventDefault();
      sha256hex(document.getElementById("gen-gate-in").value.trim().toLowerCase()).then(function (hex) {
        if (hex === PASS_HASH) {
          sessionStorage.setItem("gen-ok", "1");
          document.getElementById("gen-gate").remove();
          document.body.style.overflow = "";
        } else {
          document.getElementById("gen-gate-msg").textContent = "That\u2019s not it. Ask Jon or Erik for the password.";
        }
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showGate);
  else showGate();
})();
