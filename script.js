/* Black Force 007 — Full Cyber Quiz Engine
   Features:
   - Mobile-first UI
   - Questions array (editable)
   - Timer per question
   - Score, XP, Level system
   - Local leaderboard (localStorage)
   - WebAudio beeps (no external files)
   - Hints, Practice mode, Settings modal
   - Safe DOMContentLoaded wrapper
*/

document.addEventListener("DOMContentLoaded", () => {
  /* -------------------------
     CONFIG / QUESTIONS
     ------------------------- */
  const QUESTIONS = [
    { q: "HTTP কী এর জন্য?", a: ["HyperText Transfer Protocol", "High Transfer Text Protocol", "Home Transfer Type Protocol", "Hyperlink Transfer Tool"], correct: 0, hint: "ওয়েব পেজ লোড করার প্রটোকল" },
    { q: "পাসওয়ার্ডের জন্য কোনটি ভালো অনুশীলন?", a: ["common words ব্যবহার", "লম্বা ও মিশ্র ব্যবহার", "১৯৯০ জন্ম সাল", "একই পাসওয়ার্ড সবখানে"], correct: 1, hint: "মিশ্র অক্ষর+সংখ্যা+চিহ্ন" },
    { q: "Two-factor authentication (2FA) কী করে?", a: ["নেটওয়ার্ক ডাউন করে", "দুইটি আলাদা পরীক্ষায় করে ইউজার যাচাই", "পাসওয়ার্ড রিসেট করে", "কোনটাই না"], correct: 1, hint: "পাসওয়ার্ডের পাশাপাশি আরেকটি ভেরিফিকেশন" },
    { q: "কোনটি সিকিউর সংযোগ নির্দেশ করে (URL এ)?", a: ["http://", "ftp://", "https://", "file://"], correct: 2, hint: "লক আইকন থাকা URL" },
    { q: "CAPTCHA মূলত কেন?", a: ["বটগুলোকে আলাদা করা", "ডেটা এনক্রিপ্ট করা", "সার্ভার আপগ্রেড করা", "ইন্টারনেট স্পিড বাড়ানো"], correct: 0, hint: "মানব বনাম বট" }
    // Add more questions here. For production you can load JSON.
  ];

  const XP_PER_CORRECT = 5;
  const LEVEL_STEP = 15; // XP needed per level (simple linear)

  /* -------------------------
     APP STATE
     ------------------------- */
  let modePractice = false; // practice: no XP
  let soundOn = true;
  let vibrateOn = false;

  let cur = 0, score = 0, total = QUESTIONS.length;
  let timeLeft = 20, timerId = null;

  /* -------------------------
     DOM elements
     ------------------------- */
  const startBtn = document.getElementById("startBtn");
  const practiceBtn = document.getElementById("practiceBtn");
  const intro = document.getElementById("intro");
  const quiz = document.getElementById("quiz");
  const result = document.getElementById("result");
  const qNumber = document.getElementById("qNumber");
  const qTotal = document.getElementById("qTotal");
  const questionText = document.getElementById("questionText");
  const optionsDiv = document.getElementById("options");
  const nextBtn = document.getElementById("nextBtn");
  const timeEl = document.getElementById("time");
  const scoreEl = document.getElementById("score");
  const scoreText = document.getElementById("scoreText");
  const retryBtn = document.getElementById("retryBtn");
  const hintBtn = document.getElementById("hintBtn");
  const progressFill = document.getElementById("progressFill");
  const playerLevelEl = document.getElementById("playerLevel");
  const playerXPEl = document.getElementById("playerXP");
  const rankNameEl = document.getElementById("rankName");
  const nextRankXPEl = document.getElementById("nextRankXP");

  // Modals & settings
  const openLeaderboard = document.getElementById("openLeaderboard");
  const leaderboardModal = document.getElementById("leaderboardModal");
  const closeLeaderboard = document.getElementById("closeLeaderboard");
  const leaderboardList = document.getElementById("leaderboardList");
  const clearLeaderboard = document.getElementById("clearLeaderboard");

  const settingsBtn = document.getElementById("settingsBtn");
  const settingsModal = document.getElementById("settingsModal");
  const closeSettings = document.getElementById("closeSettings");
  const soundToggle = document.getElementById("soundToggle");
  const vibrateToggle = document.getElementById("vibrateToggle");
  const practiceToggle = document.getElementById("practiceToggle");

  const shareBtn = document.getElementById("shareBtn");

  qTotal.textContent = total;

  /* -------------------------
     Player persistence (localStorage)
     ------------------------- */
  const STORAGE_KEY = "blackforce007_player";
  const BOARD_KEY = "blackforce007_leaderboard";

  const player = loadPlayer();

  function loadPlayer() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        soundOn = !!p.sound;
        vibrateOn = !!p.vibrate;
        modePractice = !!p.practice;
        updateSettingsUI();
        return p;
      }
    } catch (e) {}
    const base = { xp: 0, level: 1, name: "Agent", sound: true, vibrate: false, practice: false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(base));
    updateSettingsUI();
    return base;
  }

  function savePlayer() {
    const toSave = { xp: player.xp, level: player.level, name: player.name, sound: soundOn, vibrate: vibrateOn, practice: modePractice };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    updatePlayerUI();
  }

  function updatePlayerUI() {
    playerLevelEl.textContent = player.level;
    playerXPEl.textContent = player.xp;
    rankNameEl.textContent = getRankName(player.level);
    nextRankXPEl.textContent = (player.level * LEVEL_STEP);
  }

  function updateSettingsUI() {
    if (soundToggle) soundToggle.checked = soundOn;
    if (vibrateToggle) vibrateToggle.checked = vibrateOn;
    if (practiceToggle) practiceToggle.checked = modePractice;
  }

  /* -------------------------
     WebAudio simple tones
     ------------------------- */
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  function ensureAudio() { if (!audioCtx) audioCtx = new AudioCtx(); }
  function playTone(freq = 440, dur = 120, type = "sine", vol = 0.06) {
    if (!soundOn) return;
    try {
      ensureAudio();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g); g.connect(audioCtx.destination);
      o.start();
      setTimeout(() => { o.stop(); }, dur);
    } catch (e) { /* ignore */ }
  }
  function soundCorrect(){ playTone(880, 150, "sine", 0.08); }
  function soundWrong(){ playTone(200, 220, "sawtooth", 0.09); }
  function soundClick(){ playTone(1200, 60, "triangle", 0.03); }

  /* -------------------------
     RANK LOGIC
     ------------------------- */
  function getRankName(level){
    if(level >= 10) return "Black Force Commander";
    if(level >= 6) return "Tech Commander";
    if(level >= 4) return "Hacker Elite";
    if(level >= 2) return "Field Agent";
    return "Cadet";
  }

  /* -------------------------
     Leaderboard (local)
     ------------------------- */
  function loadLeaderboard(){
    try {
      const raw = localStorage.getItem(BOARD_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e){ return []; }
  }
  function saveToLeaderboard(name, score, xp){
    const list = loadLeaderboard();
    list.push({ name, score, xp, at: Date.now() });
    // sort desc by score then xp
    list.sort((a,b) => (b.score - a.score) || (b.xp - a.xp));
    localStorage.setItem(BOARD_KEY, JSON.stringify(list.slice(0,50)));
  }
  function renderLeaderboard(){
    const list = loadLeaderboard();
    if (!leaderboardList) return;
    leaderboardList.innerHTML = "";
    if (list.length === 0) {
      leaderboardList.innerHTML = "<p class='muted'>No entries yet.</p>";
      return;
    }
    list.forEach((it, idx) => {
      const div = document.createElement("div");
      div.className = "leaderItem";
      div.innerHTML = `<div>#${idx+1} ${escapeHtml(it.name)}</div><div>${it.score} pts · ${it.xp} XP</div>`;
      leaderboardList.appendChild(div);
    });
  }

  function clearBoard(){
    localStorage.removeItem(BOARD_KEY);
    renderLeaderboard();
  }

  /* -------------------------
     UI EVENTS
     ------------------------- */
  startBtn.addEventListener("click", () => {
    soundClick();
    modePractice = false;
    startGame();
  });
  practiceBtn.addEventListener("click", () => {
    soundClick();
    modePractice = true;
    startGame();
  });

  openLeaderboard.addEventListener("click", () => {
    renderLeaderboard();
    leaderboardModal.classList.remove("hidden");
  });
  closeLeaderboard.addEventListener("click", () => leaderboardModal.classList.add("hidden"));
  clearLeaderboard.addEventListener("click", () => { clearBoard(); });

  settingsBtn.addEventListener("click", () => settingsModal.classList.remove("hidden"));
  closeSettings.addEventListener("click", () => {
    settingsModal.classList.add("hidden");
    savePlayer();
  });

  soundToggle.addEventListener("change", (e) => { soundOn = soundToggle.checked; savePlayer(); });
  vibrateToggle.addEventListener("change", (e) => { vibrateOn = vibrateToggle.checked; savePlayer(); });
  practiceToggle.addEventListener("change", (e) => { modePractice = practiceToggle.checked; savePlayer(); });

  hintBtn.addEventListener("click", () => {
    const q = QUESTIONS[cur];
    if (!q || !q.hint) return alert("Hint not available");
    alert("Hint: " + q.hint);
  });

  nextBtn.addEventListener("click", () => {
    soundClick();
    cur++;
    if (cur < total) showQuestion();
    else finishGame();
  });

  retryBtn.addEventListener("click", () => {
    soundClick();
    backToIntro();
  });

  shareBtn.addEventListener("click", () => {
    const text = `I scored ${score} in Black Force 007 — Cyber Quiz. Rank: ${getRankName(player.level)}. Can you beat me?`;
    if (navigator.share) {
      navigator.share({ title: "Black Force 007 Score", text, url: location.href }).catch(()=>{});
    } else {
      copyToClipboard(text);
      alert("Score copied to clipboard. Share it!");
    }
  });

  /* -------------------------
     GAME FLOW
     ------------------------- */
  function startGame(){
    // reset state
    cur = 0; score = 0;
    qTotal.textContent = total;
    intro.classList.add("hidden");
    result.classList.add("hidden");
    quiz.classList.remove("hidden");
    updateScoreUI();
    showQuestion();
  }

  function showQuestion(){
    nextBtn.disabled = true;
    const item = QUESTIONS[cur];
    qNumber.textContent = cur + 1;
    questionText.textContent = item.q;
    optionsDiv.innerHTML = "";
    timeLeft = 20;
    timeEl.textContent = timeLeft;
    updateProgress();

    item.a.forEach((opt, idx) => {
      const el = document.createElement("div");
      el.className = "option";
      el.setAttribute("tabindex","0");
      el.textContent = opt;
      el.addEventListener("click", () => selectOption(el, idx));
      el.addEventListener("keypress", (e) => { if (e.key === "Enter") selectOption(el, idx); });
      optionsDiv.appendChild(el);
    });

    // start timer
    resetTimer();
  }

  function selectOption(el, idx){
    clearInterval(timerId);
    const correctIdx = QUESTIONS[cur].correct;

    Array.from(optionsDiv.children).forEach((c, i) => {
      c.style.pointerEvents = "none";
      if (i === correctIdx) c.classList.add("correct");
      if (i === idx && i !== correctIdx) c.classList.add("wrong");
    });

    if (idx === correctIdx) {
      score += 10;
      if (!modePractice) addXP(XP_PER_CORRECT);
      soundCorrect();
      flashScreen(true);
    } else {
      soundWrong();
      flashScreen(false);
      if (vibrateOn && navigator.vibrate) navigator.vibrate(180);
    }
    updateScoreUI();
    nextBtn.disabled = false;
  }

  function resetTimer(){
    clearInterval(timerId);
    timeLeft = 20;
    timeEl.textContent = timeLeft;
    timerId = setInterval(() => {
      timeLeft--;
      timeEl.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(timerId);
        // reveal correct
        Array.from(optionsDiv.children).forEach((c,i) => {
          c.style.pointerEvents = "none";
          if (i === QUESTIONS[cur].correct) c.classList.add("correct");
        });
        nextBtn.disabled = false;
      }
    },1000);
  }

  function updateProgress(){
    const pct = Math.round(((cur) / total) * 100);
    if (progressFill) progressFill.style.width = pct + "%";
  }

  function updateScoreUI(){
    scoreEl.textContent = score;
    updatePlayerUI();
  }

  function addXP(val){
    player.xp = (player.xp || 0) + val;
    // level up logic
    const needed = player.level * LEVEL_STEP;
    while (player.xp >= needed) {
      player.xp = player.xp - needed;
      player.level = (player.level || 1) + 1;
    }
    savePlayer();
  }

  function finishGame(){
    quiz.classList.add("hidden");
    result.classList.remove("hidden");
    scoreText.textContent = `তুমি ${score} পেয়েছো। ${modePractice ? "(Practice mode — XP not awarded)" : ""}`;
    // Save to leaderboard
    if (!modePractice) {
      saveToLeaderboard(player.name || "Agent", score, player.xp || 0);
    }
  }

  function backToIntro(){
    quiz.classList.add("hidden");
    result.classList.add("hidden");
    intro.classList.remove("hidden");
  }

  /* -------------------------
     UTILITIES
     ------------------------- */
  function flashScreen(correct = true){
    const color = correct ? "rgba(57,255,20,0.06)" : "rgba(255,59,59,0.06)";
    const el = document.createElement("div");
    el.style.position = "fixed";
    el.style.inset = "0";
    el.style.background = color;
    el.style.pointerEvents = "none";
    el.style.opacity = "0";
    el.style.transition = "opacity 160ms ease-out";
    document.body.appendChild(el);
    requestAnimationFrame(()=> el.style.opacity = "1");
    setTimeout(()=> { el.style.opacity = "0"; setTimeout(()=> el.remove(),180); }, 160);
  }

  function copyToClipboard(text){
    try {
      navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
    }
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"'`]/g, (m)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',"`":'&#96;'})[m]); }

  /* -------------------------
     INITIALIZE UI
     ------------------------- */
  updatePlayerUI();
  renderLeaderboard();

  // keyboard: allow next by Enter/Space
  document.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && !nextBtn.disabled && !nextBtn.classList.contains("hidden")){
      nextBtn.click();
    }
  });

  /* -------------------------
     End of DOMContentLoaded
     ------------------------- */
});
function openSettings() {
  document.body.classList.add('modal-open');
  document.querySelector('.settings-popup').classList.remove('hidden');
}

function closeSettings() {
  document.body.classList.remove('modal-open');
  document.querySelector('.settings-popup').classList.add('hidden');
}
