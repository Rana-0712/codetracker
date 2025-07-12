console.log("background.js: starting up");

// Load config
try {
  importScripts("config.js");
  console.log("background.js: config loaded");
} catch (e) {
  console.error("background.js: config load failed:", e);
}

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  console.log("background.js: onInstalled event");

  chrome.storage.local.get(["savedProblemsByUser"], (result) => {
    if (!result.savedProblemsByUser) {
      chrome.storage.local.set({ savedProblemsByUser: {} }, () => {
        console.log("background.js: Initialized savedProblemsByUser = {}");
      });
    } else {
      console.log("background.js: savedProblemsByUser already exists");
    }
  });

  // Clear any old session data
  chrome.storage.local.remove(["clerk_session", "user_session"]);
  console.log("background.js: Cleared old session data on install");
});

// Listen to messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "isProblemPage") {
    console.log("background.js: Problem page detected:", request.isProblemPage);
  }
  return true;
});

// Sync function to send problems to web app
async function syncWithWebApp() {
  chrome.storage.local.get(
    ["savedProblemsByUser", "user_session"],
    async (result) => {
      const allSaved = result.savedProblemsByUser || {};
      const userSession = result.user_session;

      if (!userSession || !userSession.userId) {
        console.log("background.js: syncWithWebApp: no user session to sync");
        return;
      }

      const userId = userSession.userId;
      const savedForMe = allSaved[userId] || [];

      if (savedForMe.length === 0) {
        console.log("background.js: syncWithWebApp: no problems to sync for user", userId);
        return;
      }

      console.log(
        "background.js: syncWithWebApp: forwarding",
        savedForMe.length,
        "items for user", userId
      );

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/problems/bulk-sync`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${userSession.sessionToken}`,
            },
            body: JSON.stringify({ user_id: userId, problems: savedForMe }),
          }
        );
        if (!response.ok) {
          console.error("background.js: bulk-sync failed:", await response.text());
        } else {
          console.log("background.js: syncWithWebApp: successfully synced");
        }
      } catch (error) {
        console.error("background.js: syncWithWebApp error:", error);
      }
    }
  );
}