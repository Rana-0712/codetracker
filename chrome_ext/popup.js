// popup.js
// ========
// Handles authentication (Supabase Auth) and problem-detection/save logic.
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
  supabaseExt = createClient(url, anonKey);
  log("Supabase client initialized in popup");
  return supabaseExt;
}

// ─── HELPER: Ask Supabase if this user already saved a problem with this URL ─────────────
async function isSavedServerSide(url) {
  const {
    data: { user },
    error: userError,
  } = await supabaseExt.auth.getUser();
  if (userError || !user) {
    console.error("isSavedServerSide: no user in Supabase client", userError);
    return false;
  }

  const { data: existing, error: queryError } = await supabaseExt
    .from("problems")
    .select("id, topic")
    .eq("url", url)
    .eq("user_id", user.id)
    .single();

  if (queryError && queryError.code !== "PGRST116") {
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

  // 6a) First, try to see if supabaseExt already has a session (internal storage)
  const {
    data: { session: existingSession },
  } = await supabaseExt.auth.getSession();

  if (existingSession && existingSession.access_token) {
    // Supabase client already has a valid session
    const {
      data: { user },
      error: getUserError,
    } = await supabaseExt.auth.getUser();

    if (!getUserError && user) {
      showSignedInSkeleton(user.email);
      await checkProblemAndRender();
      return;
    }
  }

  // 6b) Otherwise, try to load supabase_session from chrome.storage.local
  chrome.storage.local.get(["supabase_session"], async ({ supabase_session }) => {
    if (supabase_session && supabase_session.access_token) {
      await supabaseExt.auth.setSession({
        access_token: supabase_session.access_token,
        refresh_token: supabase_session.refresh_token,
      });

      const {
        data: { user },
        error: getUserError,
      } = await supabaseExt.auth.getUser();

      if (!getUserError && user) {
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

async function bindAfterSignIn() {
  const {
    data: { session },
  } = await supabaseExt.auth.getSession();
  const token = session.access_token;
  openWebappLink.href = `https://codetracker-psi.vercel.app/auth/extension-login?token=${token}`;

  await checkProblemAndRender();
}

// ─── 7) CHECK PROBLEM & RENDER UPDATED ───────────────────────────────────────────────────
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

          chrome.storage.local.get("savedProblems", async (data) => {
            const savedProblems = data.savedProblems || [];

            // Local check
            const locallySaved = savedProblems.find(
              (p) => p.url === currentProblemData.url
            );

            // Server-side check
            let serverSaved = false;
            try {
              serverSaved = await isSavedServerSide(currentProblemData.url);
            } catch (err) {
              console.error("checkProblemAndRender: Supabase error", err);
              serverSaved = false;
            }

            if (locallySaved) {
              showAlreadySaved(locallySaved);
            } else if (serverSaved) {
              showAlreadySaved({
                title: currentProblemData.title,
                topic: currentProblemData.topic || "dynamic-programming",
                url: currentProblemData.url,
              });
            } else {
              showProblemDetected(currentProblemData);
            }

            resolve();
          });
        }
      );
    });
  });
}

// ─── 8) HANDLE SIGN-IN ────────────────────────────────────────────────────────────────
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

  const session = data.session;
  chrome.storage.local.set(
    {
      supabase_session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: session.user,
      },
    },
    () => {
      showSignedInSkeleton(session.user.email);
      bindAfterSignIn();
    }
  );
});

// ─── 9) HANDLE SIGN-OUT ───────────────────────────────────────────────────────────────
logoutButton.addEventListener("click", async () => {
  await supabaseExt.auth.signOut();
  chrome.storage.local.remove("supabase_session", () => {
    showSignInForm();
    notProblemPageEl.classList.add("hidden");
    problemDetectedEl.classList.add("hidden");
    alreadySavedEl.classList.add("hidden");
    statusIndicator.classList.remove("bg-green-500", "bg-blue-500");
    statusIndicator.classList.add("bg-gray-300");
  });
});

// ─── 10) SAVE PROBLEM ─────────────────────────────────────────────────────────────────
saveButton.addEventListener("click", async () => {
  if (!currentProblemData) return;
  saveButton.disabled = true;
  saveButton.textContent = "Saving…";

  const {
    data: { user },
    error: getUserError,
  } = await supabaseExt.auth.getUser();

  if (getUserError || !user) {
    console.error("popup.js: Could not fetch user for saving:", getUserError);
    alert("Session expired. Please sign in again.");
    saveButton.disabled = false;
    saveButton.textContent = "Save Problem";
    return;
  }
  const userId = user.id;

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
    user_id: userId,
  };

  chrome.storage.local.get("savedProblems", async (data) => {
    const savedProblems = data.savedProblems || [];
    savedProblems.push(problemToSave);
    chrome.storage.local.set({ savedProblems }, async () => {
      log("Saved locally in extension");
      console.log("Problem to save:", problemToSave);

      try {
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
        saveButton.classList.remove("bg-blue-600");
        saveButton.classList.add("bg-green-600");

        setTimeout(() => {
          showAlreadySaved(problemToSave);
        }, 1200);
      } catch (err) {
        console.error("Error saving to web app:", err);
        saveButton.textContent = "Saved Locally!";
        saveButton.classList.remove("bg-blue-600");
        saveButton.classList.add("bg-green-600");
        setTimeout(() => {
          showAlreadySaved(problemToSave);
        }, 1200);
      }
    });
  });
});

// ─── 11) VIEW BUTTON → Open Web App with JWT ──────────────────────────────────────────
viewButton.addEventListener("click", async () => {
  const {
    data: { session },
  } = await supabaseExt.auth.getSession();
  if (session && session.access_token) {
    chrome.tabs.create({
      url: `https://codetracker-psi.vercel.app/auth/extension-login?token=${session.access_token}`,
    });
  } else {
    chrome.tabs.create({ url: "https://codetracker-psi.vercel.app" });
  }
});

// ─── 12) REMOVE BUTTON → Delete from Local Storage ────────────────────────────────────
removeButton.addEventListener("click", () => {
  if (!currentProblemData) return;
  chrome.storage.local.get("savedProblems", (data) => {
    let savedProblems = data.savedProblems || [];
    savedProblems = savedProblems.filter(
      (p) => p.url !== currentProblemData.url
    );
    chrome.storage.local.set({ savedProblems }, () => {
      log("Removed from local storage");
      showProblemDetected(currentProblemData);
    });
  });
});
