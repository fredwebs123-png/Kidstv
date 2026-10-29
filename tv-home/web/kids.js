// Kidstv: the girls' layer over the couch-tv home. Loaded before app.js, which calls into
// window.KIDS. It adds:
//   - each girl's own colour and emoji (the head icon, the list, the focus ring follow whoever is picked)
//   - a home row of only the kids' apps; everything else waits behind More apps
//   - a grown-up PIN in front of More apps and Settings, made on the TV the first time it is needed
//     (and changed from the Settings tile), kept on the TV only, never in git
//   - the bedtime screen: from bedtime until morning the home shows "Goodnight" and opens nothing,
//     until a grown-up types the PIN and gives some extra time
// Settings are home.kids in config.json (docs/KIDS.md); anything left out uses DEFAULTS below.
(function () {
  "use strict";

  var DEFAULTS = {
    enabled: true,
    // by person id (people in config.json); any emoji the TV's font has
    emoji: { blake: "🦋", lucy: "🌈", sora: "🐣" },
    // the only apps on the home row, in this order; the rest are behind More apps (PIN).
    // YouTube, not YouTube Kids: Google retired the YouTube Kids TV app in 2024, and each girl's
    // YouTube Kids profile now lives inside the YouTube app.
    home_apps: ["com.google.android.youtube.tv", "com.disney.disneyplus", "com.netflix.ninja", "com.amazon.amazonvideo.livingroom"],
    // null: a grown-up makes the PIN on the TV the first time; "1234": start with this one;
    // false: no grown-up lock at all
    pin: null,
    // 24 hour times. weekend_from is Friday and Saturday nights (leave it out for the same every night)
    bedtime: { from: "19:30", until: "07:00", weekend_from: "20:00" },
    // how long a right PIN keeps More apps and Settings open
    unlock_minutes: 5
  };
  var KID_SCENES = ["rainbow", "candy", "stars"];

  var home = (window.COUCH_CONFIG && window.COUCH_CONFIG.home) || {};
  var given = home.kids && typeof home.kids === "object" ? home.kids : {};
  var C = {};
  Object.keys(DEFAULTS).forEach(function (k) { C[k] = given[k] !== undefined ? given[k] : DEFAULTS[k]; });
  var ON = C.enabled !== false;
  var LOCK = C.pin !== false && C.pin !== "";
  var CFG_PIN = /^\d{4}$/.test(String(C.pin)) ? String(C.pin) : "";
  var BED = parseBedtime(C.bedtime);
  var APPS = Array.isArray(C.home_apps) ? C.home_apps.filter(function (p) { return typeof p === "string"; }) : [];
  var EMOJI = C.emoji && typeof C.emoji === "object" ? C.emoji : {};

  function mins(s) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || ""));
    return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null;
  }
  function parseBedtime(b) {
    if (!b || typeof b !== "object") return null;
    var from = mins(b.from), until = mins(b.until);
    if (from == null || until == null) return null;
    var wk = mins(b.weekend_from);
    return { from: from, until: until, weekend: wk == null ? from : wk };
  }
  // Is it bedtime at this moment? Fridays and Saturdays start at weekend_from.
  function bedtimeAt(d) {
    if (!BED) return false;
    var t = d.getHours() * 60 + d.getMinutes(), day = d.getDay();
    var from = day === 5 || day === 6 ? BED.weekend : BED.from;
    if (from > BED.until) return t >= from || t < BED.until;   // over midnight, the usual case
    return t >= from && t < BED.until;
  }
  // The next morning's wake-up time, for "until morning" and the bedtime screen.
  function nextMorning(d) {
    var m = new Date(d.getTime());
    m.setHours(Math.floor(BED.until / 60), BED.until % 60, 0, 0);
    if (m <= d) m.setDate(m.getDate() + 1);
    return m;
  }
  function clockText(minutes) {
    var h = Math.floor(minutes / 60), m = minutes % 60;
    return (h % 12 || 12) + ":" + (m < 10 ? "0" : "") + m + (h < 12 ? " am" : " pm");
  }

  // ---------- saved on this TV ----------
  // In the page's storage and the launcher's (TVOS.keep), like app.js does, so the live home and the
  // copy the launcher keeps for when the computer is off share the PIN and the extra time.
  var TV = window.TVOS || null;
  function get(k) {
    var v = null;
    try { if (TV && TV.kept) v = TV.kept("kids." + k); } catch (e) {}
    if (v == null) try { v = localStorage.getItem("kids." + k); } catch (e) {}
    try { return v == null ? null : JSON.parse(v); } catch (e) { return null; }
  }
  function set(k, v) {
    var j = JSON.stringify(v);
    try { localStorage.setItem("kids." + k, j); } catch (e) {}
    try { if (TV && TV.keep) TV.keep("kids." + k, j); } catch (e) {}
  }
  // the PIN made on this TV wins over one from config.json
  function pin() { var p = get("pin"); return typeof p === "string" && /^\d{4}$/.test(p) ? p : CFG_PIN; }
  var unlockedUntil = 0;

  // ---------- what the screen is showing ----------
  var people = [], ui = null, mode = null;   // mode: null, "bed", "pad", "extra"
  // the pad: what it says, and what happens when four digits are in (full returns false: shake, clear)
  var pad = { digits: "", i: 4, title: "", sub: "", full: null }, extraI = 0;
  var EXTRA = [{ m: 15, label: "15 more minutes" }, { m: 30, label: "30 more minutes" }, { m: 0, label: "Until morning" }];
  var KEYS = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["x", "0", "del"]];

  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function names() {
    var n = people.map(function (p) { return p.name; });
    if (n.length <= 1) return n.join("");
    return n.slice(0, -1).join(", ") + " and " + n[n.length - 1];
  }

  function build() {
    if (ui) return;
    ui = document.createElement("div");
    ui.className = "kids-layer";
    ui.innerHTML =
      '<div class="kbed" id="kbed"><div class="ktwinkle"><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
      '<div class="kbed-text"><p class="kbed-moon" id="kbed-moon"></p><h1 id="kbed-title"></h1><p id="kbed-sub"></p></div>' +
      '<p class="kbed-hint">Grown-ups: press OK</p></div>' +
      '<div class="kpad" id="kpad" role="dialog" aria-modal="true"><div class="kpad-box">' +
      '<h2 id="kpad-title"></h2><p class="kpad-sub" id="kpad-sub"></p><div class="kdots" id="kdots"></div><div class="kkeys" id="kkeys"></div>' +
      '<div class="kextra" id="kextra"></div></div></div>';
    document.body.appendChild(ui);
  }

  function renderBed() {
    $("kbed-title").textContent = people.length ? "Goodnight, " + names() + "!" : "Goodnight!";
    $("kbed-sub").textContent = "Time for sleep. The TV wakes up at " + clockText(BED.until) + ".";
    // each girl's emoji, gently bobbing (the moon is already in the picture)
    $("kbed-moon").innerHTML = people.map(function (p) { return EMOJI[p.id] ? "<span>" + esc(EMOJI[p.id]) + "</span>" : ""; }).join("");
  }
  function renderPad() {
    $("kpad-title").textContent = mode === "extra" ? "How much more TV?" : pad.title;
    $("kpad-sub").textContent = mode === "extra" ? "" : pad.sub;
    var dots = "";
    for (var k = 0; k < 4; k++) dots += '<i class="' + (k < pad.digits.length ? "on" : "") + '"></i>';
    $("kdots").innerHTML = dots;
    $("kdots").style.display = mode === "extra" ? "none" : "";
    var flat = [].concat.apply([], KEYS);
    $("kkeys").innerHTML = mode === "extra" ? "" : flat.map(function (key, i) {
      var label = key === "x" ? "✕" : key === "del" ? "⌫" : key;
      return '<span class="kkey' + (i === pad.i ? " focus" : "") + (key.length > 1 ? " small" : "") + '">' + label + "</span>";
    }).join("");
    $("kextra").innerHTML = mode !== "extra" ? "" : EXTRA.map(function (x, i) {
      return '<span class="kopt' + (i === extraI ? " focus" : "") + '">' + esc(x.label) + "</span>";
    }).join("");
  }
  function $(id) { return document.getElementById(id); }

  function show(m) {
    build();
    mode = m;
    $("kbed").classList.toggle("on", isBedtime());
    $("kpad").classList.toggle("on", m === "pad" || m === "extra");
    document.documentElement.classList.toggle("kids-bedtime", isBedtime());
    if (isBedtime()) renderBed();
    if (m === "pad" || m === "extra") renderPad();
  }
  function hide() {
    mode = isBedtime() ? "bed" : null;
    show(mode);
  }

  // ---------- the PIN pad ----------
  function openPad(title, sub, full) {
    pad = { digits: "", i: 4, title: title, sub: sub || "", full: full };   // start on 5, the middle
    show("pad");
  }
  function unlock() { unlockedUntil = Date.now() + Math.max(1, +C.unlock_minutes || 5) * 60000; }
  // the PIN, then done(); with no PIN yet a grown-up makes one first
  function askPin(done) {
    if (!pin()) { makePin(done, ""); return; }
    openPad("Grown-ups only", "Type the PIN with the remote's numbers", function (d) {
      if (d !== pin()) return false;
      unlock();
      done();
    });
  }
  // two rounds: the new PIN, then the same again
  function makePin(done, sub) {
    openPad("Make a grown-ups PIN", sub || "Four numbers the girls don't know", function (first) {
      openPad("Type it once more", "The same four numbers", function (again) {
        if (again !== first) { makePin(done, "Those didn't match. Let's start again."); return; }
        set("pin", first);
        unlock();
        done();
      });
    });
  }
  function typeDigit(d) {
    if (pad.digits.length >= 4) return;
    pad.digits += d;
    renderPad();
    if (pad.digits.length < 4) return;
    var full = pad.full, digits = pad.digits;
    setTimeout(function () {
      if (pad.full !== full) return;   // closed meanwhile
      if (full(digits) === false) {
        pad.digits = "";
        $("kdots").classList.add("wrong");
        setTimeout(function () { $("kdots").classList.remove("wrong"); }, 500);
        renderPad();
      }
    }, 150);
  }
  function padKey(key) {
    if (key === "x") hide();
    else if (key === "del") { pad.digits = pad.digits.slice(0, -1); renderPad(); }
    else typeDigit(key);
  }
  function giveExtra(x) {
    var now = new Date();
    var until = x.m ? now.getTime() + x.m * 60000 : nextMorning(now).getTime();
    set("extra", until);
    if (KIDS.onExtra) try { KIDS.onExtra(new Date(until).toISOString()); } catch (e) {}
    hide();
  }

  // ---------- bedtime ----------
  function isBedtime() {
    if (!ON || !BED) return false;
    var now = new Date(), extra = get("extra");
    if (extra && now.getTime() < extra) return false;
    return bedtimeAt(now);
  }
  function tick() {
    var bed = isBedtime();
    if (bed && !mode) show("bed");
    else if (!bed && mode === "bed") hide();
    else if (bed && mode === "bed") renderBed();
  }

  // ---------- keys: while anything of ours is up, the home underneath gets none ----------
  var ARROW = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], Up: [0, -1], Down: [0, 1], Left: [-1, 0], Right: [1, 0] };
  var ARROW_CODE = { 38: [0, -1], 40: [0, 1], 37: [-1, 0], 39: [1, 0], 19: [0, -1], 20: [0, 1], 21: [-1, 0], 22: [1, 0] };
  function isOk(e) { return ["Enter", " ", "Select", "Accept", "NumpadEnter"].indexOf(e.key) >= 0 || e.keyCode === 13 || e.keyCode === 23; }
  function isBack(e) { return ["Escape", "Esc", "Backspace", "GoBack", "BrowserBack"].indexOf(e.key) >= 0 || e.keyCode === 27 || e.keyCode === 8 || e.keyCode === 10009; }
  function digitOf(e) {
    if (/^[0-9]$/.test(e.key)) return e.key;
    if (e.keyCode >= 48 && e.keyCode <= 57) return String(e.keyCode - 48);
    if (e.keyCode >= 7 && e.keyCode <= 16) return String(e.keyCode - 7);   // Android KEYCODE_0..9
    return null;
  }
  function onKey(e) {
    if (!mode) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.type !== "keydown" || e.repeat) return;
    var arrow = ARROW[e.key] || ARROW_CODE[e.keyCode];
    if (mode === "bed") {
      if (!isOk(e)) return;
      var extra = function () { extraI = 0; show("extra"); };
      if (LOCK) askPin(extra); else extra();
      return;
    }
    if (mode === "extra") {
      if (arrow) { extraI = Math.max(0, Math.min(EXTRA.length - 1, extraI + arrow[0] + arrow[1])); renderPad(); }
      else if (isOk(e)) giveExtra(EXTRA[extraI]);
      else if (isBack(e)) hide();
      return;
    }
    // the pad
    var d = digitOf(e);
    if (d) { typeDigit(d); return; }
    if (isBack(e)) { if (pad.digits) { pad.digits = pad.digits.slice(0, -1); renderPad(); } else hide(); return; }
    if (arrow) {
      var r = Math.floor(pad.i / 3), c = pad.i % 3;
      r = Math.max(0, Math.min(3, r + arrow[1]));
      c = Math.max(0, Math.min(2, c + arrow[0]));
      pad.i = r * 3 + c;
      renderPad();
      return;
    }
    if (isOk(e)) padKey([].concat.apply([], KEYS)[pad.i]);
  }
  // capture on window: these run before app.js's own key handlers on document
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("keyup", onKey, true);

  var KIDS = window.KIDS = {
    on: ON,
    scenes: KID_SCENES,
    // set by app.js: the bridge is told about extra time, so it does not send the TV home early
    onExtra: null,
    setPeople: function (list) { people = (list || []).filter(function (p) { return p && p.name && p.id !== "both"; }); if (mode === "bed") renderBed(); },
    emoji: function (p) { return ON && p && typeof EMOJI[p.id] === "string" ? EMOJI[p.id] : ""; },
    // only the kids' apps on the home row (an empty list: every app, as couch-tv does)
    homeApp: function (pkg) { return !ON || !APPS.length || APPS.indexOf(pkg) >= 0; },
    homeOrder: function () { return ON ? APPS.slice() : []; },
    // the colour of whoever is watching, for the focus ring and the switch
    accent: function (colour) {
      if (!ON) return;
      document.documentElement.classList.add("kids");
      if (colour) document.documentElement.style.setProperty("--kid", colour);
    },
    // a grown-up area: runs go() now if there is no PIN or it was typed a moment ago, else asks
    grownUp: function (go) {
      if (!ON || !LOCK || Date.now() < unlockedUntil) { go(); return; }
      askPin(function () { hide(); go(); });
    },
    // the Settings tile's "Grown-ups PIN": the old PIN (if there is one), then a new one twice
    canChangePin: function () { return ON && LOCK; },
    changePin: function () {
      var fresh = function () { makePin(function () { hide(); }, "Four new numbers"); };
      if (!pin()) fresh(); else askPin(fresh);
    },
    // true while the bedtime screen or the PIN pad is up (nothing opens underneath)
    busy: function () { return !!mode; },
    // the launcher hands BACK to the page as tv.back(), not as a key: true when it was ours
    back: function () {
      var ours = !!mode;
      if (mode === "pad" && pad.digits) { pad.digits = pad.digits.slice(0, -1); renderPad(); }
      else if (mode === "pad" || mode === "extra") hide();
      return ours;
    },
    // look again now (the TV has just come back to the home)
    check: function () { if (ON) tick(); },
    bedtime: isBedtime
  };

  if (ON) {
    document.documentElement.classList.add("kids");
    var go = function () { tick(); setInterval(tick, 20000); };
    if (document.body) go(); else document.addEventListener("DOMContentLoaded", go);
  }
})();
