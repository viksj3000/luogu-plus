/* ==========================================================================
   LuoguDark — popup.js
   Popup Logic: Storage sync, toggle, sliders, reset, cross-tab updates
   ========================================================================== */

(function () {
  "use strict";

  const DEFAULTS = { enabled: true, brightness: 100 };

  // ── DOM Elements ──────────────────────────────────────────────────────
  const themeToggle = document.getElementById("theme-toggle");
  const brightnessSlider = document.getElementById("brightness-slider");
  const brightnessVal = document.getElementById("brightness-val");
  const resetBtn = document.getElementById("reset-btn");

  // ── Initialize: Read Current State ────────────────────────────────────
  chrome.storage.sync.get(DEFAULTS, (state) => {
    applyState(state);
  });

  // ── Apply State to UI ─────────────────────────────────────────────────
  function applyState(state) {
    themeToggle.checked = state.enabled;
    brightnessSlider.value = state.brightness;
    brightnessVal.textContent = state.brightness + "%";

    // Visual feedback: dim controls when disabled
    const body = document.querySelector(".popup-body");
    if (body) {
      body.style.opacity = state.enabled ? "1" : "0.5";
    }
  }

  function notifyActiveTabs(stateUpdate) {
    chrome.tabs.query({ url: "*://*.luogu.com.cn/*" }, (tabs) => {
      if (!tabs) return;
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, {
          type: "LUOGUDARK_STATE_UPDATE",
          state: stateUpdate,
        }).catch(() => {});
      }
    });
  }

  // ── Toggle Handler ────────────────────────────────────────────────────
  themeToggle.addEventListener("change", () => {
    const enabled = themeToggle.checked;
    notifyActiveTabs({ enabled });
    chrome.storage.sync.set({ enabled });
  });

  // ── Brightness Slider Handler ─────────────────────────────────────────
  brightnessSlider.addEventListener("input", () => {
    const val = parseInt(brightnessSlider.value, 10);
    brightnessVal.textContent = val + "%";
    notifyActiveTabs({ brightness: val });
    chrome.storage.sync.set({ brightness: val });
  });

  // ── Reset Handler ─────────────────────────────────────────────────────
  resetBtn.addEventListener("click", () => {
    chrome.storage.sync.set(DEFAULTS, () => {
      applyState(DEFAULTS);
    });

    // Quick visual feedback
    resetBtn.style.color = "#A78BFA";
    resetBtn.style.borderColor = "rgba(108, 92, 231, 0.4)";
    setTimeout(() => {
      resetBtn.style.color = "";
      resetBtn.style.borderColor = "";
    }, 600);
  });

  // ── Storage Change Listener (sync with Ctrl+I from content script) ───
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") return;
    chrome.storage.sync.get(DEFAULTS, (state) => {
      applyState(state);
    });
  });
})();
