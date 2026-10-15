/* ==========================================================================
   LuoguDark — content.js
   Content Script: Immediate theme injection, keyboard shortcuts,
   CodeMirror 6 token enforcer, cross-tab sync receiver
   ========================================================================== */

(function () {
  "use strict";

  // ── Constants ────────────────────────────────────────────────────────────
  const HTML = document.documentElement;
  const ACTIVE_CLASS = "luogudark-active";
  const STYLE_ID = "luogudark-code-style";
  const STORAGE_DEFAULTS = { enabled: true, brightness: 100 };

  // VS Code Dark 2026 Token Color Map (Koppa-class → color)
  const TOKEN_COLORS = {
    ͼg: "#dcdcaa", // Functions — VS Code Yellow
    ͼb: "#9cdcfe", // Variables — Light Cyan
    ͼi: "#569cd6", // Keywords — VS Code Blue
    ͼh: "#4ec9b0", // Types — Mint Teal
    ͼd: "#ce9178", // Strings — Terracotta
    ͼe: "#b5cea8", // Numbers — Sage Green
    ͼf: "#c586c0", // Preprocessor — Purple
    ͼc: "#6a9955", // Comments — Emerald Green
  };

  // ── 1. Immediate Theme Application & Brightness Overlay ─────────────────
  let currentState = { enabled: true, brightness: 100 };
  const OVERLAY_ID = "luogudark-brightness-overlay";

  function updateBrightnessOverlay(brightness, enabled) {
    let overlay = document.getElementById(OVERLAY_ID);

    if (!enabled) {
      if (overlay) overlay.style.opacity = "0";
      return;
    }

    if (!overlay && (document.body || document.documentElement)) {
      overlay = document.createElement("div");
      overlay.id = OVERLAY_ID;
      overlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        pointer-events: none !important;
        z-index: 2147483647 !important;
        background-color: #000000 !important;
        opacity: 0;
        transition: opacity 0.1s linear !important;
      `;
      (document.body || document.documentElement).appendChild(overlay);
    }

    if (overlay) {
      let b = brightness ?? 100;
      if (b < 50) b = 50;
      if (b > 100) b = 100;

      const opacity = (100 - b) / 100;
      overlay.style.opacity = opacity.toFixed(2);
    }
  }

  function applyTheme(state) {
    if (state) {
      currentState = { ...currentState, ...state };
    }

    if (currentState.enabled) {
      HTML.classList.add(ACTIVE_CLASS);
    } else {
      HTML.classList.remove(ACTIVE_CLASS);
    }

    updateBrightnessOverlay(currentState.brightness, currentState.enabled);
  }

  // Read stored state immediately at document_start
  chrome.storage.sync.get(STORAGE_DEFAULTS, (state) => {
    applyTheme(state);
  });

  // ── 2. Dynamic Priority <style> Injection ───────────────────────────────
  function injectCodeStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* CodeMirror 6 Koppa Token Overrides — VS Code Dark 2026 */
      html.${ACTIVE_CLASS} .cm-editor,
      html.${ACTIVE_CLASS} .cm-editor .cm-scroller,
      html.${ACTIVE_CLASS} .cm-editor .cm-content {
        background-color: #121214 !important;
        color: #d4d4d4 !important;
        caret-color: #aeafad !important;
      }

      html.${ACTIVE_CLASS} .cm-editor .cm-gutters {
        background-color: #121214 !important;
        color: #858585 !important;
        border-right: 1px solid #27272a !important;
      }

      html.${ACTIVE_CLASS} .cm-editor .cm-activeLineGutter,
      html.${ACTIVE_CLASS} .cm-editor .cm-activeLine {
        background-color: rgba(255, 255, 255, 0.04) !important;
      }

      html.${ACTIVE_CLASS} .cm-editor .cm-selectionBackground,
      html.${ACTIVE_CLASS} .cm-editor ::selection {
        background-color: rgba(82, 196, 26, 0.18) !important;
      }

      html.${ACTIVE_CLASS} .cm-editor .cm-matchingBracket {
        background-color: rgba(82, 196, 26, 0.25) !important;
        color: #ffffff !important;
        outline: 1px solid rgba(82, 196, 26, 0.4);
      }

      html.${ACTIVE_CLASS} .cm-editor .cm-cursor,
      html.${ACTIVE_CLASS} .cm-editor .cm-cursor-primary {
        border-left-color: #aeafad !important;
      }

      /* Token colors via CSS (high specificity) */
      html.${ACTIVE_CLASS} .cm-editor span.ͼg,
      html.${ACTIVE_CLASS} .cm-content span.ͼg { color: #dcdcaa !important; }

      html.${ACTIVE_CLASS} .cm-editor span.ͼb,
      html.${ACTIVE_CLASS} .cm-content span.ͼb { color: #9cdcfe !important; }

      html.${ACTIVE_CLASS} .cm-editor span.ͼi,
      html.${ACTIVE_CLASS} .cm-content span.ͼi { color: #569cd6 !important; }

      html.${ACTIVE_CLASS} .cm-editor span.ͼh,
      html.${ACTIVE_CLASS} .cm-content span.ͼh { color: #4ec9b0 !important; }

      html.${ACTIVE_CLASS} .cm-editor span.ͼd,
      html.${ACTIVE_CLASS} .cm-content span.ͼd { color: #ce9178 !important; }

      html.${ACTIVE_CLASS} .cm-editor span.ͼe,
      html.${ACTIVE_CLASS} .cm-content span.ͼe { color: #b5cea8 !important; }

      html.${ACTIVE_CLASS} .cm-editor span.ͼf,
      html.${ACTIVE_CLASS} .cm-content span.ͼf { color: #c586c0 !important; }

      html.${ACTIVE_CLASS} .cm-editor span.ͼc,
      html.${ACTIVE_CLASS} .cm-content span.ͼc { color: #6a9955 !important; }

      /* Operators & Punctuation */
      html.${ACTIVE_CLASS} .cm-editor span.ͼj,
      html.${ACTIVE_CLASS} .cm-editor span.ͼk,
      html.${ACTIVE_CLASS} .cm-editor span.ͼl,
      html.${ACTIVE_CLASS} .cm-editor span.ͼm,
      html.${ACTIVE_CLASS} .cm-editor span.ͼn,
      html.${ACTIVE_CLASS} .cm-content span.ͼj,
      html.${ACTIVE_CLASS} .cm-content span.ͼk,
      html.${ACTIVE_CLASS} .cm-content span.ͼl,
      html.${ACTIVE_CLASS} .cm-content span.ͼm,
      html.${ACTIVE_CLASS} .cm-content span.ͼn { color: #eff1f6 !important; }
    `;

    // Insert as early as possible
    const target = document.head || document.documentElement;
    target.appendChild(style);
  }

  // ── 3. CodeMirror 6 JS Inline Style Enforcer ───────────────────────────
  function styleCodeMirror6Tokens() {
    if (!HTML.classList.contains(ACTIVE_CLASS)) return;

    const spans = document.querySelectorAll(
      ".cm-line span, .cm-content span, .cm-editor span"
    );

    for (const el of spans) {
      const classList = el.classList;
      for (const cls of classList) {
        if (TOKEN_COLORS[cls]) {
          el.style.setProperty("color", TOKEN_COLORS[cls], "important");
          break;
        }
      }
    }
  }

  // ── 4. Keyboard Shortcut Handler (Ctrl+I / Cmd+I) ──────────────────────
  function handleKeydown(e) {
    const isMod = e.ctrlKey || e.metaKey;
    // Allow Ctrl+Shift+I / Cmd+Shift+I / Alt combinations to pass through to Chrome DevTools / Inspect
    if (!isMod || e.shiftKey || e.altKey || e.key.toLowerCase() !== "i") return;

    // Don't intercept inside editable elements
    const active = document.activeElement;
    if (active) {
      const tag = active.tagName.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        active.isContentEditable ||
        active.classList.contains("cm-content")
      ) {
        return;
      }
    }

    e.preventDefault();
    e.stopPropagation();

    // Toggle storage state
    chrome.storage.sync.get(STORAGE_DEFAULTS, (state) => {
      chrome.storage.sync.set({ enabled: !state.enabled });
    });
  }

  // ── 5. Tab Focus & Visibility Listener ──────────────────────────────────
  function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      chrome.storage.sync.get(STORAGE_DEFAULTS, (state) => {
        applyTheme(state);
      });
    }
  }

  // ── 6. Message Listener (from background.js / popup broadcast) ─────────
  function handleMessage(message) {
    if (message.type === "LUOGUDARK_STATE_UPDATE" && message.state) {
      applyTheme(message.state);
    }
  }

  // ── 7. Storage Change Listener ─────────────────────────────────────────
  function handleStorageChange(changes, areaName) {
    if (areaName !== "sync") return;
    const newState = {};
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (newValue !== undefined) {
        newState[key] = newValue;
      }
    }
    applyTheme(newState);
  }

  // ── 9. Liquid Edge-Gesture IDE Toggle ───────────────────────────────────
  // State machine: detects right-edge cursor hold → charges → triggers
  // liquid circle transition → toggles #ide hash on problem pages.
  // Only active on /problem/ URLs.

  const LiquidEdge = (() => {
    // ── Configuration ──
    const EDGE_THRESHOLD = 15;       // px from right edge to trigger
    const OPEN_HOLD_MS = 750;        // hold duration to open IDE
    const CLOSE_HOLD_MS = 1500;      // hold duration to close IDE
    const PROBLEM_PATH_RE = /^\/problem\/[A-Za-z0-9]+/;

    // ── Internal State ──
    let chargeTimer = null;
    let chargeStartTime = 0;
    let chargeRafId = null;
    let isCharging = false;
    let gooeyWrapEl = null;
    let anchorBlobEl = null;
    let actionBallEl = null;
    let svgFilterEl = null;

    // ── Helpers ──
    function isProblemPage() {
      return PROBLEM_PATH_RE.test(window.location.pathname);
    }

    function isIDEOpen() {
      return window.location.hash.includes("ide");
    }

    function getHoldDuration() {
      return isIDEOpen() ? CLOSE_HOLD_MS : OPEN_HOLD_MS;
    }

    function getActionColor() {
      return isIDEOpen() ? "#e74c3c" : "#3498db";
    }

    // ── DOM Element Creation (lazy, re-append if lost) ──
    function ensureElements() {
      // SVG filter (injected once)
      if (!svgFilterEl || !document.body.contains(svgFilterEl)) {
        if (svgFilterEl) svgFilterEl.remove();
        svgFilterEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgFilterEl.setAttribute("style", "position:absolute;width:0;height:0;pointer-events:none");
        svgFilterEl.innerHTML = `
          <defs>
            <filter id="luogudark-gooey">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/>
              <feColorMatrix in="blur" mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9"
                result="goo"/>
              <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
            </filter>
          </defs>`;
        document.body.appendChild(svgFilterEl);
      }

      // Gooey wrapper (contains anchor + ball)
      if (!gooeyWrapEl || !document.body.contains(gooeyWrapEl)) {
        if (gooeyWrapEl) gooeyWrapEl.remove();

        gooeyWrapEl = document.createElement("div");
        gooeyWrapEl.className = "luogudark-gooey-wrap";

        anchorBlobEl = document.createElement("div");
        anchorBlobEl.className = "luogudark-anchor-blob";

        actionBallEl = document.createElement("div");
        actionBallEl.className = "luogudark-action-ball";

        gooeyWrapEl.appendChild(anchorBlobEl);
        gooeyWrapEl.appendChild(actionBallEl);
        document.body.appendChild(gooeyWrapEl);
      }
    }

    // ── Charging Animation Loop ──
    function updateChargeProgress() {
      if (!isCharging) return;

      const elapsed = Date.now() - chargeStartTime;
      const duration = getHoldDuration();
      const progress = Math.min(elapsed / duration, 1);

      // Scale from 0.6 → 2.2 — dramatic growth as liquid drop swells
      const ballScale = 0.6 + (progress * 1.6);
      actionBallEl.style.transform = `scale(${ballScale})`;

      // Anchor blob also swells slightly (1.0 → 1.5) to feed the liquid bridge
      const anchorScale = 1.0 + (progress * 0.5);
      anchorBlobEl.style.transform = `translateY(-50%) scale(${anchorScale})`;

      // Move the ball further left as it grows (peeling away from edge)
      const pullIn = progress * 30; // px to slide inward
      actionBallEl.style.right = `${12 + pullIn}px`;

      if (progress < 1) {
        chargeRafId = requestAnimationFrame(updateChargeProgress);
      }
    }

    // ── Start Charging ──
    function startCharge() {
      if (isCharging) return;

      ensureElements();
      isCharging = true;
      chargeStartTime = Date.now();

      const color = getActionColor();
      actionBallEl.style.setProperty("--action-color", color);
      actionBallEl.style.background = color;
      anchorBlobEl.style.background = color;

      actionBallEl.classList.remove("pop");
      actionBallEl.classList.add("charging");

      // Start progress animation
      chargeRafId = requestAnimationFrame(updateChargeProgress);

      // Hold timer → trigger transition on completion
      chargeTimer = setTimeout(() => {
        completeCharge();
      }, getHoldDuration());
    }

    // ── Cancel Charging ──
    function cancelCharge() {
      if (!isCharging) return;

      isCharging = false;
      clearTimeout(chargeTimer);
      chargeTimer = null;

      if (chargeRafId) {
        cancelAnimationFrame(chargeRafId);
        chargeRafId = null;
      }

      if (actionBallEl) {
        actionBallEl.classList.remove("charging");
        actionBallEl.classList.remove("visible");
        actionBallEl.classList.remove("pop");
        actionBallEl.style.transform = "scale(0)";
        actionBallEl.style.right = "10px";
      }
      if (gooeyWrapEl) {
        gooeyWrapEl.classList.remove("active");
      }
    }

    // ── Charge Complete → Pop + Trigger ──
    function completeCharge() {
      isCharging = false;

      if (chargeRafId) {
        cancelAnimationFrame(chargeRafId);
        chargeRafId = null;
      }

      // Play the pop animation
      actionBallEl.classList.remove("charging");
      actionBallEl.classList.add("pop");

      // After pop animation ends, hide everything and trigger action
      setTimeout(() => {
        actionBallEl.classList.remove("pop");
        actionBallEl.classList.remove("visible");
        actionBallEl.style.transform = "scale(0)";
        actionBallEl.style.right = "10px";
        gooeyWrapEl.classList.remove("active");

        if (!isIDEOpen()) {
          window.location.hash = "ide";
        } else {
          let clicked = false;
          const elements = document.querySelectorAll('a[href*="javascript:void"]');
          for (const el of elements) {
            if (el.textContent && el.textContent.includes("退出 IDE 模式")) {
              el.click();
              clicked = true;
              break;
            }
          }
          if (!clicked) {
            window.location.hash = "";
          }
        }
      }, 400);
    }

    // ── Mouse Move Handler ──
    function onMouseMove(e) {
      if (!isProblemPage()) {
        cancelCharge();
        return;
      }

      const edgeBoundary = document.documentElement.clientWidth - EDGE_THRESHOLD;

      if (e.clientX >= edgeBoundary && e.clientY >= window.innerHeight / 2) {
        // Cursor is in the bottom-half edge zone
        ensureElements();

        // Position the wrapper at cursor Y
        gooeyWrapEl.style.top = `${e.clientY - 70}px`; // center the 140px wrapper on cursor

        if (!isCharging) {
          const color = getActionColor();
          actionBallEl.style.setProperty("--action-color", color);
          actionBallEl.style.background = color;
          anchorBlobEl.style.background = color;
          actionBallEl.classList.add("visible");
          gooeyWrapEl.classList.add("active");
        }

        if (!isCharging) {
          startCharge();
        }
      } else {
        cancelCharge();
      }
    }

    // ── Public Init ──
    function init() {
      window.addEventListener("mousemove", onMouseMove, { passive: true });

      window.addEventListener("resize", () => {
        if (isCharging) cancelCharge();
      }, { passive: true });
    }

    return { init };
  })();

  // ── 8. Initialization ─────────────────────────────────────────────────
  // Attach listeners immediately (document_start)
  window.addEventListener("keydown", handleKeydown, true);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("focus", () => {
    chrome.storage.sync.get(STORAGE_DEFAULTS, applyTheme);
  });
  chrome.runtime.onMessage.addListener(handleMessage);
  chrome.storage.onChanged.addListener(handleStorageChange);

  // Wait for DOM ready to inject style element & start token enforcer
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }

  function onReady() {
    injectCodeStyle();

    // CodeMirror 6 Token Enforcer: MutationObserver + interval
    styleCodeMirror6Tokens();

    const observer = new MutationObserver((mutations) => {
      let shouldRestyle = false;
      for (const mut of mutations) {
        if (mut.addedNodes.length > 0 || mut.type === "attributes") {
          shouldRestyle = true;
          break;
        }
      }
      if (shouldRestyle) {
        styleCodeMirror6Tokens();
      }
    });

    observer.observe(HTML, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    // Periodic fallback (250ms) for dynamically injected tokens
    setInterval(styleCodeMirror6Tokens, 250);

    // Initialize Liquid Edge-Gesture IDE Toggle
    LiquidEdge.init();
  }
})();
