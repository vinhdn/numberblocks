// Hoc toan cung Numberblocks - kid-safe app logic
// Rules: full-page player, all controls inside the player, invisible
// click-shield over the video, no YouTube suggestions or overlays,
// captions off on every start, controls auto-hide after 3s while playing.
const LS = {
  pin: "nb_pin",
  timer: "nb_timer_min",
  history: "nb_history",
  profile: "nb_profile"
};
document.documentElement.classList.add("js");
const $ = (id) => document.getElementById(id);

const LEVELS = {
  1: { name: "Level 1 - Số đến 5", short: "Level 1" },
  2: { name: "Level 2 - Số đến 10", short: "Level 2" },
  3: { name: "Level 3 - Số đến 20", short: "Level 3" },
  4: { name: "Level 4 - Số đến 50", short: "Level 4" },
  5: { name: "Level 5 - Số đến 100", short: "Level 5" }
};
const CATS = {
  "dem-so": "Đếm số",
  "cong-tru": "Cộng và trừ",
  "nhan": "Học nhân",
  "chia": "Học chia",
  "gap-doi-mot-nua": "Gấp đôi và một nửa",
  "so-chan-le": "Số chẵn và số lẻ",
  "pattern": "Quy luật",
  "tong-hop": "Tổng hợp"
};
const PROFILE_LEVELS = { nho: [1, 2], lon: [3, 4, 5] };
const ICON_PLAY = '<path d="M8 5.5v13l11-6.5z"/>';
const ICON_PAUSE = '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>';
const ICON_VOL = '<path d="M11 5L6 9H3v6h3l5 4z" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13"/>';
const ICON_MUTE = '<path d="M11 5L6 9H3v6h3l5 4z" fill="currentColor" stroke="none"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>';

let profile = localStorage.getItem(LS.profile) || "";
let pin = localStorage.getItem(LS.pin) || "1234";
let timerMin = parseInt(localStorage.getItem(LS.timer) || "0", 10);

let curLevel = 0; // 0 = all levels in profile
let curCat = "tat-ca";
let searchQuery = "";
let queue = [];
let currentIdx = -1;
let player = null;
let playerReady = false;
let progressTimer = null;
let hideTimer = null;
let countdownTimer = null;
let timeLeftSec = -1;
let errorStreak = 0;
let muted = false;
let repeatOne = false;
let pinMode = "enter"; // enter | set-new
let pinBuffer = "";
let pinReturnTo = "home"; // where to go back after pin cancel

const VIDEOS = Array.isArray(window.NUMBERBLOCKS_VIDEOS) ? window.NUMBERBLOCKS_VIDEOS : [];

// ---------- filtering ----------
function profileVideos() {
  if (!profile) return [];
  return VIDEOS.filter((v) => v.profile === profile || v.profile === "ca-hai");
}
function visibleVideos() {
  let list = profileVideos();
  if (curLevel) list = list.filter((v) => v.level === curLevel);
  if (curCat !== "tat-ca") list = list.filter((v) => v.cat === curCat);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter((v) => v.t.toLowerCase().includes(q));
  }
  return list;
}
function fmtDur(sec) {
  if (!sec) return "";
  const m = Math.round(sec / 60);
  return m >= 60 ? Math.floor(m / 60) + " giờ " + (m % 60) + " phút" : m + " phút";
}

