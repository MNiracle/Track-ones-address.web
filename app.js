document.addEventListener("DOMContentLoaded", () => {
  const screens = {
    loading: document.getElementById("loading-screen"),
    hack: document.getElementById("hack-screen"),
    reveal: document.getElementById("reveal-screen"),
  };

  const loadingFill =
    document.querySelector(".loading-fill") ||
    document.querySelector('[class-="loading-fill"]');
  const hackFill = document.getElementById("hack-progress");
  const progressText = document.getElementById("progress-text");

  function show(screen) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    if (screen) screen.classList.add("active");
  }

  function loadingPhase() {
    show(screens.loading);
    let progress = 0;
    const timer = setInterval(() => {
      progress += 10;
      if (loadingFill) loadingFill.style.width = progress + "%";
      if (progressText) progressText.textContent = progress + "%";
      if (progress >= 100) {
        clearInterval(timer);
        setTimeout(hackPhase, 500);
      }
    }, 300);
  }

  function hackPhase() {
    show(screens.hack);
    let progress = 0;
    const timer = setInterval(() => {
      progress += Math.floor(Math.random() * 8) + 4;
      if (hackFill) hackFill.style.width = progress + "%";
      if (progressText) progressText.textContent = progress + "%";
      if (progress >= 100) {
        clearInterval(timer);
        setTimeout(revealPhase, 800);
      }
    }, 300);
  }

  function revealPhase() {
    show(screens.reveal);
  }

  // Handle buttons safely (even if HTML typos exist)
  const cancelBtn = document.querySelector(".fake.button");
  if (cancelBtn) cancelBtn.addEventListener("click", () => alert("Too late to cancel 😈"));

  const revealBtn = document.querySelector(".reveal-button");
  if (revealBtn) revealBtn.addEventListener("click", () => location.reload());

  loadingPhase();
});
