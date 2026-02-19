document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("startButton");
  const resetBtn = document.getElementById("resetBtn");

  const statusLine = document.getElementById("statusLine");
  const textFrame = document.getElementById("selectableTextContainer");
  const selectableText = document.getElementById("selectableText");

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

  // Victory image (inline SVG)
  winImage.innerHTML = `
    <svg width="92%" height="92%" viewBox="0 0 800 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="You Win">
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0" stop-color="#4CAF50"/>
          <stop offset="1" stop-color="#3498db"/>
        </linearGradient>
        <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <rect x="40" y="40" width="720" height="240" rx="28" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)"/>
      <g filter="url(#s)">
        <circle cx="160" cy="160" r="74" fill="url(#g)"/>
        <path d="M130 165l20 22 44-54" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
      <text x="280" y="150" fill="#fff" font-size="44" font-weight="900" font-family="Segoe UI, Arial">VERIFIED!</text>
      <text x="280" y="200" fill="rgba(255,255,255,0.85)" font-size="22" font-weight="700" font-family="Segoe UI, Arial">
        Selection skill levelled up
      </text>
    </svg>
  `;

  function normalize(s) {
    return s.replace(/\s+/g, " ").trim();
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
      statusLine.textContent = "Select all the text inside the box:";
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

  function resetAll() {
    started = false;
    round = 0;
    level = 1;
    targetText = "";

    setProgressUI();

    startButton.style.display = "inline-block";
    statusLine.style.display = "none";
    textFrame.style.display = "none";

    textFrame.classList.remove("good", "bad");
    selectableText.textContent = "";
    closeModalFn();

    window.getSelection()?.removeAllRanges();
    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = null;
  }

  // ====== GENERATION: different strings of varying lengths, but they must fit ======
  function randInt(a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
  }

  function makeToken(len) {
    // no spaces within a token, but special characters are allowed
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789^%$&@!?#";
    let out = "";
    for (let i = 0; i < len; i++) out += chars[randInt(0, chars.length - 1)];
    return out;
  }

  function generateTargetTextFit() {
    // Goal: 1–2 lines in the field (approximately), spaces between tokens are required
    // Trying several times until it fits by height.
    const maxAttempts = 40;

    // Length parameters (these can be tweaked)
    const tokensMin = 3;
    const tokensMax = 8;
    const tokenLenMin = 5;
    const tokenLenMax = 14;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const tokensCount = randInt(tokensMin, tokensMax);

      const tokens = [];
      for (let t = 0; t < tokensCount; t++) {
        tokens.push(makeToken(randInt(tokenLenMin, tokenLenMax)));
      }

      const candidate = tokens.join(" ");
      selectableText.textContent = candidate;

      // Check whether it overflows by height (important after rendering)
      // clientHeight — visible height, scrollHeight — required content height
      if (selectableText.scrollHeight <= selectableText.clientHeight + 2) {
        targetText = candidate;
        return;
      }
    }

    // If it didn't fit — fall back to a guaranteed short variant
    targetText = `${makeToken(10)} ${makeToken(8)} ${makeToken(7)} ${makeToken(6)}`;
    selectableText.textContent = targetText;
  }

  function start() {
    started = true;
    startButton.style.display = "none";
    textFrame.style.display = "block";

    statusLine.style.display = "block";
    statusLine.classList.remove("ok", "bad");
    statusLine.textContent = "Select all the text inside the box:";

    // IMPORTANT: to make things fit, the text area height must be constrained.
    // If your CSS has no fixed height — add one (see note below).
    generateTargetTextFit();

    setProgressUI();
    window.getSelection()?.removeAllRanges();
  }

  function getSelectedTextSafe() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return "";

    const selected = sel.toString().trim();
    if (!selected) return "";

    const range = sel.getRangeAt(0);
    const common = range.commonAncestorContainer;
    const node = common.nodeType === 1 ? common : common.parentElement;
    if (!node || !textFrame.contains(node)) return "";

    return selected;
  }

  function checkSelection() {
    if (!started) return;

    const selectedText = normalize(getSelectedTextSafe());
    if (!selectedText) {
      textFrame.classList.remove("good", "bad");
      return;
    }

    const targetNorm = normalize(targetText);

    if (selectedText === targetNorm) {
      round += 1;
      setProgressUI();

      textFrame.classList.add("good");
      textFrame.classList.remove("bad");

      showStatus("CORRECT ✅", "ok", 2500);
      window.getSelection()?.removeAllRanges();

      if (round >= TOTAL_ROUNDS) {
        openModal();
      } else {
        // new text each time
        generateTargetTextFit();
      }
    } else {
      textFrame.classList.add("bad");
      textFrame.classList.remove("good");
      showStatus("INCORRECT ❌", "bad", 2500);
    }
  }

  startButton.addEventListener("click", start);
  resetBtn.addEventListener("click", resetAll);

  document.addEventListener("mouseup", () => checkSelection());

  document.addEventListener("keyup", (e) => {
    if (!started) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
      setTimeout(checkSelection, 0);
    }
  });

  closeModal.addEventListener("click", closeModalFn);
  winModal.addEventListener("click", (e) => {
    if (e.target === winModal) closeModalFn();
  });

  restartButton.addEventListener("click", resetAll);

  // init
  resetAll();
});