// ---------- home ----------
function renderChips() {
  const lv = $("levelChips");
  lv.innerHTML = "";
  const mk = (label, val, cls) => {
    const b = document.createElement("button");
    b.className = "chip " + (cls || "") + (curLevel === val ? " active" : "");
    b.textContent = label;
    b.onclick = () => { curLevel = val; renderChips(); renderGrid(); };
    return b;
  };
  lv.appendChild(mk("Tất cả level", 0, ""));
  (PROFILE_LEVELS[profile] || []).forEach((n) => {
    const count = profileVideos().filter((v) => v.level === n).length;
    if (count) lv.appendChild(mk(LEVELS[n].name + " (" + count + ")", n, "lv-" + n));
  });

  const ct = $("catChips");
  ct.innerHTML = "";
  const catsPresent = [];
  profileVideos().forEach((v) => { if (!catsPresent.includes(v.cat)) catsPresent.push(v.cat); });
  const order = Object.keys(CATS).filter((c) => catsPresent.includes(c));
  const mkCat = (label, val) => {
    const b = document.createElement("button");
    b.className = "chip" + (curCat === val ? " active" : "");
    b.textContent = label;
    b.onclick = () => { curCat = val; renderChips(); renderGrid(); };
    return b;
  };
  ct.appendChild(mkCat("Tất cả chủ đề", "tat-ca"));
  order.forEach((c) => {
    const count = profileVideos().filter((v) => v.cat === c).length;
    ct.appendChild(mkCat(CATS[c] + " (" + count + ")", c));
  });
}
function renderGrid() {
  queue = visibleVideos();
  $("countLine").textContent = "Có " + queue.length + " video cho bé xem.";
  const grid = $("grid");
  grid.innerHTML = "";
  $("emptyMsg").classList.toggle("hidden", queue.length > 0);
  const frag = document.createDocumentFragment();
  queue.forEach((v, i) => {
    const card = document.createElement("button");
    card.className = "card";
    const thumb = document.createElement("div");
    thumb.className = "thumb";
    const img = document.createElement("img");
    img.src = "https://i.ytimg.com/vi/" + v.id + "/hqdefault.jpg";
    img.alt = v.t;
    img.loading = "lazy";
    const pm = document.createElement("span");
    pm.className = "play-mini";
    pm.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
    thumb.appendChild(img); thumb.appendChild(pm);
    const body = document.createElement("div");
    body.className = "card-body";
    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = v.t;
    const meta = document.createElement("div");
    meta.className = "card-meta";
    const lp = document.createElement("span");
    lp.className = "meta-pill lv-" + v.level;
    lp.textContent = LEVELS[v.level] ? LEVELS[v.level].short : "Level " + v.level;
    meta.appendChild(lp);
    const cp = document.createElement("span");
    cp.className = "meta-pill";
    cp.textContent = CATS[v.cat] || "Tổng hợp";
    meta.appendChild(cp);
    if (v.dur) {
      const dp = document.createElement("span");
      dp.className = "meta-pill";
      dp.textContent = fmtDur(v.dur);
      meta.appendChild(dp);
    }
    body.appendChild(title); body.appendChild(meta);
    card.appendChild(thumb); card.appendChild(body);
    card.onclick = () => openPlayer(i);
    frag.appendChild(card);
  });
  grid.appendChild(frag);
}
function enterProfile(p) {
  profile = p;
  localStorage.setItem(LS.profile, p);
  curLevel = 0; curCat = "tat-ca"; searchQuery = "";
  if ($("searchInput")) $("searchInput").value = "";
  $("homeTitle").textContent = p === "nho" ? "Lớp bé nhỏ - Đếm số vui" : "Lớp bé lớn - Nhân chia giỏi";
  $("profileView").classList.add("hidden");
  $("parentView").classList.add("hidden");
  $("homeView").classList.remove("hidden");
  renderChips(); renderGrid();
  window.scrollTo(0, 0);
}
function showProfiles() {
  closePlayer(true);
  $("homeView").classList.add("hidden");
  $("parentView").classList.add("hidden");
  $("profileView").classList.remove("hidden");
}

