// Kidstv: the grown-ups screen (design/mockups/Grownups.dc.html and Controls.dc.html). Loaded after
// kids.js and before app.js; app.js opens it once the PIN is right (window.grownUps.open) and hands
// it the keys while it is up, the way smarthome.js works.
//
// The screen: every app on the TV, Keep watching from Android's Watch Next list, this week's weather
// (Open-Meteo, no key, the same service the clock uses) and how long the PIN still holds. Controls
// (its first button): bedtime, stars, little mode and the PIN. Everything it saves goes through
// window.KIDS, so it lives on the TV only.
(function () {
  "use strict";
  var K = window.KIDS;
  var ctx = null;   // what app.js hands over on open: apps, shows, weather, what to run
  var G = { open: false, view: "home", row: 0, col: [0, 0, 0], ci: 0, timer: null, week: null, weekAt: 0, weekFor: "" };
  var ui = null;

  function $(id) { return document.getElementById(id); }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ---------- the top buttons ----------
  var BTNS = [
    { id: "controls", label: "Controls", sub: "Bedtime, stars, little mode, PIN" },
    { id: "home", label: "Home settings", sub: "Look, weather, apps, people" },
    { id: "tv", label: "TV settings", sub: "Android's own settings" },
    { id: "lock", label: "Lock now", sub: "Back to the girls' home" }
  ];

  function build() {
    if (ui) return;
    ui = document.createElement("div");
    ui.className = "gu-layer";
    ui.innerHTML =
      '<div class="gu" id="gu" role="dialog" aria-modal="true" aria-label="Grown-ups">' +
      '<header class="gu-top"><div class="gu-head"><h1 id="gu-hello">Good evening</h1><span class="gu-lock" id="gu-lock"></span></div>' +
      '<div class="gu-btns" id="gu-btns"></div></header>' +
      '<section class="gu-hero" id="gu-hero"></section>' +
      '<section class="gu-row gu-shows" id="gu-shows"><h2>Keep watching</h2><div class="gu-track" id="gu-shows-track"></div></section>' +
      '<section class="gu-row gu-apps" id="gu-apps"><h2>Apps</h2><div class="gu-track" id="gu-apps-track"></div></section>' +
      '<footer class="gu-week" id="gu-week"></footer></div>' +
      '<div class="gu-ctl" id="gu-ctl" role="dialog" aria-modal="true" aria-label="Controls">' +
      '<div class="gu-ctl-side"><h1>Controls</h1><p>Left and right change a time or a star. OK switches. Back returns.</p></div>' +
      '<div class="gu-ctl-rows" id="gu-ctl-rows"></div></div>';
    document.body.appendChild(ui);
  }

  // ---------- the grown-ups home ----------
  function hello() {
    var h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  }
  function lockText() {
    var until = K.unlockedUntil ? K.unlockedUntil() : 0;
    if (!until) return "Grown-ups";
    var s = Math.max(0, Math.round((until - Date.now()) / 1000));
    return "Grown-ups  ·  locks again in " + Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
  }
  function rows() {   // the rows that can take focus, top to bottom
    var r = [BTNS];
    if (ctx.shows.length) r.push(ctx.shows);
    r.push(ctx.apps);
    return r;
  }
  function rowKind(i) { var r = rows(); return i === 0 ? "btns" : r[i] === ctx.shows ? "shows" : "apps"; }
  function current() { var r = rows(); return r[G.row] ? r[G.row][G.col[G.row]] : null; }

  function appFace(a) {
    var pic = a.banner || (ctx.iconUrl && ctx.iconUrl(a.package));
    if (pic) return '<img src="' + esc(pic) + '" alt="" decoding="async" onerror="this.parentNode.className=\'gu-face word\';this.parentNode.textContent=this.getAttribute(\'data-name\')" data-name="' + esc(a.name) + '">';
    return esc(a.name);
  }
  function render() {
    build();
    $("gu-hello").textContent = hello();
    $("gu-lock").textContent = lockText();
    var kind = rowKind(G.row);
    $("gu-btns").innerHTML = BTNS.map(function (b, i) {
      return '<div class="gu-btn' + (kind === "btns" && i === G.col[0] ? " focus" : "") + '"><b>' + esc(b.label) + "</b><small>" + esc(b.sub) + "</small></div>";
    }).join("");
    // the show under focus, big, as the mockup has it
    var it = kind === "shows" ? current() : ctx.shows[0];
    var hero = $("gu-hero");
    if (it) {
      var ep = it.season && it.episode ? "S" + it.season + " E" + it.episode : (it.episode_title || "");
      hero.innerHTML = '<span class="gu-title">' + esc(it.title) + "</span><div class=\"gu-sub\"><span>" + (ep ? "Continue " + esc(ep) : "Continue") +
        (it.app ? " on</span><span class=\"gu-app\">" + esc(it.app.name) : "") + "</span></div>" +
        (it.progress ? '<div class="gu-bar"><i style="width:' + Math.round(it.progress * 100) + '%"></i></div>' : "");
      hero.classList.add("on");
    } else {
      hero.innerHTML = '<span class="gu-title gu-none">Nothing on the go</span><div class="gu-sub"><span>Keep watching fills from what the apps say you are part way through.</span></div>';
      hero.classList.add("on");
    }
    $("gu-shows").classList.toggle("off", !ctx.shows.length);
    $("gu-shows-track").innerHTML = ctx.shows.map(function (s, i) {
      var art = s.backdrop || s.poster;
      return '<div class="gu-card' + (kind === "shows" && i === G.col[rows().indexOf(ctx.shows)] ? " focus" : "") + '">' +
        (art ? '<img src="' + esc(art) + '" alt="" decoding="async">' : '<span class="gu-noart">' + esc(s.title) + "</span>") +
        '<div class="gu-cap"><b>' + esc(s.title) + "</b><span>" + esc(s.app ? s.app.name : "") + "</span></div>" +
        (s.progress ? '<span class="gu-prog"><i style="width:' + Math.round(s.progress * 100) + '%"></i></span>' : "") + "</div>";
    }).join("");
    var ai = rows().length - 1;
    $("gu-apps-track").innerHTML = ctx.apps.map(function (a, i) {
      return '<div class="gu-tile' + (kind === "apps" && i === G.col[ai] ? " focus" : "") + '"><div class="gu-face">' + appFace(a) + '</div><span class="gu-label">' + esc(a.name) + "</span></div>";
    }).join("");
    scrollTracks();
    renderWeek();
  }
  // keep the focused card in view: slide the track left as the focus moves right
  function scrollTracks() {
    [["gu-shows-track", ctx.shows], ["gu-apps-track", ctx.apps]].forEach(function (pair) {
      var track = $(pair[0]), i = G.col[rows().indexOf(pair[1])] || 0;
      var el = track.children[i];
      if (!el) { track.style.transform = ""; return; }
      var step = el.offsetWidth + parseFloat(getComputedStyle(track).columnGap || 0);
      var fit = Math.max(1, Math.floor(track.parentNode.offsetWidth / step));
      var first = Math.max(0, Math.min(i - Math.floor(fit / 2), pair[1].length - fit));
      track.style.transform = "translateX(" + (-first * step) + "px)";
    });
  }

  // ---------- this week's weather ----------
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function fetchWeek() {
    var w = ctx.wx;
    if (!w || !isFinite(w.lat)) return;
    var key = w.lat + "," + w.lon;
    if (G.week && G.weekFor === key && Date.now() - G.weekAt < 30 * 60000) return;
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + w.lat + "&longitude=" + w.lon +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=" + encodeURIComponent(w.timezone || "auto") + "&forecast_days=7";
    fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var d = j.daily;
      G.week = d.time.map(function (t, i) { return { date: t, code: Math.round(d.weather_code[i]), max: Math.round(d.temperature_2m_max[i]), min: Math.round(d.temperature_2m_min[i]) }; });
      G.weekAt = Date.now(); G.weekFor = key;
      if (G.open) renderWeek();
    }).catch(function () {});
  }
  function renderWeek() {
    var el = $("gu-week");
    if (!G.week) { el.innerHTML = ""; return; }
    el.innerHTML = G.week.map(function (d, i) {
      var day = new Date(d.date + "T12:00:00");
      return '<div class="gu-day' + (i === 0 ? " today" : "") + '"><b>' + (i === 0 ? "Today" : DAYS[day.getDay()]) + "</b>" +
        '<span class="gu-wi">' + (ctx.wxIcon ? ctx.wxIcon({ code: d.code, is_day: true }) : "") + "</span>" +
        "<span>" + esc(ctx.temp(d.max)) + " <i>" + esc(ctx.temp(d.min)) + "</i></span></div>";
    }).join("");
  }

  // ---------- Controls ----------
  var ctlRows = [], ctlI = 0;
  function timeLabel(s) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(s); if (!m) return s;
    var h = +m[1]; return (h % 12 || 12) + ":" + m[2] + (h < 12 ? " am" : " pm");
  }
  function stepTime(s, d) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(s); if (!m) return s;
    var t = ((+m[1] * 60 + +m[2]) + d * 15 + 1440) % 1440;
    return (Math.floor(t / 60) < 10 ? "0" : "") + Math.floor(t / 60) + ":" + (t % 60 < 10 ? "0" : "") + (t % 60);
  }
  function starText(r) {   // markup: five stars, the earned ones lit, then any trophies
    var s = "";
    for (var i = 0; i < 5; i++) s += '<i class="gu-star' + (i < r.stars ? " on" : "") + '">★</i>';
    return s + (r.trophies ? '<em class="gu-trophy">🏆 ' + r.trophies + "</em>" : "");
  }
  function buildCtl() {
    var bed = K.bedtimeCfg(), people = K.people(), little = K.little();
    ctlRows = [
      { kind: "head", label: "Bedtime" },
      { kind: "time", key: "from", label: "School nights", sub: "Sunday to Thursday", value: timeLabel(bed.from) },
      { kind: "time", key: "weekend_from", label: "Friday and Saturday", sub: "", value: timeLabel(bed.weekend_from) },
      { kind: "time", key: "until", label: "The TV wakes up", sub: "Every morning", value: timeLabel(bed.until) },
      { kind: "head", label: "Stars" }
    ].concat(people.map(function (p) {
      return { kind: "stars", id: p.id, label: p.name, sub: "Left takes one, right gives one. Five make a trophy.", value: starText(K.stars(p.id)) };
    }), [{ kind: "head", label: "Little mode" }], people.map(function (p) {
      var on = little.indexOf(p.id) >= 0;
      return { kind: "little", id: p.id, label: p.name, sub: "Huge picture tiles only. A long OK opens the people list.", value: on ? "On" : "Off", on: on };
    }), [
      { kind: "head", label: "Grown-ups" },
      { kind: "pin", label: "Grown-ups PIN", sub: "Change the four numbers", value: "" },
      { kind: "lock", label: "Lock now", sub: "Back to the girls' home", value: "" }
    ]);
  }
  function ctlFocusable(i) { return ctlRows[i] && ctlRows[i].kind !== "head"; }
  function renderCtl() {
    $("gu-ctl-rows").innerHTML = ctlRows.map(function (r, i) {
      if (r.kind === "head") return '<h2 class="gu-ctl-head">' + esc(r.label) + "</h2>";
      var arrows = r.kind === "time" || r.kind === "stars";
      return '<div class="gu-ctl-row' + (i === ctlI ? " focus" : "") + (r.on ? " on" : "") + '"><div class="gu-ctl-text"><b>' + esc(r.label) + "</b>" +
        (r.sub ? "<small>" + esc(r.sub) + "</small>" : "") + "</div><div class=\"gu-ctl-val" + (arrows ? " arrows" : "") + '">' +
        (arrows ? "<i>‹</i>" : "") + "<span>" + (r.kind === "stars" ? r.value : esc(r.value)) + "</span>" + (arrows ? "<i>›</i>" : "") + "</div></div>";
    }).join("");
    var el = $("gu-ctl-rows").children[ctlI];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }
  function ctlChange(d) {
    var r = ctlRows[ctlI];
    if (!r) return;
    if (r.kind === "time") {
      var bed = K.bedtimeCfg();
      bed[r.key] = stepTime(bed[r.key], d);
      K.setBedtime(bed);
    } else if (r.kind === "stars") {
      K.giveStar(r.id, d);
    } else return;
    buildCtl();
    renderCtl();
  }
  function ctlOk() {
    var r = ctlRows[ctlI];
    if (!r) return;
    if (r.kind === "little") { K.little(r.id, !r.on); buildCtl(); renderCtl(); return; }
    if (r.kind === "time" || r.kind === "stars") { ctlChange(1); return; }
    if (r.kind === "pin") { ctx.changePin(); return; }
    if (r.kind === "lock") { lockNow(); }
  }

  // ---------- open, close, keys ----------
  function tickLock() {
    if (!G.open) return;
    var until = K.unlockedUntil ? K.unlockedUntil() : 0;
    if (until && Date.now() >= until) { lockNow(); return; }
    if (G.view === "home") $("gu-lock").textContent = lockText();
  }
  function open(c) {
    ctx = c;
    build();
    G.open = true; G.view = "home"; G.row = 0; G.col = [0, 0, 0];
    $("gu").classList.add("on");
    $("gu-ctl").classList.remove("on");
    document.documentElement.classList.add("grownups");
    render();
    fetchWeek();
    clearInterval(G.timer);
    G.timer = setInterval(tickLock, 1000);
  }
  function close() {
    if (!G.open) return;
    G.open = false;
    clearInterval(G.timer);
    $("gu").classList.remove("on");
    $("gu-ctl").classList.remove("on");
    document.documentElement.classList.remove("grownups");
    if (ctx && ctx.onClose) ctx.onClose();
  }
  function lockNow() {
    if (K.lock) K.lock();
    close();
  }
  function openCtl() {
    G.view = "ctl";
    buildCtl();
    ctlI = 1;
    $("gu-ctl").classList.add("on");
    renderCtl();
  }
  function closeCtl() {
    G.view = "home";
    $("gu-ctl").classList.remove("on");
    render();
  }
  function move(dx, dy) {
    if (!G.open) return;
    if (G.view === "ctl") {
      if (dy) { var j = ctlI; do { j += dy; } while (j >= 0 && j < ctlRows.length && !ctlFocusable(j)); if (ctlFocusable(j)) { ctlI = j; renderCtl(); } }
      else if (dx) ctlChange(dx);
      return;
    }
    var r = rows();
    if (dy) G.row = Math.max(0, Math.min(r.length - 1, G.row + dy));
    if (dx) G.col[G.row] = Math.max(0, Math.min(r[G.row].length - 1, (G.col[G.row] || 0) + dx));
    render();
  }
  function ok() {
    if (!G.open) return;
    if (G.view === "ctl") { ctlOk(); return; }
    var kind = rowKind(G.row), it = current();
    if (kind === "btns") {
      if (it.id === "controls") openCtl();
      else if (it.id === "home") { close(); ctx.homeSettings(); }
      else if (it.id === "tv") ctx.tvSettings();
      else lockNow();
      return;
    }
    if (kind === "shows") { ctx.openShow(it); return; }
    if (kind === "apps") ctx.launch(it);
  }
  // Back: Controls returns to the grown-ups home; the grown-ups home locks. True when it was ours.
  function back() {
    if (!G.open) return false;
    if (G.view === "ctl") closeCtl(); else lockNow();
    return true;
  }
  function paint() { if (!G.open) return; if (G.view === "ctl") renderCtl(); else render(); }

  window.grownUps = {
    open: open, close: close, move: move, ok: ok, back: back, paint: paint, lock: lockNow,
    isOpen: function () { return G.open; },
    // app.js re-reads the apps and shows now and then: take the new lists without losing the focus
    update: function (c) { if (!G.open) return; ctx.apps = c.apps || ctx.apps; ctx.shows = c.shows || ctx.shows; if (G.view === "home") render(); }
  };
})();
