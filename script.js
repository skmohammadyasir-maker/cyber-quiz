// Robust script.js for Black Force 007 — will work even if QUESTIONS missing
document.addEventListener("DOMContentLoaded", () => {
  try {
    // If QUESTIONS not defined or empty, provide a safe default set
    if (typeof QUESTIONS === "undefined" || !Array.isArray(QUESTIONS) || QUESTIONS.length === 0) {
      console.warn("QUESTIONS missing or empty — loading fallback sample questions.");
      window.QUESTIONS = [
        { q: "HTTP কী এর জন্য?", a: ["HyperText Transfer Protocol","High Transfer Text Protocol","Home Transfer Type Protocol","Hyperlink Transfer Tool"], correct: 0 },
        { q: "HTTPS এ S মানে?", a: ["Secure","Server","Social","System"], correct: 0 },
        { q: "Two-factor authentication (2FA) কী করে?", a: ["নেটওয়ার্ক ডাউন করে","দুইটি আলাদা পরীক্ষায় করে ইউজার যাচাই","পাসওয়ার্ড রিসেট করে","কোনটাই না"], correct: 1 }
      ];
    }

    const QUESTIONS_REF = window.QUESTIONS;
    // Basic safety: ensure QUESTIONS_REF is an array
    if (!Array.isArray(QUESTIONS_REF)) throw new Error("QUESTIONS is not an array.");

    // DOM elements (must match your index.html ids)
    const startBtn = document.getElementById("startBtn");
    const intro = document.getElementById("intro");
    const quiz = document.getElementById("quiz");
    const result = document.getElementById("result");
    const qNumber = document.getElementById("qNumber");
    const qTotal = document.getElementById("qTotal");
    const questionText = document.getElementById("questionText");
    const optionsDiv = document.getElementById("options");
    const nextBtn = document.getElementById("nextBtn");
    const timeEl = document.getElementById("time");
    const scoreText = document.getElementById("scoreText");
    const retryBtn = document.getElementById("retryBtn");
    const scoreEl = document.getElementById("score");

    // check DOM existence
    const required = { startBtn, intro, quiz, result, qNumber, qTotal, questionText, optionsDiv, nextBtn, timeEl };
    for (const [k,v] of Object.entries(required)) {
      if (!v) console.warn(`Warning: element with id "${k}" not found in DOM.`);
    }

    // game state
    let cur = 0, score = 0, timeLeft = 20, timerId = null;
    const total = QUESTIONS_REF.length;
    qTotal.textContent = total;

    // start
    if (startBtn) startBtn.addEventListener("click", () => {
      intro.classList && intro.classList.add("hidden");
      quiz.classList && quiz.classList.remove("hidden");
      cur = 0; score = 0;
      showQuestion();
    });

    // showQuestion
    function showQuestion() {
      if (!QUESTIONS_REF[cur]) {
        console.error("No question at index", cur);
        return showResult();
      }
      nextBtn.disabled = true;
      clearInterval(timerId);
      timeLeft = 20;
      timeEl && (timeEl.textContent = timeLeft);

      const item = QUESTIONS_REF[cur];
      qNumber && (qNumber.textContent = cur + 1);
      questionText && (questionText.textContent = item.q || "No question text");

      optionsDiv && (optionsDiv.innerHTML = "");
      if (Array.isArray(item.a)) {
        item.a.forEach((opt, idx) => {
          const btn = document.createElement("div");
          btn.className = "option";
          btn.tabIndex = 0;
          btn.textContent = opt;
          btn.addEventListener("click", () => selectOption(btn, idx));
          btn.addEventListener("keypress", (e) => { if (e.key === "Enter") selectOption(btn, idx); });
          optionsDiv.appendChild(btn);
        });
      } else {
        console.warn("Question has no options array:", item);
      }
      // start timer
      timerId = setInterval(() => {
        timeLeft--;
        if (timeEl) timeEl.textContent = timeLeft;
        if (timeLeft <= 0) {
          clearInterval(timerId);
          Array.from(optionsDiv.children).forEach((c,i) => {
            c.style.pointerEvents = "none";
            if (i === QUESTIONS_REF[cur].correct) c.classList.add("correct");
          });
          nextBtn.disabled = false;
        }
      }, 1000);
    }

    function selectOption(el, idx) {
      clearInterval(timerId);
      const correctIdx = QUESTIONS_REF[cur].correct;
      Array.from(optionsDiv.children).forEach((c,i) => {
        c.style.pointerEvents = "none";
        if (i === correctIdx) c.classList.add("correct");
        if (i === idx && i !== correctIdx) c.classList.add("wrong");
      });
      if (idx === correctIdx) score++;
      if (scoreEl) scoreEl.textContent = score;
      nextBtn.disabled = false;
    }

    if (nextBtn) nextBtn.addEventListener("click", () => {
      cur++;
      if (cur < total) showQuestion();
      else showResult();
    });

    function showResult() {
      quiz.classList && quiz.classList.add("hidden");
      result.classList && result.classList.remove("hidden");
      if (scoreText) scoreText.textContent = `তুমি ${score} / ${total} পেয়েছো।`;
    }

    if (retryBtn) retryBtn.addEventListener("click", () => location.reload());

    // expose for debug
    window.__BF_DEBUG = {
      QUESTIONS: QUESTIONS_REF,
      total,
      currentIndex: () => cur,
      score: () => score
    };

    console.log("Black Force quiz initialized — questions:", total);
  } catch (err) {
    console.error("Quiz initialization error:", err);
  }
});