// ---------- player ----------
function loadYouTubeAPI(cb) {
  if (window.YT && YT.Player) return cb();
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => { if (prev) prev(); cb(); };
}
function saveHistory(v) {
  let h = [];
  try { h = JSON.parse(localStorage.getItem(LS.history) || "[]"); } catch (e) { h = []; }
  h.unshift({ t: v.t, id: v.id, profile: profile, at: new Date().toLocaleString("vi-VN") });
  localStorage.setItem(LS.history, JSON.stringify(h.slice(0, 40)));
}
function openPlayer(i) {
  currentIdx = i;
  const v = queue[i];
  if (!v) return;
  $("homeView").classList.add("hidden");
  $("profileView").classList.add("hidden");
  $("playerView").classList.remove("hidden");
  $("nowTitle").textContent = v.t;
  errorStreak = 0;
  saveHistory(v);
  startTimerIfSet();
  loadYouTubeAPI(() => {
    if (!player) {
      player = new YT.Player("ytPlayer", {
        videoId: v.id,
        playerVars: {
          autoplay: 1, controls: 0, rel: 0, fs: 0,
          modestbranding: 1, iv_load_policy: 3, disablekb: 1,
          playsinline: 1, cc_load_policy: 0
        },
        events: {
          onReady: (e) => {
            playerReady = true;
            try { e.target.unloadModule("captions"); } catch (err) {}
            try { e.target.setOption("captions", "track", {}); } catch (err) {}
            e.target.playVideo();
            syncPlayUI();
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED) {
              if (repeatOne) { try { e.target.seekTo(0); e.target.playVideo(); } catch (err) {} }
              else playNext();
            }
            if (e.data === YT.PlayerState.PLAYING) {
              errorStreak = 0;
              try { e.target.unloadModule("captions"); } catch (err) {}
            }
            syncPlayUI();
          },
          onError: () => { errorStreak++; if (errorStreak <= 3) playNext(); else closePlayer(); }
        }
      });
    } else {
      player.loadVideoById(v.id);
      try { player.unloadModule("captions"); } catch (err) {}
    }
  });
  startProgress();
  pokeControls();
}
function closePlayer(silent) {
  if (player && playerReady) { try { player.pauseVideo(); } catch (e) {} }
  stopProgress();
  stopCountdown();
  $("playerView").classList.add("hidden");
  if (!silent && profile) $("homeView").classList.remove("hidden");
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
function playNext() {
  if (currentIdx + 1 < queue.length) openPlayer(currentIdx + 1);
  else closePlayer();
}
function playPrev() {
  if (currentIdx > 0) openPlayer(currentIdx - 1);
}
function syncPlayUI() {
  if (!player || !playerReady) return;
  let playing = false;
  try { playing = player.getPlayerState() === YT.PlayerState.PLAYING; } catch (e) {}
  $("playIcon").innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  $("bigPlay").classList.toggle("hidden", playing);
  if (playing) pokeControls();
  else { clearTimeout(hideTimer); showControls(); }
}
function showControls() {
  document.querySelectorAll(".player-topbar, .player-bottom").forEach((el) => el.classList.remove("fade"));
  $("videoBox").classList.remove("idle");
}
function hideControls() {
  document.querySelectorAll(".player-topbar, .player-bottom").forEach((el) => el.classList.add("fade"));
  $("videoBox").classList.add("idle");
}
function controlsHidden() {
  return document.querySelector(".player-topbar").classList.contains("fade");
}
function pokeControls() {
  showControls();
  clearTimeout(hideTimer);
  if (player && playerReady) {
    let playing = false;
    try { playing = player.getPlayerState() === YT.PlayerState.PLAYING; } catch (e) {}
    if (playing) hideTimer = setTimeout(hideControls, 3000);
  }
}
function togglePlay() {
  if (!player || !playerReady) return;
  try {
    if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo();
    else player.playVideo();
  } catch (e) {}
  setTimeout(syncPlayUI, 250);
}
function startProgress() {
  stopProgress();
  progressTimer = setInterval(() => {
    if (player && playerReady) {
      let d = 0, c = 0;
      try { d = player.getDuration() || 0; c = player.getCurrentTime() || 0; } catch (e) {}
      if (d > 0) {
        const pct = (c / d) * 100;
        $("progressBar").style.width = pct + "%";
        $("progressKnob").style.left = pct + "%";
      }
    }
  }, 500);
}
function stopProgress() { if (progressTimer) clearInterval(progressTimer); progressTimer = null; }

// ---------- viewing timer ----------
function startTimerIfSet() {
  stopCountdown();
  if (!timerMin) { $("timerBadge").classList.add("hidden"); $("timerLine").classList.add("hidden"); return; }
  timeLeftSec = timerMin * 60;
  updateTimerUI();
  countdownTimer = setInterval(() => {
    timeLeftSec--;
    updateTimerUI();
    if (timeLeftSec <= 0) { stopCountdown(); timeUp(); }
  }, 1000);
}
function stopCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = null; timeLeftSec = -1;
}
function updateTimerUI() {
  if (timeLeftSec < 0) return;
  const m = Math.floor(timeLeftSec / 60), s = timeLeftSec % 60;
  const txt = m + ":" + String(s).padStart(2, "0");
  $("timerText").textContent = txt;
  $("timerBadge").textContent = "Còn " + txt;
  $("timerBadge").classList.remove("hidden");
  $("timerLine").classList.remove("hidden");
}
function timeUp() {
  if (player && playerReady) { try { player.pauseVideo(); } catch (e) {} }
  stopProgress();
  $("playerView").classList.add("hidden");
  $("timeUpView").classList.remove("hidden");
}

