// popup.js
// ========
// Handles authentication (Supabase Auth) and problem‐detection/save logic.
// Runs as an ES module; popup.html already loaded vendor/supabase.js, so `supabase` is global.

const { createClient } = supabase; // from UMD build

// ─── HELPER: Log to popup’s console (for debugging) ─────────────────────────────────────
const log = (...args) => {
  console.log("popup.js:", ...args);
};

// ─── 1) READ SUPABASE KEYS FROM chrome.storage.local ────────────────────────────────────
async function getEnv() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
      (items) => {
        resolve({
          url: items.SUPABASE_URL,
          anonKey: items.SUPABASE_ANON_KEY,
        });
      }
    );
  });
}

// ─── 2) INITIALIZE SUPABASE CLIENT FOR EXTENSION ───────────────────────────────────────
let supabaseExt = null;
async function initSupabaseClient() {
  const { url, anonKey } = await getEnv();
  if (!url || !anonKey) {
    log("ERROR: Supabase URL or anon key missing in storage");
    return null;
  }
  // If we already created a client instance, reuse it. Otherwise, create a new one:
  if (!supabaseExt) {
    supabaseExt = createClient(url, anonKey);
    log("Supabase client initialized in popup");
  }
  return supabaseExt;
}

// ─── HELPER: Return the current logged‐in user (or null) ────────────────────────────────
async function getCurrentUser() {
  if (!supabaseExt) return null;
  const {
    data: { user },
    error,
  } = await supabaseExt.auth.getUser();
  if (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
  return user;
}

// ─── HELPER: Ask Supabase if this user already saved a problem with this URL (server‐side) ─
async function isSavedServerSide(url) {
  const user = await getCurrentUser();
  if (!user) {
    console.error("isSavedServerSide: no user in Supabase client");
    return false;
  }

  // Query the `problems` table filtering by (user_id == currentUser.id AND url == url)
  const { data: existing, error: queryError } = await supabaseExt
    .from("problems")
    .select("id, topic")
    .eq("url", url)
    .eq("user_id", user.id)
    .maybeSingle();

  if (queryError) {
    console.error("isSavedServerSide: unexpected query error", queryError);
    return false;
  }
  return !!existing;
}

// ─── 3) DOM ELEMENT REFERENCES ────────────────────────────────────────────────────────
const loadingViewEl      = document.getElementById("loading-view");
const authContainerEl    = document.getElementById("auth-container");
const signinFormEl       = document.getElementById("signin-form");
const signedInViewEl     = document.getElementById("signed-in-view");
const userEmailTextEl    = document.getElementById("user-email-text");
const loginButton        = document.getElementById("login-button");
const logoutButton       = document.getElementById("logout-button");
const loginErrorEl       = document.getElementById("login-error");

const notProblemPageEl   = document.getElementById("not-problem-page");
const problemDetectedEl  = document.getElementById("problem-detected");
const alreadySavedEl     = document.getElementById("already-saved");
const statusIndicator    = document.getElementById("status-indicator");

const saveButton         = document.getElementById("save-button");
const viewButton         = document.getElementById("view-button");
const removeButton       = document.getElementById("remove-button");

const openWebappLink     = document.getElementById("open-webapp-link");

const problemTitleEl     = document.getElementById("problem-title");
const difficultyEl       = document.getElementById("problem-difficulty");
const topicsContainer    = document.getElementById("problem-topics");
const topicSelect        = document.getElementById("topic-select");
const notesTextarea      = document.getElementById("notes");
const savedTitleEl       = document.getElementById("saved-title");
const savedTopicEl       = document.getElementById("saved-topic");

// ─── 4) STATE ─────────────────────────────────────────────────────────────────────────
let currentProblemData = null;
let currentUserId      = null;
let currentTabId       = null;

// ─── 5) SHOW/HIDE FUNCTIONS ────────────────────────────────────────────────────────────
function showLoading() {
  loadingViewEl.classList.remove("hidden");
  authContainerEl.classList.add("hidden");
  notProblemPageEl.classList.add("hidden");
  problemDetectedEl.classList.add("hidden");
  alreadySavedEl.classList.add("hidden");
}

function showSignInForm() {
  loadingViewEl.classList.add("hidden");
  authContainerEl.classList.remove("hidden");
  signinFormEl.classList.remove("hidden");
  signedInViewEl.classList.add("hidden");

  notProblemPageEl.classList.add("hidden");
  problemDetectedEl.classList.add("hidden");
  alreadySavedEl.classList.add("hidden");
  statusIndicator.classList.remove("bg-green-500", "bg-blue-500");
  statusIndicator.classList.add("bg-gray-300");
}

function showSignedInSkeleton(email) {
  loadingViewEl.classList.add("hidden");
  authContainerEl.classList.remove("hidden");
  signinFormEl.classList.add("hidden");
  signedInViewEl.classList.remove("hidden");
  userEmailTextEl.textContent = `Signed in as ${email}`;

  notProblemPageEl.classList.add("hidden");
  problemDetectedEl.classList.add("hidden");
  alreadySavedEl.classList.add("hidden");
  statusIndicator.classList.remove("bg-green-500", "bg-blue-500");
  statusIndicator.classList.add("bg-gray-300");
}

function showProblemDetected(problem) {
  loadingViewEl.classList.add("hidden");
  authContainerEl.classList.remove("hidden");
  signinFormEl.classList.add("hidden");
  signedInViewEl.classList.remove("hidden");

  notProblemPageEl.classList.add("hidden");
  problemDetectedEl.classList.remove("hidden");
  alreadySavedEl.classList.add("hidden");
  statusIndicator.classList.remove("bg-gray-300", "bg-blue-500");
  statusIndicator.classList.add("bg-green-500");

  problemTitleEl.textContent = problem.title || "Unknown Title";
  difficultyEl.textContent = problem.difficulty || "Medium";
  if (problem.difficulty === "Easy") {
    difficultyEl.className = "text-sm text-green-600 font-medium";
  } else if (problem.difficulty === "Medium") {
    difficultyEl.className = "text-sm text-orange-600 font-medium";
  } else {
    difficultyEl.className = "text-sm text-red-600 font-medium";
  }

  topicsContainer.innerHTML = "";
  if (problem.topics && problem.topics.length > 0) {
    problem.topics.forEach((topic) => {
      const span = document.createElement("span");
      span.className = "text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5";
      span.textContent = topic;
      topicsContainer.appendChild(span);
    });
  } else {
    const noTopicsSpan = document.createElement("span");
    noTopicsSpan.className = "text-xs text-gray-500";
    noTopicsSpan.textContent = "No topics detected";
    topicsContainer.appendChild(noTopicsSpan);
  }

  // Auto‐select a topic in the dropdown
  topicSelect.value = "dynamic-programming";
  if (problem.topics && problem.topics.length > 0) {
    const lowerTopics = problem.topics.map((t) => t.toLowerCase());
    if (lowerTopics.some((t) => t.includes("dynamic") || t.includes("dp"))) {
      topicSelect.value = "dynamic-programming";
    } else if (lowerTopics.some((t) => t.includes("array"))) {
      topicSelect.value = "arrays";
    } else if (lowerTopics.some((t) => t.includes("string"))) {
      topicSelect.value = "strings";
    } else if (lowerTopics.some((t) => t.includes("tree") || t.includes("bst"))) {
      topicSelect.value = "trees";
    } else if (lowerTopics.some((t) => t.includes("graph"))) {
      topicSelect.value = "graphs";
    } else if (lowerTopics.some((t) => t.includes("linked") || t.includes("list"))) {
      topicSelect.value = "linked-lists";
    } else if (lowerTopics.some((t) => t.includes("stack") || t.includes("queue"))) {
      topicSelect.value = "stacks-queues";
    } else if (lowerTopics.some((t) => t.includes("binary") || t.includes("search"))) {
      topicSelect.value = "binary-search";
    } else if (lowerTopics.some((t) => t.includes("greedy"))) {
      topicSelect.value = "greedy";
    } else if (lowerTopics.some((t) => t.includes("backtrack"))) {
      topicSelect.value = "backtracking";
    }
  }

  saveButton.textContent = "Save Problem";
  saveButton.disabled = false;
  saveButton.classList.remove("bg-green-600");
  saveButton.classList.add("bg-blue-600");
}

function showAlreadySaved(problem) {
  loadingViewEl.classList.add("hidden");
  authContainerEl.classList.remove("hidden");
  signinFormEl.classList.add("hidden");
  signedInViewEl.classList.remove("hidden");

  notProblemPageEl.classList.add("hidden");
  problemDetectedEl.classList.add("hidden");
  alreadySavedEl.classList.remove("hidden");
  statusIndicator.classList.remove("bg-gray-300", "bg-green-500");
  statusIndicator.classList.add("bg-blue-500");

  savedTitleEl.textContent = problem.title || "Unknown Title";
  let topicDisplay = problem.topic || "dynamic-programming";
  topicDisplay = topicDisplay
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  savedTopicEl.textContent = topicDisplay;
}

function showNotProblemPage() {
  loadingViewEl.classList.add("hidden");
  authContainerEl.classList.remove("hidden");
  signinFormEl.classList.add("hidden");
  signedInViewEl.classList.remove("hidden");

  notProblemPageEl.classList.remove("hidden");
  problemDetectedEl.classList.add("hidden");
  alreadySavedEl.classList.add("hidden");
  statusIndicator.classList.remove("bg-green-500", "bg-blue-500");
  statusIndicator.classList.add("bg-gray-300");
}

// ─── 6) ON POPUP LOAD: INITIALIZE & DRIVE FLOW ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  showLoading();

  await initSupabaseClient();
  if (!supabaseExt) {
    log("ERROR: could not initialize Supabase client in popup");
    setTimeout(() => showSignInForm(), 500);
    return;
  }

  // 6a) Try to see if supabaseExt already has a session in‐memory (from a previous login)
  const {
    data: { session: existingSession },
  } = await supabaseExt.auth.getSession();

  if (existingSession && existingSession.access_token) {
    // Supabase client already has a valid session
    const user = await getCurrentUser();
    if (user) {
      currentUserId = user.id;
      showSignedInSkeleton(user.email);
      await checkProblemAndRender();
      return;
    }
  }

  // 6b) Otherwise, try to load supabase_session from chrome.storage.local
  chrome.storage.local.get(["supabase_session"], async ({ supabase_session }) => {
    if (supabase_session && supabase_session.access_token) {
      // Explicitly set the session so in‐memory client sees it
      await supabaseExt.auth.setSession({
        access_token: supabase_session.access_token,
        refresh_token: supabase_session.refresh_token,
      });

      const user = await getCurrentUser();
      if (user) {
        currentUserId = user.id;
        showSignedInSkeleton(user.email);
        await checkProblemAndRender();
      } else {
        showSignInForm();
      }
    } else {
      showSignInForm();
    }
  });
});


