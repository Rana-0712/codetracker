console.log("background.js: starting up");

// ─── 1) Load Supabase and Config ─────────────────────────────────────
try {
  importScripts("vendor/supabase.js", "config.js"); // includes both scripts
  console.log("background.js: importScripts succeeded");
} catch (e) {
  console.error("background.js: importScripts failed:", e);
}

// 2) Verify Supabase is loaded
if (typeof supabase === "undefined") {
  console.error("background.js: ERROR—global 'supabase' is undefined after importScripts");
} else {
  console.log("background.js: global 'supabase' is present");
}

let createClient = null;
try {
  createClient = supabase.createClient;
  if (typeof createClient !== "function") {
    console.error("background.js: ERROR—supabase.createClient is not a function");
  } else {
    console.log("background.js: supabase.createClient() is available");
  }
} catch (e) {
  console.error("background.js: ERROR accessing supabase.createClient:", e);
}

let supabaseExt = null;

// ─── 3) Init Supabase Client ─────────────────────────────────────────
function initSupabaseClient() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
      ({ SUPABASE_URL, SUPABASE_ANON_KEY }) => {
        const url = SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL;
        const key = SUPABASE_ANON_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
          console.error("background.js: Missing Supabase keys (storage + config fallback failed)");
          resolve(null);
          return;
        }

        console.log("background.js: Using Supabase URL =", url);
        console.log("background.js: Using Supabase ANON_KEY =", key.slice(0, 8) + "…");

        try {
          supabaseExt = createClient(url, key);
          console.log("background.js: Successfully created supabaseExt client");
          resolve(supabaseExt);
        } catch (e) {
          console.error("background.js: Error creating supabase client:", e);
          resolve(null);
        }
      }
    );
  });
}

initSupabaseClient();

// ─── 4) OnInstalled Hook ─────────────────────────────────────────────
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

  chrome.storage.local.remove("supabase_session");
  console.log("background.js: Cleared supabase_session on install");
});

// ─── 5) Listen to Messages ───────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "isProblemPage") {
    console.log("background.js: Problem page detected:", request.isProblemPage);
  }
  return true;
});

// ─── 6) Session Validation ───────────────────────────────────────────
chrome.storage.local.get(["supabase_session"], async ({ supabase_session }) => {
  if (supabase_session?.access_token) {
    try {
      const response = await fetch(
        "https://codetracker-psi.vercel.app/api/validate-session",
        {
          headers: {
            Authorization: `Bearer ${supabase_session.access_token}`,
          },
        }
      );
      if (!response.ok) {
        console.warn("background.js: session invalid—removing supabase_session");
        chrome.storage.local.remove("supabase_session");
      } else {
        console.log("background.js: session still valid");
      }
    } catch (e) {
      console.error("background.js: Session validation failed:", e);
      chrome.storage.local.remove("supabase_session");
    }
  } else {
    console.log("background.js: no supabase_session to validate");
  }
});

// ─── 7) Sync Function ────────────────────────────────────────────────
async function syncWithWebApp() {
  if (!supabaseExt) {
    await initSupabaseClient();
    if (!supabaseExt) return;
  }

  chrome.storage.local.get(
    ["savedProblemsByUser", "supabase_session"],
    async (result) => {
      const allSaved = result.savedProblemsByUser || {};
      const supaSession = result.supabase_session;

      if (!supaSession || !supaSession.access_token) {
        console.log("background.js: syncWithWebApp: no session to sync");
        return;
      }

      const userId = supaSession.user.id;
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
          "https://codetracker-psi.vercel.app/api/problems/bulk-sync",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supaSession.access_token}`,
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
