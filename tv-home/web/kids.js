// Kidstv: the girls' layer over the couch-tv home. Loaded before app.js, which calls into
// window.KIDS. It adds:
//   - each girl's own colour and emoji (the head icon, the list, the focus ring follow whoever is picked)
//   - a home row of only the kids' apps; everything else waits behind More apps
//   - a grown-up PIN in front of More apps and Settings, made on the TV the first time it is needed
//     (and changed from the Settings tile), kept on the TV only, never in git
//   - the bedtime screen: from bedtime until morning the home shows "Goodnight" and opens nothing,
//     until a grown-up types the PIN and gives some extra time
//   - the wind-down before bedtime (a moon counting down the last 15 minutes, the home dims at 5),
//     a sunrise on the Goodnight screen in the hour before wake-up, and a "Good morning" burst
//   - stars: a grown-up gives one from the grown-ups screen (grownups.js); five make a trophy and
//     confetti falls over her home
//   - little mode (Sora): huge picture tiles only, left and right and OK, nothing else to bump into
// Settings are home.kids in config.json (docs/KIDS.md); anything left out uses DEFAULTS below.
// Bedtime times changed on the grown-ups screen, stars, trophies and little mode are kept on the
// TV (get and set below) and win over config.json.
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
    // how long a right PIN keeps the grown-ups screen open
    unlock_minutes: 15,
    // little mode, by person id: huge picture tiles only (the Sora mockup)
    little: ["sora"],
    // how many minutes before bedtime the moon starts counting down, and when the home dims
    wind_down: 15,
    dim_at: 5
  };
  var KID_SCENES = ["rainbow", "candy", "stars"];
  // Each girl's badge (the same drawings as design/mockups), by person id. Anyone else: her emoji.
  var BADGES = {
    blake: '<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="kbB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b48cff"/><stop offset="1" stop-color="#6c3ce0"/></linearGradient></defs>' +
      '<circle cx="50" cy="50" r="50" fill="url(#kbB)"/><ellipse cx="33" cy="40" rx="15" ry="19" transform="rotate(-28 33 40)" fill="#fff"/><ellipse cx="67" cy="40" rx="15" ry="19" transform="rotate(28 67 40)" fill="#fff"/>' +
      '<ellipse cx="36" cy="64" rx="10" ry="12" transform="rotate(25 36 64)" fill="#ffd6f2"/><ellipse cx="64" cy="64" rx="10" ry="12" transform="rotate(-25 64 64)" fill="#ffd6f2"/>' +
      '<rect x="46.5" y="34" width="7" height="38" rx="3.5" fill="#3a1f86"/><path d="M48 35 C 44 26, 40 24, 37 23 M52 35 C 56 26, 60 24, 63 23" stroke="#3a1f86" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
    lucy: '<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="kbL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9fd0"/><stop offset="1" stop-color="#ff4f9a"/></linearGradient></defs>' +
      '<circle cx="50" cy="50" r="50" fill="url(#kbL)"/><path d="M20 66 A30 30 0 0 1 80 66" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round"/>' +
      '<path d="M29 66 A21 21 0 0 1 71 66" stroke="#ffe27a" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M38 66 A12 12 0 0 1 62 66" stroke="#8fe3ff" stroke-width="8" fill="none" stroke-linecap="round"/>' +
      '<circle cx="20" cy="70" r="8" fill="#fff"/><circle cx="28" cy="72" r="6" fill="#fff"/><circle cx="80" cy="70" r="8" fill="#fff"/><circle cx="72" cy="72" r="6" fill="#fff"/></svg>',
    sora: '<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="kbS" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6fe6d4"/><stop offset="1" stop-color="#16a69a"/></linearGradient></defs>' +
      '<circle cx="50" cy="50" r="50" fill="url(#kbS)"/><circle cx="50" cy="44" r="20" fill="#ffd84d"/><circle cx="44" cy="41" r="3" fill="#3a2a10"/><circle cx="57" cy="41" r="3" fill="#3a2a10"/>' +
      '<path d="M47 48 L53 48 L50 53 Z" fill="#ff8a3d"/><path d="M26 58 L34 52 L42 60 L50 52 L58 60 L66 52 L74 58 L72 78 C 66 88, 34 88, 28 78 Z" fill="#fff"/></svg>'
  };
  // Her picture behind the home (backgrounds/kid-<name>.jpg, made by tools/render-kid-scenes.js)
  var SCENE_OF = { blake: "blake", lucy: "lucy", sora: "sora" };

  var home = (window.COUCH_CONFIG && window.COUCH_CONFIG.home) || {};
  var given = home.kids && typeof home.kids === "object" ? home.kids : {};
  var C = {};
  Object.keys(DEFAULTS).forEach(function (k) { C[k] = given[k] !== undefined ? given[k] : DEFAULTS[k]; });
  var ON = C.enabled !== false;
  var LOCK = C.pin !== false && C.pin !== "";
  var CFG_PIN = /^\d{4}$/.test(String(C.pin)) ? String(C.pin) : "";
  var BED = null;   // set below, once the TV's own saved bedtime can be read
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
  // bedtime times changed on the grown-ups screen win over config.json
  function bedtimeCfg() { var b = get("bedtime"); return parseBedtime(b) ? b : C.bedtime; }
  BED = parseBedtime(bedtimeCfg());
  function hm(minutes) { var h = Math.floor(minutes / 60), m = minutes % 60; return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m; }
  // stars and trophies, by person id
  function starsOf(id) { var s = get("stars") || {}; var r = s[id] || {}; return { stars: +r.stars || 0, trophies: +r.trophies || 0 }; }
  // little mode: the list saved on this TV, else config.json
  function littleIds() { var l = get("little"); return Array.isArray(l) ? l : (Array.isArray(C.little) ? C.little : []); }
  function isLittle(p) { return !!(ON && p && littleIds().indexOf(p.id) >= 0); }

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
      '<div class="kbed-text"><p class="kbed-time" id="kbed-time"></p><p class="kbed-moon" id="kbed-moon"></p><h1 id="kbed-title"></h1><p id="kbed-sub"></p></div>' +
      '<p class="kbed-hint">Grown-ups: press OK</p></div>' +
      '<div class="kpad" id="kpad" role="dialog" aria-modal="true"><div class="kpad-box">' +
      '<h2 id="kpad-title"></h2><p class="kpad-sub" id="kpad-sub"></p><div class="kdots" id="kdots"></div><div class="kkeys" id="kkeys"></div>' +
      '<div class="kextra" id="kextra"></div></div></div>' +
      // the last minutes before bedtime: a moon counting down, top right
      '<div class="kcount" id="kcount" aria-live="polite"><span class="kmoon">🌙</span><span id="kcount-text"></span></div>' +
      // the first look at the home after wake-up
      '<div class="kmorning" id="kmorning"><span class="ksun"></span><h1 id="kmorning-title"></h1></div>' +
      // five stars: confetti over her home
      '<div class="kconfetti" id="kconfetti" aria-hidden="true"></div>';
    document.body.appendChild(ui);
  }

  function renderBed() {
    var sunrise = sunriseNow();
    $("kbed").classList.toggle("sunrise", sunrise);
    $("kbed-title").textContent = sunrise ? "Almost morning!" : people.length ? "Goodnight, " + names() : "Goodnight";
    $("kbed-sub").textContent = (sunrise ? "The TV wakes up at " : "Sweet dreams. The TV wakes up at ") + clockText(BED.until) + ".";
    $("kbed-time").innerHTML = clockNow ? esc(clockNow.hm) + (clockNow.ampm ? "<small>" + esc(clockNow.ampm) + "</small>" : "") : "";
    // each girl's badge (or emoji), gently bobbing (the moon is already in the picture)
    $("kbed-moon").innerHTML = people.map(function (p) {
      return BADGES[p.id] ? '<span class="kbadge">' + BADGES[p.id] + "</span>" : EMOJI[p.id] ? "<span>" + esc(EMOJI[p.id]) + "</span>" : "";
    }).join("");
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

  // ---------- the girls' look: her picture behind, a big clock in front (design/mockups) ----------
  var look = false, bgShown = "", bgLayer = 0, whoNow = null, clockNow = null;
  function startLook() {
    look = true;
    document.documentElement.classList.add("kids-look");
    var el = document.createElement("div");
    el.className = "klook";
    el.innerHTML = '<div class="kbg" id="kbg"><img alt=""><img alt=""></div>' +
      '<div class="kclock"><p class="kdate" id="kdate"></p><p class="ktime" id="ktime"></p><p class="khello" id="khello"></p></div>' +
      // her stars, under her name at the top left
      '<div class="kstars" id="kstars" aria-label="Stars"></div>';
    document.body.insertBefore(el, document.body.firstChild);
  }
  function showBg(name) {
    var url = "backgrounds/kid-" + name + ".jpg";
    if (!look || url === bgShown) return;
    bgShown = url;
    var pre = new Image();
    pre.onload = function () {
      if (bgShown !== url) return;
      var imgs = $("kbg").children, next = imgs[bgLayer = 1 - bgLayer], prev = imgs[1 - bgLayer];
      next.src = url;
      next.classList.add("on");
      prev.classList.remove("on");
    };
    pre.src = url;
  }
  function hello() {
    var h = new Date().getHours(), part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    return whoNow && whoNow.name ? part + ", " + whoNow.name : part;
  }
  function drawClock() {
    if (!look || !clockNow) return;
    var c = clockNow;
    $("ktime").innerHTML = esc(c.hm) + (c.ampm ? "<small>" + esc(c.ampm) + "</small>" : "");
    $("kdate").innerHTML = esc(c.day) + (c.wx ? '<i class="kdot"></i><span class="kwx">' + c.wx + "</span>" : "");
    $("khello").textContent = hello();
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
  // minutes until tonight's bedtime, or null when it is not coming up within wind_down minutes
  function minutesToBed() {
    if (!BED) return null;
    var now = new Date(), t = now.getHours() * 60 + now.getMinutes(), day = now.getDay();
    var from = day === 5 || day === 6 ? BED.weekend : BED.from;
    var left = from - t;
    var extra = get("extra");
    if (extra && now.getTime() < extra) left = Math.ceil((extra - now.getTime()) / 60000);   // extra time runs out instead
    return left > 0 && left <= Math.max(1, +C.wind_down || 15) ? left : null;
  }
  // the hour before wake-up: the Goodnight screen turns to sunrise colours
  function sunriseNow() {
    if (!BED) return false;
    var now = new Date(), t = now.getHours() * 60 + now.getMinutes();
    return t < BED.until && t >= BED.until - 60;
  }
  var wasBed = null;
  function tick() {
    var bed = isBedtime();
    if (bed && !mode) show("bed");
    else if (!bed && mode === "bed") hide();
    else if (bed && mode === "bed") renderBed();
    // the morning: the first home after the Goodnight screen goes, once a day
    if (wasBed === true && !bed) morning();
    wasBed = bed;
    windDown(bed ? null : minutesToBed());
  }
  function windDown(left) {
    build();
    var dim = left != null && left <= Math.max(1, +C.dim_at || 5);
    $("kcount").classList.toggle("on", left != null);
    $("kcount").classList.toggle("soon", dim);
    $("kcount-text").textContent = left == null ? "" : dim ? "Nearly bedtime" : "Bedtime in " + left + " min";
    document.documentElement.classList.toggle("kids-dim", dim);
  }
  function morning() {
    var today = new Date().toDateString();
    if (get("morning") === today || !look) return;
    set("morning", today);
    build();
    $("kmorning-title").textContent = "Good morning" + (whoNow && whoNow.name ? ", " + whoNow.name : "") + "!";
    $("kmorning").classList.add("on");
    setTimeout(function () { $("kmorning").classList.remove("on"); }, 5000);
  }

  // ---------- stars: five make a trophy, and confetti the next time her home shows ----------
  function giveStar(id, d) {
    var all = get("stars") || {}, r = starsOf(id);
    r.stars += d;
    if (r.stars >= 5) { r.stars = 0; r.trophies += 1; set("party", id); }
    if (r.stars < 0) { r.stars = 0; }
    all[id] = r;
    set("stars", all);
    drawStars();
    return r;
  }
  function drawStars() {
    var el = $("kstars");
    if (!el || !whoNow) return;
    var r = starsOf(whoNow.id), s = "";
    for (var i = 0; i < 5; i++) s += '<i class="' + (i < r.stars ? "on" : "") + '">★</i>';
    el.innerHTML = s + (r.trophies ? '<b class="ktrophy">🏆 ' + r.trophies + "</b>" : "");
  }
  var COLOURS = ["#ff5fa8", "#8e5cff", "#2fc4b2", "#ffd84d", "#ff8a3d", "#6fe6d4", "#fff"];
  function party() {
    if (!whoNow || get("party") !== whoNow.id || mode) return;
    set("party", null);
    build();
    var box = $("kconfetti"), bits = "";
    for (var i = 0; i < 90; i++) {
      bits += '<i style="left:' + (Math.random() * 100) + '%;background:' + COLOURS[i % COLOURS.length] + ";animation-delay:" + (Math.random() * 1.2) +
        "s;animation-duration:" + (2.6 + Math.random() * 1.6) + "s;transform:rotate(" + Math.floor(Math.random() * 360) + 'deg)"></i>';
    }
    box.innerHTML = bits;
    box.classList.add("on");
    setTimeout(function () { box.classList.remove("on"); box.innerHTML = ""; }, 4500);
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
    // her drawn badge, as SVG markup (or "" for someone with none)
    badge: function (p) { return ON && p && BADGES[p.id] ? BADGES[p.id] : ""; },
    // app.js, once it knows the look: the girls' own look only goes with the Night look
    start: function (night) { if (ON && night && !look) startLook(); },
    ownLook: function () { return look; },
    // whoever is watching now: her picture, her name in the greeting and on her shows
    who: function (p) {
      whoNow = p && p.id !== "both" ? p : null;
      showBg(whoNow && SCENE_OF[whoNow.id] ? SCENE_OF[whoNow.id] : "blake");
      var title = $("shelf-title");
      if (look && title && whoNow) title.textContent = whoNow.name + "'s shows";
      document.documentElement.classList.toggle("kids-little", isLittle(whoNow));
      drawClock();
      drawStars();
      party();
    },
    // little mode for whoever is watching now (app.js: up and down stay on the tiles, a long OK
    // opens the people list)
    littleNow: function () { return isLittle(whoNow); },
    little: function (id, on) {   // the grown-ups screen: switch it for one girl
      if (id === undefined) return littleIds();
      var l = littleIds().filter(function (x) { return x !== id; });
      if (on) l.push(id);
      set("little", l);
      document.documentElement.classList.toggle("kids-little", isLittle(whoNow));
      return l;
    },
    // stars and trophies (the grown-ups screen gives and takes them)
    stars: starsOf,
    giveStar: giveStar,
    // bedtime, as config.json has it ({from, until, weekend_from}), and changing it from the grown-ups screen
    bedtimeCfg: function () { var b = bedtimeCfg(); return { from: hm(BED.from), until: hm(BED.until), weekend_from: hm(BED.weekend) }; },
    setBedtime: function (b) {
      var parsed = parseBedtime(b);
      if (!parsed) return false;
      set("bedtime", { from: b.from, until: b.until, weekend_from: b.weekend_from });
      BED = parsed;
      tick();
      return true;
    },
    people: function () { return people.slice(); },
    // the grown-ups screen: how long the PIN still holds, and locking straight away
    unlockedUntil: function () { return unlockedUntil; },
    lock: function () { unlockedUntil = 0; },
    // app.js's clock, every 15 seconds: the time, am or pm, the day and the weather (markup)
    clock: function (hm, ampm, day, wx) {
      clockNow = { hm: hm, ampm: ampm, day: day, wx: wx };
      drawClock();
      if (mode === "bed") renderBed();
    },
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