// ─── 7) CHECK PROBLEM & RENDER ───────────────────────────────────────────────────────────
async function checkProblemAndRender() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      currentTabId = tabs[0].id;
      chrome.tabs.sendMessage(
        currentTabId,
        { action: "extractProblemData" },
        async (response) => {
          if (chrome.runtime.lastError || !response) {
            showNotProblemPage();
            resolve();
            return;
          }

          currentProblemData = response;

          // 7a) LOCAL CHECK – only for the currently signed‐in user:
          const userId = currentUserId;
          chrome.storage.local.get("savedProblemsByUser", async (data) => {
            const allSaved = data.savedProblemsByUser || {};
            const savedForMe = allSaved[userId] || [];
            const locallySaved = savedForMe.find(
              (p) => p.url === currentProblemData.url
            );

            if (locallySaved) {
              showAlreadySaved(locallySaved);
              resolve();
            } else {
              // 7b) SERVER‐SIDE CHECK – call Supabase
              let serverSaved = false;
              try {
                serverSaved = await isSavedServerSide(currentProblemData.url);
              } catch (err) {
                console.error("checkProblemAndRender: Supabase error", err);
                serverSaved = false;
              }

              if (serverSaved) {
                // If it exists on the server for _my_ user, show Already Saved
                showAlreadySaved({
                  title: currentProblemData.title,
                  topic: currentProblemData.topic || "dynamic-programming",
                  url: currentProblemData.url,
                });
              } else {
                // Not found anywhere → let user save it
                showProblemDetected(currentProblemData);
              }
              resolve();
            }
          });
        }
      );
    });
  });
}


