/* ==========================================================================
   LuoguDark — background.js
   Service Worker: Cross-tab sync, storage broadcasting, install defaults
   ========================================================================== */

// ── Default Settings ──────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  enabled: true,
  brightness: 100,
};

// ── Install Handler: Set Defaults ─────────────────────────────────────────
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.sync.set(DEFAULT_SETTINGS);
  }
});

// ── Storage Change Listener: Broadcast to All Luogu Tabs ─────────────────
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") return;

  // Build the updated state from changes
  const updatedState = {};
  for (const [key, { newValue }] of Object.entries(changes)) {
    updatedState[key] = newValue;
  }

  // Broadcast to all Luogu tabs
  broadcastToLuoguTabs({ type: "LUOGUDARK_STATE_UPDATE", state: updatedState });
});

// ── Tab Activation Sync ──────────────────────────────────────────────────
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && tab.url.includes("luogu.com.cn")) {
      const state = await chrome.storage.sync.get(DEFAULT_SETTINGS);
      safeSendMessage(activeInfo.tabId, {
        type: "LUOGUDARK_STATE_UPDATE",
        state,
      });
    }
  } catch (e) {
    // Tab may not exist or URL not accessible
  }
});

// ── Tab Updated Sync (page load / navigation) ────────────────────────────
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    tab.url.includes("luogu.com.cn")
  ) {
    try {
      const state = await chrome.storage.sync.get(DEFAULT_SETTINGS);
      safeSendMessage(tabId, { type: "LUOGUDARK_STATE_UPDATE", state });
    } catch (e) {
      // Content script may not be ready
    }
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────
async function broadcastToLuoguTabs(message) {
  try {
    const tabs = await chrome.tabs.query({ url: "*://*.luogu.com.cn/*" });
    for (const tab of tabs) {
      safeSendMessage(tab.id, message);
    }
  } catch (e) {
    // Query may fail if no permissions
  }
}

function safeSendMessage(tabId, message) {
  try {
    chrome.tabs.sendMessage(tabId, message).catch(() => {
      // Content script not yet injected — ignore
    });
  } catch (e) {
    // Synchronous errors
  }
}