// ---------- PIN and parent ----------
function askPin(returnTo) {
  pinMode = "enter";
  pinReturnTo = returnTo || "home";
  pinBuffer = "";
  $("pinTitle").textContent = "Nhập mã PIN của cha mẹ";
  $("pinError").classList.add("hidden");
  drawPinDots();
  $("homeView").classList.add("hidden");
  $("profileView").classList.add("hidden");
  $("timeUpView").classList.add("hidden");
  if (!$("playerView").classList.contains("hidden") && player && playerReady) {
    try { player.pauseVideo(); } catch (e) {}
  }
  $("playerView").classList.add("hidden");
  $("pinView").classList.remove("hidden");
}
function drawPinDots() {
  let out = "";
  for (let i = 0; i < 4; i++) out += (i < pinBuffer.length ? "●" : "○") + (i < 3 ? " " : "");
  $("pinDots").textContent = out;
}
function closePin() {
  $("pinView").classList.add("hidden");
  if (pinReturnTo === "profile") $("profileView").classList.remove("hidden");
  else if (profile) $("homeView").classList.remove("hidden");
  else $("profileView").classList.remove("hidden");
}
function pinSuccess() {
  $("pinView").classList.add("hidden");
  if (pinMode === "set-new-done") { closePin(); return; }
  renderParent();
  $("parentView").classList.remove("hidden");
}
function renderParent() {
  document.querySelectorAll("#timerOptions button").forEach((b) => {
    b.classList.toggle("active", parseInt(b.dataset.min, 10) === timerMin);
  });
  $("videoCount").textContent = "Tổng số video đã kiểm tra trong danh sách: " + VIDEOS.length +
    " (bé nhỏ: " + VIDEOS.filter((v) => v.profile !== "lon").length +
    ", bé lớn: " + VIDEOS.filter((v) => v.profile !== "nho").length + ").";
  let h = [];
  try { h = JSON.parse(localStorage.getItem(LS.history) || "[]"); } catch (e) { h = []; }
  const box = $("historyList");
  box.innerHTML = "";
  if (!h.length) box.innerHTML = '<p class="hint">Chưa có lịch sử xem trên máy này.</p>';
  h.slice(0, 15).forEach((item) => {
    const d = document.createElement("div");
    d.className = "history-item";
    const b = document.createElement("b"); b.textContent = item.t;
    const s = document.createElement("span"); s.textContent = (item.profile === "nho" ? "Bé nhỏ" : "Bé lớn") + " · " + item.at;
    d.appendChild(b); d.appendChild(s);
    box.appendChild(d);
  });
}