// ─── 8) HANDLE SIGN‐IN ─────────────────────────────────────────────────────────────────
loginButton.addEventListener("click", async () => {
  const emailInput    = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const email    = emailInput.value.trim();
  const password = passwordInput.value;

  loginErrorEl.classList.add("hidden");
  loginButton.disabled = true;
  loginButton.textContent = "Signing In…";

  const { data, error } = await supabaseExt.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    loginErrorEl.textContent = error.message;
    loginErrorEl.classList.remove("hidden");
    loginButton.textContent = "Sign In";
    loginButton.disabled = false;
    return;
  }

  // 8a) We have a new session for User X
  const session = data.session;
  const user    = data.user;
  currentUserId = user.id;

  // 8b) Store it in chrome.storage.local
  chrome.storage.local.set(
    {
      supabase_session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: user,
      },
    },
    async () => {
      // 8c) ALSO force in‐memory supabaseExt to use that session immediately:
      await supabaseExt.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      showSignedInSkeleton(user.email);
      bindAfterSignIn();
    }
  );
});


// ─── 9) HANDLE SIGN‐OUT ─────────────────────────────────────────────────────────────────
logoutButton.addEventListener("click", async () => {
  // 9a) Supabase sign out
  try {
    await supabaseExt.auth.signOut();
  } catch (e) {
    console.warn("popup.js: supabaseExt.auth.signOut() threw:", e);
  }
  // 9b) Also clear any leftover in‐memory session
  await supabaseExt.auth.setSession({ access_token: "", refresh_token: "" });

  // 9c) Remove session and user‐specific saved problems from storage
  chrome.storage.local.remove(["supabase_session"], () => {
    // We do NOT remove savedProblemsByUser completely,
    // because we want to preserve other users' data. Just clear currentUserId:
    currentUserId = null;

    showSignInForm();
    notProblemPageEl.classList.add("hidden");
    problemDetectedEl.classList.add("hidden");
    alreadySavedEl.classList.add("hidden");
    statusIndicator.classList.remove("bg-green-500", "bg-blue-500");
    statusIndicator.classList.add("bg-gray-300");
  });
});


