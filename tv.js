/* tv.js — Remote-control (D-pad) navigation for Samsung Tizen TV / any TV browser.
   Loaded AFTER app.js. It only ADDS keyboard navigation; it never changes the
   kid-safe player logic in app.js (click-shield, playerVars, captions unload,
   auto-hide stay exactly as they are).

   How it works:
   - Listens in the CAPTURE phase and fully handles the keys it owns, so the
     bubble-phase key handler in app.js (Space / ArrowLeft / ArrowRight in the
     player) never double-fires.
   - Arrow keys move a visible focus between the focusable elements of the
     view that is currently on screen (spatial "nearest in that direction").
   - Enter activates the focused element (native click for buttons; the video
     shield is made focusable and clicked the same way a tap would be).
   - Samsung Back key (10009) walks back by context; media keys drive the
     existing player controls through the same helpers app.js uses.
   - Extra Tizen keys (MediaPlay, digits, ...) are registered when the Tizen
     tvinputdevice API exists. Mandatory keys (arrows, Enter, Back) are always
     delivered as DOM events and cannot/do not need registration. In a hosted
     (remote-page) context the Tizen API may be absent — everything here is
     written defensively so the page still works with plain DOM keys.
*/
(function () {
  "use strict";

  var VIEWS = ["pinView", "timeUpView", "playerView", "parentView", "homeView", "profileView"];
  var tvMode = false;

  function $(id) { return document.getElementById(id); }
  function isVisible(el) {
    if (!el || el.classList.contains("hidden")) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function viewEl(id) { var el = $(id); return el && !el.classList.contains("hidden") ? el : null; }
  function currentView() {
    for (var i = 0; i < VIEWS.length; i++) { var v = viewEl(VIEWS[i]); if (v) return v; }
    return document.body;
  }
  function inPlayer() { return !!viewEl("playerView"); }

  /* ---- safe bridges into app.js (same global scope, all guarded) ---- */
  function ytPlayer() {
    try {
      if (typeof player !== "undefined" && player && typeof playerReady !== "undefined" && playerReady) return player;
    } catch (e) {}
    return null;
  }
  function callApp(fn) {
    try { if (typeof fn === "function") fn(); } catch (e) {}
  }
  function appTogglePlay() { callApp(function () { togglePlay(); }); }
  function appPlayNext() { callApp(function () { playNext(); }); }
  function appPlayPrev() { callApp(function () { playPrev(); }); }
  function appClosePlayer() { callApp(function () { closePlayer(); }); }
  function appShowProfiles() { callApp(function () { showProfiles(); }); }
  function appPokeControls() { callApp(function () { pokeControls(); }); }
  function playerControlsHidden() {
    try { if (typeof controlsHidden === "function") return controlsHidden(); } catch (e) {}
    return false;
  }
  function seekBy(sec) {
    var p = ytPlayer(); if (!p) return;
    try {
      var t = (p.getCurrentTime() || 0) + sec;
      if (t < 0) t = 0;
      p.seekTo(t, true);
    } catch (e) {}
    appPokeControls();
  }
  function playOnly() { var p = ytPlayer(); if (p) { try { p.playVideo(); } catch (e) {} } appPokeControls(); }
  function pauseOnly() { var p = ytPlayer(); if (p) { try { p.pauseVideo(); } catch (e) {} } appPokeControls(); }

  /* ---- focus candidates & spatial navigation ---- */
  var FOCUSABLE = "button, a[href], input, [tabindex]";
  function candidates(scope) {
    var list = [];
    var els = scope.querySelectorAll(FOCUSABLE);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.disabled || el.hidden) continue;
      if (el.getAttribute("tabindex") === "-1" && el.id !== "shield") continue;
      if (!isVisible(el)) continue;
      list.push(el);
    }
    return list;
  }
  function center(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function moveFocus(dir) {
    var scope = currentView();
    var list = candidates(scope);
    if (!list.length) return false;
    var active = document.activeElement;
    var cur = null;
    for (var i = 0; i < list.length; i++) if (list[i] === active) { cur = active; break; }
    if (!cur) {
      // Nothing focused yet in this view: start at the first element
      // (top-most, then left-most).
      list.sort(function (a, b) {
        var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return (ra.top - rb.top) || (ra.left - rb.left);
      });
      focusEl(list[0]);
      return true;
    }
    var cr = cur.getBoundingClientRect(), cc = center(cr);
    var best = null, bestScore = Infinity;
    for (var j = 0; j < list.length; j++) {
      var el = list[j]; if (el === cur) continue;
      var r = el.getBoundingClientRect(), c = center(r);
      var dx = c.x - cc.x, dy = c.y - cc.y;
      var axis, cross, ok = false;
      if (dir === "left") { ok = dx < -4; axis = -dx; cross = Math.abs(dy); }
      else if (dir === "right") { ok = dx > 4; axis = dx; cross = Math.abs(dy); }
      else if (dir === "up") { ok = dy < -4; axis = -dy; cross = Math.abs(dx); }
      else { ok = dy > 4; axis = dy; cross = Math.abs(dx); }
      if (!ok) continue;
      // Prefer elements roughly in line (small cross offset), then nearest.
      var score = axis + cross * 2.2 + (cross > Math.max(cr.width, cr.height) ? axis * 0.5 : 0);
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) { focusEl(best); return true; }
    return false; // edge reached: keep focus where it is
  }
  function focusEl(el) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    try { el.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (e) {}
    if (inPlayer()) appPokeControls();
  }
  function focusFirst(scope) {
    var list = candidates(scope || currentView());
    if (list.length) {
      list.sort(function (a, b) {
        var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return (ra.top - rb.top) || (ra.left - rb.left);
      });
      focusEl(list[0]);
    }
  }

  /* ---- Back behaviour by context ---- */
  function goBack() {
    if (viewEl("pinView")) {
      // PIN pad has its own cancel key — press it.
      var cancel = document.querySelector('#pinPad button[data-key="cancel"]');
      if (cancel) { cancel.click(); return; }
    }
    if (viewEl("timeUpView")) { var h = $("timeUpHomeBtn"); if (h) { h.click(); return; } }
    if (inPlayer()) { appClosePlayer(); setTimeout(function () { focusFirst(); }, 60); return; }
    if (viewEl("parentView")) { var c = $("parentCloseBtn"); if (c) { c.click(); setTimeout(function () { focusFirst(); }, 60); } return; }
    if (viewEl("homeView")) { appShowProfiles(); setTimeout(function () { focusFirst(); }, 60); return; }
    // Profile gate = first screen: try to exit the app (Tizen), else platform default.
    exitApp();
  }
  function exitApp() {
    try {
      if (window.tizen && tizen.application && tizen.application.getCurrentApplication) {
        tizen.application.getCurrentApplication().exit();
        return;
      }
    } catch (e) {}
    // Hosted/remote pages cannot use the Tizen API; the TV platform itself
    // exits a hosted app when Back is pressed on its first screen. As a web
    // fallback, step back in history if there is anywhere to go.
    if (window.history && history.length > 1) history.back();
  }

  /* ---- Tizen extra-key registration (only where the API exists) ---- */
  function registerTizenKeys() {
    try {
      if (!window.tizen || !tizen.tvinputdevice) return;
      var keys = ["MediaPlay", "MediaPause", "MediaPlayPause", "MediaStop",
        "MediaFastForward", "MediaRewind", "MediaTrackNext", "MediaTrackPrevious",
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
      if (typeof tizen.tvinputdevice.registerKeyBatch === "function") {
        tizen.tvinputdevice.registerKeyBatch(keys, function () {}, function () {});
      } else if (typeof tizen.tvinputdevice.registerKey === "function") {
        keys.forEach(function (k) { try { tizen.tvinputdevice.registerKey(k); } catch (e) {} });
      }
    } catch (e) {}
  }

  /* ---- key handling (capture phase: we own these keys) ---- */
  var ARROWS = { 37: "left", 38: "up", 39: "right", 40: "down" };
  function enableTvMode() {
    if (!tvMode) { tvMode = true; document.body.classList.add("tv-nav"); }
  }

  document.addEventListener("keydown", function (e) {
    var code = e.keyCode || e.which || 0;
    var key = e.key || "";

    /* Back: Samsung Return = 10009; also handle names + 461 (some runtimes). */
    if (code === 10009 || code === 461 || key === "BrowserBack" || key === "GoBack") {
      e.preventDefault(); e.stopPropagation();
      enableTvMode();
      goBack();
      return;
    }
    /* Escape acts as Back outside the player too (desktop testing parity). */
    if (key === "Escape") {
      e.preventDefault(); e.stopPropagation();
      goBack();
      return;
    }

    /* Media keys work wherever the player is on screen. */
    if (inPlayer() || code === 10252) {
      var handled = true;
      switch (code) {
        case 415: playOnly(); break;                    // MediaPlay
        case 19: pauseOnly(); break;                    // MediaPause
        case 10252: appTogglePlay(); break;             // MediaPlayPause
        case 413: appClosePlayer(); setTimeout(function () { focusFirst(); }, 60); break; // MediaStop
        case 417: seekBy(30); break;                    // MediaFastForward
        case 412: seekBy(-30); break;                   // MediaRewind
        case 10253: appPlayNext(); break;               // MediaTrackNext
        case 10254: appPlayPrev(); break;               // MediaTrackPrevious
        default: handled = false;
      }
      if (handled) { e.preventDefault(); e.stopPropagation(); enableTvMode(); return; }
    }

    /* Typing in the search box: leave keys to the input (except Up/Down/Back). */
    var target = e.target;
    var typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
    if (typing && code !== 38 && code !== 40) return;

    /* Digits go straight to the PIN pad when it is open (remote number keys). */
    if (viewEl("pinView") && code >= 48 && code <= 57) {
      var digit = String(code - 48);
      var btn = document.querySelector('#pinPad button[data-key="' + digit + '"]');
      if (btn) { e.preventDefault(); e.stopPropagation(); btn.click(); }
      return;
    }
    if (viewEl("pinView") && code === 8) {
      var del = document.querySelector('#pinPad button[data-key="del"]');
      if (del) { e.preventDefault(); e.stopPropagation(); del.click(); }
      return;
    }

    /* Arrow keys: spatial navigation. */
    var dir = ARROWS[code] ||
      (key === "ArrowLeft" ? "left" : key === "ArrowRight" ? "right" :
       key === "ArrowUp" ? "up" : key === "ArrowDown" ? "down" : null);
    if (dir) {
      enableTvMode();
      e.preventDefault(); e.stopPropagation();

      if (inPlayer()) {
        var active = document.activeElement;
        var onVideo = !active || active === document.body || active.id === "shield" ||
          (active.tagName === "IFRAME");
        // First press while the controls are hidden only reveals them
        // (same rule as the first tap on the click-shield).
        if (playerControlsHidden()) {
          appPokeControls();
          var pb = $("playBtn"); if (pb) focusEl(pb);
          return;
        }
        // Focus on the video itself: Left/Right seek -/+ 10 s.
        if (onVideo && (dir === "left" || dir === "right")) { seekBy(dir === "left" ? -10 : 10); return; }
        // Focus on a player control: move between controls.
        if (moveFocus(dir)) return;
        // At the left/right edge of the control bar, fall back to seeking.
        if (dir === "left" || dir === "right") seekBy(dir === "left" ? -10 : 10);
        return;
      }
      moveFocus(dir);
      return;
    }

    /* Enter / OK: activate the focused element. Buttons fire click natively;
       we only intervene when nothing (or a non-native element) is focused. */
    if (code === 13 || key === "Enter") {
      enableTvMode();
      var a = document.activeElement;
      if (!a || a === document.body) { e.preventDefault(); focusFirst(); return; }
      if (a.id === "shield") { /* native click via focus is not automatic for divs */ e.preventDefault(); a.click(); return; }
      if (a.getAttribute && a.getAttribute("role") === "button" && a.tagName !== "BUTTON" && a.tagName !== "A") {
        e.preventDefault(); a.click();
      }
      return;
    }

    /* Space toggles play in the player (keep app.js behaviour, but own it here
       so it is not doubled) — only when focus is not on a button, because a
       focused button already clicks with Space natively. */
    if ((code === 32 || key === " ") && inPlayer()) {
      var el2 = document.activeElement;
      if (!el2 || el2 === document.body || el2.id === "shield") {
        e.preventDefault(); e.stopPropagation(); appTogglePlay();
      } else if (el2.tagName === "BUTTON" || el2.tagName === "A") {
        // The focused button clicks natively on Space; stop app.js's own
        // Space handler from ALSO toggling play (which would cancel it out).
        e.stopPropagation();
      }
    }
  }, true);

  /* ---- keep a sensible focus as views change / grid re-renders ---- */
  function onDomChanged() {
    if (!tvMode) return;
    var scope = currentView();
    var a = document.activeElement;
    if (!a || a === document.body || !scope.contains(a) || !isVisible(a)) {
      if (inPlayer()) { var pb = $("playBtn"); if (pb && isVisible(pb)) { focusEl(pb); return; } }
      focusFirst(scope);
    }
  }
  function initTv() {
    var shield = $("shield");
    if (shield && !shield.hasAttribute("tabindex")) shield.setAttribute("tabindex", "-1");
    registerTizenKeys();
    if ("MutationObserver" in window) {
      var mo = new MutationObserver(function () { setTimeout(onDomChanged, 30); });
      ["profileView", "homeView", "playerView", "parentView", "pinView", "timeUpView", "grid"].forEach(function (id) {
        var el = $(id); if (el) mo.observe(el, { attributes: true, attributeFilter: ["class"], childList: id === "grid" });
      });
    }
    // Also exit cleanly on the Tizen hardware-key event where it is delivered.
    window.addEventListener("tizenhwkey", function (ev) {
      if (ev && ev.keyName === "back") goBack();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initTv);
  else initTv();
})();
