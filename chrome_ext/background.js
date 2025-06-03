console.log("background.js: starting up");

// 1) Load the UMD build of Supabase
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

// 3) Grab createClient from that global (if available)
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

// 4) Function to initialize the Supabase client from stored keys
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
        console.log("background.js: Found Supabase keys:", {
          SUPABASE_URL,
          SUPABASE_ANON_KEY: SUPABASE_ANON_KEY.slice(0, 8) + "…"
        });
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

// Immediately attempt to initialize (for debugging)
initSupabaseClient();

// 5) OnInstalled: just log and set up storage
chrome.runtime.onInstalled.addListener(() => {
  console.log("background.js: onInstalled event");
  chrome.storage.local.get(["savedProblems"], (result) => {
    if (!result.savedProblems) {
      chrome.storage.local.set({ savedProblems: [] }, () => {
        console.log("background.js: Initialized savedProblems = []");
      });
    } else {
      console.log(
        "background.js: savedProblems already present:",
        result.savedProblems.length,
        "items"
      );
    }
  });

  // Clear session on install/update
  chrome.storage.local.remove("supabase_session");

  // Reminder log: the developer must run the seeding command manually once
  console.log(
    "background.js: If you have NOT seeded your keys yet, open the SW console and run:\n" +
      "  chrome.storage.local.set({\n" +
      "    SUPABASE_URL: \"https://YOUR-PROJECT.supabase.co\",\n" +
      "    SUPABASE_ANON_KEY: \"<your-anon-key>\"\n" +
      "  });"
  );
});

// 6) Example message listener (unchanged)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "isProblemPage") {
    console.log("background.js: Problem page detected:", request.isProblemPage);
  }
  return true;
});

// 7) Session validation
chrome.storage.local.get(["supabase_session"], async ({ supabase_session }) => {
  if (supabase_session?.access_token) {
    try {
      const response = await fetch("https://codetracker-psi.vercel.app/api/validate-session", {
        headers: {
          Authorization: `Bearer ${supabase_session.access_token}`
        }
      });
      if (!response.ok) {
        chrome.storage.local.remove("supabase_session");
      }
    } catch (e) {
      console.error("Session validation failed:", e);
      chrome.storage.local.remove("supabase_session");
    }
  }
});

// 8) Example sync function
async function syncWithWebApp() {
  if (!supabaseExt) {
    await initSupabaseClient();
    if (!supabaseExt) return;
  }
  try {
    chrome.storage.local.get(
      ["savedProblems", "supabase_session"],
      async (result) => {
        const savedProblems = result.savedProblems || [];
        const supaSession = result.supabase_session;
        if (!supaSession || savedProblems.length === 0) {
          console.log(
            "background.js: syncWithWebApp: no session or no problems to sync"
          );
          return;
        }
        console.log(
          "background.js: syncWithWebApp: forwarding",
          savedProblems.length,
          "items with token…"
        );
        const { access_token } = supaSession;
        await fetch("https://codetracker-psi.vercel.app/api/problems", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access_token}`,
          },
          body: JSON.stringify({ problems: savedProblems }),
        });
        console.log("background.js: syncWithWebApp: successfully synced");
      }
    );
  } catch (error) {
    console.error("background.js: syncWithWebApp error:", error);
  }
}