// background.js

console.log("background.js: starting up");

// ─── 1) Load the UMD build of Supabase ───────────────────────────────────────────────
try {
  importScripts("vendor/supabase.js");
  console.log("background.js: importScripts succeeded");
} catch (e) {
  console.error("background.js: importScripts failed:", e);
}

// 2) Check that the UMD global 'supabase' exists
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

// ─── 3) Function to initialize the Supabase client from stored keys ──────────────────
function initSupabaseClient() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
      ({ SUPABASE_URL, SUPABASE_ANON_KEY }) => {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
          console.error("background.js: No Supabase keys found in storage");
          console.log(
            "background.js: SUPABASE_URL =", SUPABASE_URL,
            "SUPABASE_ANON_KEY =", SUPABASE_ANON_KEY
          );
          resolve(null);
          return;
        }
        console.log(
          "background.js: Found Supabase keys:",
          { SUPABASE_URL, SUPABASE_ANON_KEY: SUPABASE_ANON_KEY.slice(0, 8) + "…"}
        );
        try {
          supabaseExt = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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

// Immediately attempt initialization for logging
initSupabaseClient();

// ─── 4) OnInstalled: initialize storage and clear any old session ─────────────────────
chrome.runtime.onInstalled.addListener(() => {
  console.log("background.js: onInstalled event");
  // Ensure we have a place to store each user’s savedProblems:
  chrome.storage.local.get(["savedProblemsByUser"], (result) => {
    if (!result.savedProblemsByUser) {
      chrome.storage.local.set({ savedProblemsByUser: {} }, () => {
        console.log("background.js: Initialized savedProblemsByUser = {}");
      });
    } else {
      console.log(
        "background.js: savedProblemsByUser already exists"
      );
    }
  });

  // Clear supabase_session on install/update so user must re-authenticate:
  chrome.storage.local.remove("supabase_session");
  console.log("background.js: Cleared supabase_session on install");

  console.log(
    "background.js: If you have NOT seeded your Supabase keys yet, open the SW console and run:\n" +
    "  chrome.storage.local.set({\n" +
    "    SUPABASE_URL: \"https://YOUR_PROJECT_REF.supabase.co\",\n" +
    "    SUPABASE_ANON_KEY: \"<your-anon-key>\"\n" +
    "  });"
  );
});

// ─── 5) Example message listener ─────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "isProblemPage") {
    console.log("background.js: Problem page detected:", request.isProblemPage);
  }
  return true;
});

// ─── 6) Session validation (optional) ─────────────────────────────────────────────────
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

// ─── 7) Example sync function (partitions by user) ─────────────────────────────────────
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
        console.log(
          "background.js: syncWithWebApp: no session to sync"
        );
        return;
      }

      const userId = supaSession.user.id;
      const savedForMe = allSaved[userId] || [];
      if (savedForMe.length === 0) {
        console.log(
          "background.js: syncWithWebApp: no problems to sync for user", userId
        );
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

// (You can call syncWithWebApp() from wherever you need to trigger syncing.)

