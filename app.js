// app.js — realistic "System Override" prank with local sound pack integration
document.addEventListener("DOMContentLoaded", () => {
  // ---------- CONFIG: adjust path if needed ----------
  const SFX_PATH = 'static/sounds/'; // change to '/static/sounds/' or './static/sounds/' as your setup requires

  // ---------- Sound pack loader + fallback ----------
  const SFX = {
    beepShort: safeAudio(`${SFX_PATH}beep_short.wav`),
    beepLong:  safeAudio(`${SFX_PATH}beep_long.wav`),
    click:     safeAudio(`${SFX_PATH}click.wav`),
  };

  function safeAudio(src) {
    try {
      const a = new Audio(src);
      a.preload = 'auto';
      return a;
    } catch (e) {
      return null;
    }
  }

  // Try to play via <audio>, fallback to WebAudio beep if blocked/missing
  function playSfxAudio(audioObj) {
    if (!audioObj) return wfallbackBeep();
    try {
      const clone = audioObj.cloneNode();
      clone.play().catch(() => wfallbackBeep());
    } catch (e) {
      try { audioObj.currentTime = 0; audioObj.play().catch(()=>wfallbackBeep()); } catch(_) { wfallbackBeep(); }
    }
  }

  function wfallbackBeep(freq = 900, dur = 0.06, vol = 0.03, type = 'sine') {
    try {
      const ctx = wfallbackBeep.ctx || (wfallbackBeep.ctx = new (window.AudioContext || window.webkitAudioContext)());
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      setTimeout(()=>{ try { o.stop(); } catch(_) {} }, dur*1000 + 10);
    } catch (e) { /* ignore */ }
  }

  function playSfx(name) {
    const map = {
      'beepShort': () => playSfxAudio(SFX.beepShort),
      'beepLong':  () => playSfxAudio(SFX.beepLong),
      'click':     () => playSfxAudio(SFX.click),
    };
    try {
      (map[name] || wfallbackBeep)();
    } catch (e) { wfallbackBeep(); }
  }

  // Unlock audio on first user gesture (many browsers require this)
  function unlockAudioOnGesture() {
    function handler() {
      try { playSfx('click'); } catch (_) {}
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    }
    document.addEventListener('click', handler);
    document.addEventListener('touchstart', handler);
  }
  unlockAudioOnGesture();

  // ---------- Defensive DOM helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const getById = (id) => document.getElementById(id);

  const screens = {
    loading: getById("loading-screen"),
    hack: getById("hack-screen"),
    reveal: getById("reveal-screen"),
  };

  const loadingFill = document.querySelector(".loading-fill") || document.querySelector('[class-="loading-fill"]');
  const hackFill = getById("hack-progress") || document.querySelector(".progress-fill");
  const progressText = getById("progress-text");

  // Ensure terminal log exists
  let terminalLog = screens.hack ? screens.hack.querySelector(".terminal-log") : null;
  if (screens.hack && !terminalLog) {
    const terminal = screens.hack.querySelector(".terminal") || screens.hack;
    terminalLog = document.createElement("div");
    terminalLog.className = "terminal-log";
    terminalLog.style.cssText = "font-family:monospace;font-size:12px;color:#aee;border-radius:6px;padding:10px;margin-top:10px;max-height:220px;overflow:auto;background:rgba(0,0,0,0.32)";
    terminal.appendChild(terminalLog);
  }

  // ---------- Small UX helpers ----------
  function showScreen(el) {
    $$(".screen").forEach(s => s.classList.remove("active"));
    if (el) el.classList.add("active");
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(_) {}
  }

  function flickerOnce() {
    const body = document.body;
    body.style.transition = "background-color 25ms";
    body.style.backgroundColor = "#060608";
    setTimeout(()=> { body.style.backgroundColor = ""; }, 80);
  }

  // typing effect for terminal
  function typeTo(el, text, speed = 18) {
    return new Promise(resolve => {
      let i = 0;
      const step = () => {
        if (i <= text.length) {
          el.textContent = text.slice(0, i);
          i++;
          el.scrollIntoView({ behavior: "smooth", block: "end" });
          setTimeout(step, Math.max(6, speed + (Math.random() * 20 - 10)));
        } else resolve();
      };
      step();
    });
  }

  function pushLogLine(text, speed) {
    if (!terminalLog) return Promise.resolve();
    const line = document.createElement("div");
    line.className = "log-line";
    terminalLog.appendChild(line);
    const p = typeTo(line, text, speed).then(() => { terminalLog.scrollTop = terminalLog.scrollHeight; });
    return p;
  }

  // ---------- Random helpers for realism ----------
  function randChoice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function randHex(n){ return Array.from({length:n}).map(()=>Math.floor(Math.random()*16).toString(16)).join(''); }
  function rnd(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
  function randIP(){ return `${rnd(1,255)}.${rnd(1,255)}.${rnd(1,255)}.${rnd(1,255)}`; }

  // ---------- Warning messages (with emoji) ----------
  function randomizeWarnings() {
    const base = [
      { text: "SIM card cloned — account MFA bypassed", emoji: "📡" },
      { text: "Banking credentials exfiltrated", emoji: "💳" },
      { text: "Location tracking enabled", emoji: "📍" },
      { text: "Camera + microphone active", emoji: "🎥" },
      { text: "You have violated Cyber Law 606", emoji: "⚖️" },
      { text: "Transferring data to remote server", emoji: "📤" },
    ];
    const boxes = screens.hack ? screens.hack.querySelectorAll(".warning-box") : [];
    boxes.forEach((box, i) => {
      const choice = base[i % base.length];
      const el = box.querySelector(".warning-text") || box;
      el.textContent = `${choice.emoji}  ${choice.text}`;
      box.style.animationDelay = (i * 0.6) + "s";
    });
  }

  // ---------- Terminal sequences ----------
  const terminalSequences = [
    () => `Connecting to remote node [${randIP()}]...`,
    () => `SSH: authenticating... success`,
    () => `Enumerating apps: ${randChoice(["whatsapp","mtbank","sms","photosync","authenticator","payments"])}... done`,
    () => `Dumping credentials to /tmp/exfil_${randHex(6)}.log`,
    () => `Kernel exploit loaded: stage-${Math.floor(Math.random()*6)+1}`,
    () => `Opening raw socket... OK`,
    () => `Bypassing UAC... OK`,
    () => `Extracting saved passwords from keychain... ${Math.floor(Math.random()*99)+1}%`,
    () => `Encrypting exfil stream → borngreat-node.${randChoice(["me","dev","cloud"])}:443`,
    () => `Wiping traces... partial`,
    () => `Finalizing payload. ETA: ${Math.floor(Math.random()*12)+3}s`,
  ];

  // ---------- Cancel behavior ----------
  function fakeCancel() {
    if (!terminalLog) return alert("Abort failed: ADMIN override active.");
    pushLogLine("Attempting to abort sequence...").then(() => {
      playSfx('beepShort');
      return pushLogLine("ERROR: Permissions denied (0xA1FF3) — Administrator override active.");
    }).then(() => {
      flickerOnce();
    });
  }

  // ---------- Flow phases ----------
  function loadingPhase() {
    showScreen(screens.loading);
    let progress = 0;
    const loader = setInterval(() => {
      progress += Math.floor(Math.random()*14) + 6; // 6..19 per tick
      if (progress > 100) progress = 100;
      if (loadingFill) loadingFill.style.width = progress + "%";
      if (progressText) progressText.textContent = progress + "%";
      playSfx('beepShort'); // small tick
      if (progress >= 100) {
        clearInterval(loader);
        setTimeout(() => {
          playSfx('beepLong'); // transition sound
          flickerOnce();
          hackPhase();
        }, 600 + Math.random()*600);
      }
    }, 220 + Math.random()*120);
  }

  async function hackPhase() {
    showScreen(screens.hack);
    if (!terminalLog) return revealPhase();

    terminalLog.innerHTML = ""; // clear
    randomizeWarnings();

    // typed terminal lines
    const seqCount = 5 + Math.floor(Math.random()*6);
    for (let i = 0; i < seqCount; i++) {
      const item = randChoice(terminalSequences)();
      await pushLogLine(item, 12 + Math.random()*26);
      if (Math.random() > 0.6) { flickerOnce(); playSfx('beepShort'); }
      await delay(80 + Math.random()*300);
    }

    await pushLogLine("Initializing exfil stream...");
    await simulatedHackProgress();
  }

  function simulatedHackProgress() {
    return new Promise((resolve) => {
      let pct = 0;
      const step = () => {
        const inc = Math.floor(Math.random()*8) + 4; // 4..11
        pct = Math.min(100, pct + inc);
        if (hackFill) hackFill.style.width = pct + "%";
        if (progressText) progressText.textContent = pct + "%";

        // occasional short log updates
        if (Math.random() > 0.65 && terminalLog) {
          const short = randChoice([
            `Exfil: ${Math.floor(Math.random()*9000)}kb/s`,
            `Socket: CLOSED -> REOPEN`,
            `Chunk ${randHex(4)} sent`,
            `Auth token rotated`,
            `Stored passwords: ${Math.floor(Math.random()*32)} found`
          ]);
          pushLogLine(short, 8);
        }

        // stage beeps
        if (pct > 15 && pct < 25) playSfx('beepShort');
        if (pct > 45 && pct < 60) playSfx('beepShort');
        if (pct > 80 && pct < 95) playSfx('beepLong');

        if (pct >= 100) {
          pushLogLine("Exfil complete. Encrypting payload...");
          setTimeout(() => resolve(), 800 + Math.random()*900);
        } else {
          if (Math.random() > 0.7) flickerOnce();
          setTimeout(step, 220 + Math.random()*220);
        }
      };
      step();
    }).then(() => {
      return pushLogLine("Cleaning traces...").then(() => delay(350)).then(() => pushLogLine("Operation complete.")).then(() => delay(400));
    }).then(() => delay(700)).then(revealPhase);
  }

  function revealPhase() {
    showScreen(screens.reveal);
    playSfx('beepLong'); // final reveal sound
    const hname = screens.reveal ? screens.reveal.querySelector(".hacker-name") : null;
    if (hname) hname.textContent = hname.textContent || "king borngreat-optimus!";
  }

  function delay(ms){ return new Promise(res => setTimeout(res, ms)); }

  // ---------- Wiring buttons and inline onclicks ----------
  function fixInlineOnclicks() {
    Array.from(document.querySelectorAll("[onclick]")).forEach(el => {
      const code = (el.getAttribute("onclick") || "").toLowerCase();
      if (code.includes("location.reload") || code.includes("location,reload")) {
        el.removeAttribute('onclick');
        el.addEventListener('click', (e) => { e.preventDefault(); playSfx('click'); location.reload(); });
      } else if (code.includes("fakecancel")) {
        el.removeAttribute('onclick');
        el.addEventListener('click', (e) => { e.preventDefault(); playSfx('click'); fakeCancel(); });
      }
    });
  }

  function wireButtons() {
    fixInlineOnclicks();
    const cancelBtn = document.querySelector(".fake.button") || document.querySelector(".fake-button");
    if (cancelBtn) {
      try { cancelBtn.removeAttribute && cancelBtn.removeAttribute("onclick"); } catch(_) {}
      cancelBtn.addEventListener('click', (e) => { e.preventDefault(); playSfx('click'); fakeCancel(); });
    }
    const revealBtn = document.querySelector(".reveal-button");
    if (revealBtn) {
      try { revealBtn.removeAttribute && revealBtn.removeAttribute("onclick"); } catch(_) {}
      revealBtn.addEventListener('click', (e) => { e.preventDefault(); playSfx('click'); location.reload(); });
    }
    // generic click sound for other buttons
    document.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => { playSfx('click'); });
    });
  }

  // ---------- Start ----------
  wireButtons();
  // small start delay for realism
  delay(180).then(() => loadingPhase());
});