// ---------- wiring ----------
function init() {
  $("doorNho").onclick = () => enterProfile("nho");
  $("doorLon").onclick = () => enterProfile("lon");
  $("switchProfileBtn").onclick = showProfiles;
  $("parentBtn0").onclick = () => askPin("profile");
  $("parentBtn").onclick = () => askPin("home");
  $("parentBtn2").onclick = () => askPin("home");
  $("timeUpParentBtn").onclick = () => askPin("home");
  $("timeUpHomeBtn").onclick = () => { $("timeUpView").classList.add("hidden"); if (profile) { $("homeView").classList.remove("hidden"); } else $("profileView").classList.remove("hidden"); };
  $("parentCloseBtn").onclick = () => { $("parentView").classList.add("hidden"); if (profile) $("homeView").classList.remove("hidden"); else $("profileView").classList.remove("hidden"); };

  $("searchBtn").onclick = () => {
    const bar = $("searchBar");
    bar.classList.toggle("hidden");
    if (!bar.classList.contains("hidden")) $("searchInput").focus();
  };
  $("searchInput").addEventListener("input", (e) => { searchQuery = e.target.value.trim(); renderGrid(); });

  // shield: first tap while controls are hidden only reveals controls.
  $("shield").addEventListener("click", () => {
    if (controlsHidden()) { pokeControls(); return; }
    togglePlay();
    pokeControls();
  });
  $("videoBox").addEventListener("mousemove", pokeControls);
  $("playBtn").onclick = () => { togglePlay(); };
  $("bigPlay").onclick = () => { togglePlay(); };
  $("backBtn").onclick = () => closePlayer();
  $("nextBtn").onclick = () => playNext();
  $("prevBtn").onclick = () => playPrev();
  $("repeatBtn").onclick = () => {
    repeatOne = !repeatOne;
    $("repeatBtn").classList.toggle("on", repeatOne);
    pokeControls();
  };
  $("volBtn").onclick = () => {
    if (!player || !playerReady) return;
    muted = !muted;
    try { if (muted) player.mute(); else player.unMute(); } catch (e) {}
    $("volIcon").innerHTML = muted ? ICON_MUTE : ICON_VOL;
    pokeControls();
  };
  $("fsBtn").onclick = () => {
    const box = $("videoBox");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (box.requestFullscreen) box.requestFullscreen().catch(() => {});
    pokeControls();
  };
  $("progressWrap").addEventListener("click", (e) => {
    if (!player || !playerReady) return;
    const r = $("progressWrap").getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    let d = 0;
    try { d = player.getDuration() || 0; } catch (err) {}
    if (d > 0) { try { player.seekTo(d * ratio, true); } catch (err) {} }
    pokeControls();
  });

  document.querySelectorAll("#pinPad button").forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.key;
      if (k === "cancel") { closePin(); return; }
      if (k === "del") { pinBuffer = pinBuffer.slice(0, -1); drawPinDots(); return; }
      if (pinBuffer.length >= 4) return;
      pinBuffer += k;
      drawPinDots();
      if (pinBuffer.length === 4) {
        setTimeout(() => {
          if (pinMode === "set-new") {
            pin = pinBuffer;
            localStorage.setItem(LS.pin, pin);
            pinMode = "set-new-done";
            $("pinTitle").textContent = "Đã đổi mã PIN xong";
            setTimeout(pinSuccess, 500);
          } else if (pinBuffer === pin) {
            pinSuccess();
          } else {
            $("pinError").classList.remove("hidden");
            pinBuffer = "";
            drawPinDots();
          }
        }, 180);
      }
    };
  });

  document.querySelectorAll("#timerOptions button").forEach((b) => {
    b.onclick = () => {
      timerMin = parseInt(b.dataset.min, 10);
      localStorage.setItem(LS.timer, String(timerMin));
      renderParent();
    };
  });
  $("changePinBtn").onclick = () => {
    $("parentView").classList.add("hidden");
    pinMode = "set-new";
    pinBuffer = "";
    $("pinTitle").textContent = "Nhập mã PIN mới gồm 4 số";
    $("pinError").classList.add("hidden");
    drawPinDots();
    pinReturnTo = "home";
    $("pinView").classList.remove("hidden");
  };
  $("clearHistoryBtn").onclick = () => { localStorage.removeItem(LS.history); renderParent(); };

  document.addEventListener("keydown", (e) => {
    if ($("playerView").classList.contains("hidden")) return;
    if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); }
    if (e.key === "ArrowRight") playNext();
    if (e.key === "ArrowLeft") playPrev();
    if (e.key === "Escape") closePlayer();
  });
}
document.addEventListener("DOMContentLoaded", init);

/* ===== PWA: service worker + nút cài ứng dụng (Android Chrome) ===== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => { /* trang vẫn chạy bình thường nếu SW lỗi */ });
  });
}
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById("installAppBtn");
  if (btn) btn.hidden = false;
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  const btn = document.getElementById("installAppBtn");
  if (btn) btn.hidden = true;
  const hint = document.getElementById("installHint");
  if (hint) hint.textContent = "Đã cài xong. Từ giờ mở biểu tượng Numberblocks trên màn hình chính để vào thẳng ứng dụng.";
});
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("installAppBtn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice && choice.outcome === "accepted") btn.hidden = true;
    deferredInstallPrompt = null;
  });
});
