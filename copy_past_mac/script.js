document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("startButton");
  const resetBtn = document.getElementById("resetBtn");

  const statusLine = document.getElementById("statusLine");
  const gameContainer = document.getElementById("gameContainer");

  const randomTextEl = document.getElementById("randomText");
  const inputField = document.getElementById("inputField");

  const cmdKey = document.getElementById("cmdKey");
  const cKey = document.getElementById("cKey");
  const vKey = document.getElementById("vKey");

  const progressCountEl = document.getElementById("progressCount");
  const progressTotalEl = document.getElementById("progressTotal");
  const progressFill = document.getElementById("progressFill");
  const levelText = document.getElementById("levelText");

  const winModal = document.getElementById("winModal");
  const closeModal = document.getElementById("closeModal");
  const restartButton = document.getElementById("restartButton");
  const winImage = document.getElementById("winImage");

  const TOTAL_ROUNDS = 10;
  progressTotalEl.textContent = String(TOTAL_ROUNDS);

  let started = false;
  let round = 0;
  let level = 1;
  let statusTimer = null;

  let targetText = "";
  let lastAction = { copied: false, pasted: false, usedCmd: false };

  // Victory SVG
  winImage.innerHTML = `
    <svg width="92%" height="92%" viewBox="0 0 800 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="You Win">
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0" stop-color="#4CAF50"/>
          <stop offset="1" stop-color="#3498db"/>
        </linearGradient>
      </defs>
      <rect x="40" y="40" width="720" height="240" rx="28" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)"/>
      <circle cx="160" cy="160" r="74" fill="url(#g)"/>
      <path d="M130 165l20 22 44-54" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="280" y="150" fill="#fff" font-size="44" font-weight="900" font-family="Segoe UI, Arial">MAC PRO!</text>
      <text x="280" y="200" fill="rgba(255,255,255,0.85)" font-size="22" font-weight="700" font-family="Segoe UI, Arial">
        Copy & Paste levelled up
      </text>
    </svg>
  `;

  function randInt(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

  function normalize(s) {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  function setProgressUI() {
    progressCountEl.textContent = String(round);
    level = 1 + Math.floor(round / 3);
    levelText.textContent = String(level);

    const pct = (round / TOTAL_ROUNDS) * 100;
    progressFill.style.width = `${pct}%`;

    const bar = document.querySelector(".progress-bar");
    if (bar) bar.setAttribute("aria-valuenow", String(round));
  }

  function showStatus(text, type = "neutral", ms = 2500) {
    if (statusTimer) clearTimeout(statusTimer);

    statusLine.style.display = "block";
    statusLine.classList.remove("ok", "bad");
    if (type === "ok") statusLine.classList.add("ok");
    if (type === "bad") statusLine.classList.add("bad");
    statusLine.textContent = text;

    statusTimer = setTimeout(() => {
      statusLine.classList.remove("ok", "bad");
      statusLine.textContent = "Copy and paste the text:";
    }, ms);
  }

  function openModal() {
    winModal.style.display = "flex";
    winModal.setAttribute("aria-hidden", "false");
  }

  function closeModalFn() {
    winModal.style.display = "none";
    winModal.setAttribute("aria-hidden", "true");
  }

  function resetKeysState() {
    cmdKey.classList.remove("pressed");
    cKey.classList.remove("pressed");
    vKey.classList.remove("pressed");
  }

  function resetAll() {
    started = false;
    round = 0;
    level = 1;
    targetText = "";
    lastAction = { copied: false, pasted: false, usedCmd: false };

    setProgressUI();

    startButton.style.display = "inline-block";
    statusLine.style.display = "none";
    gameContainer.style.display = "none";

    randomTextEl.classList.remove("good", "bad");
    randomTextEl.textContent = "";
    inputField.textContent = "";

    resetKeysState();
    closeModalFn();

    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = null;

    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
  }

  function makeToken(len) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789^%$&@!?#";
    let out = "";
    for (let i = 0; i < len; i++) out += chars[randInt(0, chars.length - 1)];
    return out;
  }

  // Text: as in the example, spaces between tokens are required,
  // and varying lengths, but must FIT within the block (by height).
  function generateTargetTextFit() {
    const maxAttempts = 50;

    const tokensMin = 3;
    const tokensMax = Math.min(10, 6 + Math.floor(round / 2));
    const tokenLenMin = 5;
    const tokenLenMax = Math.min(20, 12 + Math.floor(round / 2));

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const tokensCount = randInt(tokensMin, tokensMax);
      const tokens = [];
      for (let t = 0; t < tokensCount; t++) tokens.push(makeToken(randInt(tokenLenMin, tokenLenMax)));

      const candidate = tokens.join(" ");
      randomTextEl.textContent = candidate;

      if (randomTextEl.scrollHeight <= randomTextEl.clientHeight + 2) {
        targetText = candidate;
        return;
      }
    }

    targetText = `${makeToken(10)} ${makeToken(8)} ${makeToken(7)} ${makeToken(6)}`;
    randomTextEl.textContent = targetText;
  }

  function newRound() {
    inputField.textContent = "";
    randomTextEl.classList.remove("good", "bad");
    lastAction = { copied: false, pasted: false, usedCmd: false };

    generateTargetTextFit();

    // REMOVE ANY SELECTION (as requested)
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();

    // focus on the field — let them paste
    setTimeout(() => inputField.focus(), 0);
  }

  function start() {
    started = true;
    startButton.style.display = "none";
    statusLine.style.display = "block";
    statusLine.textContent = "Copy and paste the text:";
    gameContainer.style.display = "grid";
    setProgressUI();
    newRound();
  }

  function checkAnswer() {
    if (!started) return;

    const entered = normalize(inputField.textContent);
    if (!entered) return;

    const target = normalize(targetText);

    if (entered === target) {
      round += 1;
      setProgressUI();

      randomTextEl.classList.add("good");
      randomTextEl.classList.remove("bad");
      showStatus("CORRECT ✅", "ok", 2500);

      if (round >= TOTAL_ROUNDS) {
        openModal();
        return;
      }

      setTimeout(() => newRound(), 450);
    } else {
      randomTextEl.classList.add("bad");
      randomTextEl.classList.remove("good");
      showStatus("INCORRECT ❌", "bad", 2500);

      setTimeout(() => {
        inputField.textContent = "";
        inputField.focus();
      }, 350);
    }
  }

  // Key highlighting (Mac): Meta = ⌘
  document.addEventListener("keydown", (event) => {
    const k = event.key.toLowerCase();

    if (k === "meta") cmdKey.classList.add("pressed");
    if (k === "c") cKey.classList.add("pressed");
    if (k === "v") vKey.classList.add("pressed");

    // Recording that ⌘ was used
    if (event.metaKey) lastAction.usedCmd = true;
  });

  document.addEventListener("keyup", (event) => {
    const k = event.key.toLowerCase();

    if (k === "meta") cmdKey.classList.remove("pressed");
    if (k === "c") cKey.classList.remove("pressed");
    if (k === "v") vKey.classList.remove("pressed");
  });

  window.addEventListener("blur", resetKeysState);

  // Counting copy/paste (optional, but useful for fairness)
  document.addEventListener("copy", () => { lastAction.copied = true; });
  inputField.addEventListener("paste", () => { lastAction.pasted = true; });

  //Checking the answer via input
  inputField.addEventListener("input", checkAnswer);

  // buttons
  startButton.addEventListener("click", start);
  resetBtn.addEventListener("click", resetAll);

  closeModal.addEventListener("click", closeModalFn);
  winModal.addEventListener("click", (e) => { if (e.target === winModal) closeModalFn(); });
  restartButton.addEventListener("click", resetAll);

  resetAll();
});