// ─── 10) SAVE PROBLEM ───────────────────────────────────────────────────────────────────
saveButton.addEventListener("click", async () => {
  if (!currentProblemData || !currentUserId) return;
  saveButton.disabled = true;
  saveButton.textContent = "Saving…";

  const user = await getCurrentUser();
  if (!user) {
    console.error("popup.js: Could not fetch user for saving");
    alert("Session expired. Please sign in again.");
    saveButton.disabled = false;
    saveButton.textContent = "Save Problem";
    return;
  }

  // Build the problem object to save
  const problemToSave = {
    title: currentProblemData.title || "Unknown Problem",
    url: currentProblemData.url,
    difficulty: currentProblemData.difficulty || "Medium",
    description: currentProblemData.description || "",
    platform: currentProblemData.platform || "unknown",
    topic: topicSelect.value,
    notes: notesTextarea.value,
    topics: currentProblemData.topics || [],
    companies: currentProblemData.companies || [],
    dateAdded: new Date().toISOString(),
    user_id: user.id,
  };

  // 10a) Store it locally, under this user’s bucket:
  chrome.storage.local.get("savedProblemsByUser", async (data) => {
    const allSaved = data.savedProblemsByUser || {};
    const savedForMe = allSaved[user.id] || [];
    savedForMe.push(problemToSave);
    allSaved[user.id] = savedForMe;

    chrome.storage.local.set({ savedProblemsByUser: allSaved }, async () => {
      log("Saved locally in extension for user:", user.email);
      console.log("Problem to save locally:", problemToSave);

      // 10b) THEN attempt to save on the server
      try {
        // Make sure in‐memory session is up‐to‐date
        const {
          data: { session },
          error: getSessionError,
        } = await supabaseExt.auth.getSession();

        if (getSessionError || !session) {
          console.error(
            "popup.js: Could not fetch session for API call:",
            getSessionError
          );
          alert("Session expired. Please sign in again.");
          return;
        }

        // POST to your web app’s /api/problems
        const response = await fetch(
          "https://codetracker-psi.vercel.app/api/problems",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ problem: problemToSave }),
          }
        );
        const resData = await response.json();
        log("API response:", resData);

        if (resData.success) {
          saveButton.textContent = "Saved!";
        } else {
          saveButton.textContent = "Saved Locally!";
        }
      } catch (err) {
        console.error("Error saving to web app:", err);
        saveButton.textContent = "Saved Locally!";
      } finally {
        saveButton.classList.remove("bg-blue-600");
        saveButton.classList.add("bg-green-600");
        setTimeout(() => {
          showAlreadySaved(problemToSave);
        }, 1200);
      }
    });
  });
});


// ─── 11) VIEW BUTTON → Open Web App (no token in URL) ─────────────────────────────────
viewButton.addEventListener("click", async () => {
  // Just open the homepage; we no longer pass the token in the URL
  chrome.tabs.create({ url: "https://codetracker-psi.vercel.app" });
});


// ─── 12) REMOVE BUTTON → Delete from Local Storage (current user only) ────────────────
removeButton.addEventListener("click", () => {
  if (!currentProblemData || !currentUserId) return;
  chrome.storage.local.get("savedProblemsByUser", (data) => {
    const allSaved = data.savedProblemsByUser || {};
    const savedForMe = allSaved[currentUserId] || [];
    // Remove any entry whose url matches the current problem’s URL
    const filtered = savedForMe.filter(
      (p) => p.url !== currentProblemData.url
    );
    allSaved[currentUserId] = filtered;
    chrome.storage.local.set({ savedProblemsByUser: allSaved }, () => {
      log("Removed from local storage for user:", currentUserId);
      showProblemDetected(currentProblemData);
    });
  });
});
