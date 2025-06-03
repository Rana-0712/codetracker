// popup.js
// ========
// This script handles both authentication (Supabase Auth) and the existing
// problem-detection/save logic. It runs in ES module mode (type="module").
// We assume popup.html already loaded vendor/supabase.js, so `supabase` is global.

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

// ─── 3) DOM ELEMENT REFERENCES ────────────────────────────────────────────────────────
const signinFormEl = document.getElementById("signin-form");
const signedInViewEl = document.getElementById("signed-in-view");
const userEmailTextEl = document.getElementById("user-email-text");
const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");
const loginErrorEl = document.getElementById("login-error");

const notProblemPageEl = document.getElementById("not-problem-page");
const problemDetectedEl = document.getElementById("problem-detected");
const alreadySavedEl = document.getElementById("already-saved");
const statusIndicator = document.getElementById("status-indicator");

const saveButton = document.getElementById("save-button");
const viewButton = document.getElementById("view-button");
const removeButton = document.getElementById("remove-button");

const openWebappLink = document.getElementById("open-webapp-link");

const problemTitleEl = document.getElementById("problem-title");
const difficultyEl = document.getElementById("problem-difficulty");
const topicsContainer = document.getElementById("problem-topics");
const topicSelect = document.getElementById("topic-select");
const notesTextarea = document.getElementById("notes");
const savedTitleEl = document.getElementById("saved-title");
const savedTopicEl = document.getElementById("saved-topic");

// State
let currentProblemData = null;
let currentTabId = null;

// ─── 4) SHOW/HIDE HELPER FUNCTIONS ────────────────────────────────────────────────────
function showSignInForm() {
  signinFormEl.classList.remove("hidden");
  signedInViewEl.classList.add("hidden");
}

function showSignedInView(email) {
  signinFormEl.classList.add("hidden");
  signedInViewEl.classList.remove("hidden");
  userEmailTextEl.textContent = `Signed in as ${email}`;
}

function showNotProblemPage() {
  notProblemPageEl.classList.remove("hidden");
  problemDetectedEl.classList.add("hidden");
  alreadySavedEl.classList.add("hidden");
  statusIndicator.classList.remove("bg-green-500", "bg-blue-500");
  statusIndicator.classList.add("bg-gray-300");
}

function showProblemDetected(problem) {
  notProblemPageEl.classList.add("hidden");
  problemDetectedEl.classList.remove("hidden");
  alreadySavedEl.classList.add("hidden");
  statusIndicator.classList.remove("bg-gray-300", "bg-blue-500");
  statusIndicator.classList.add("bg-green-500");

  // Reset save button
  saveButton.textContent = "Save Problem";
  saveButton.disabled = false;
  saveButton.classList.remove("bg-green-600");
  saveButton.classList.add("bg-blue-600");

  // Populate fields
  problemTitleEl.textContent = problem.title || "Unknown Title";

  difficultyEl.textContent = problem.difficulty || "Medium";
  if (problem.difficulty === "Easy") {
    difficultyEl.className = "text-sm text-green-600 font-medium";
  } else if (problem.difficulty === "Medium") {
    difficultyEl.className = "text-sm text-orange-600 font-medium";
  } else {
    difficultyEl.className = "text-sm text-red-600 font-medium";
  }

  // Topics
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

  // Pre-select a topic
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
}

function showAlreadySaved(problem) {
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

// ─── 5) ON POPUP LOAD → INITIALIZE CLIENT & CHECK SESSION ──────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await initSupabaseClient();
  if (!supabaseExt) {
    log("ERROR: could not initialize Supabase client in popup");
    return;
  }

  // Check for existing session (from previous sign-in)
  chrome.storage.local.get(["supabase_session"], async ({ supabase_session }) => {
    if (supabase_session && supabase_session.access_token) {
      // Rehydrate the Supabase client with that session
      await supabaseExt.auth.setSession({
        access_token: supabase_session.access_token,
        refresh_token: supabase_session.refresh_token,
      });

      // ⚠️ Explicitly fetch the user object (v2 does not populate session.user reliably)
      const {
        data: { user },
        error: getUserError,
      } = await supabaseExt.auth.getUser();

      if (getUserError || !user) {
        console.error("popup.js: Failed to rehydrate user:", getUserError);
        showSignInForm();
        return;
      }

      showSignedInView(user.email);
      bindAfterSignIn();
    } else {
      showSignInForm();
    }
  });
});

// ─── 6) HANDLE SIGN-IN ────────────────────────────────────────────────────────────────
loginButton.addEventListener("click", async () => {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const email = emailInput.value.trim();
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
      showSignedInView(session.user.email);
      bindAfterSignIn();
    }
  );
});

// ─── 7) HANDLE SIGN-OUT ───────────────────────────────────────────────────────────────
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

// ─── 8) AFTER SIGN-IN → BIND PROBLEM DETECTION FLOW ────────────────────────────────────
async function bindAfterSignIn() {
  // 1) Update “Open Web App” link to include JWT for SSO
  const {
    data: { session },
  } = await supabaseExt.auth.getSession();
  const token = session.access_token;
  openWebappLink.href = `https://codetracker-psi.vercel.app/auth/extension-login?token=${token}`;

  // 2) Query active tab for problem data
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    currentTabId = tabs[0].id;
    chrome.tabs.sendMessage(
      currentTabId,
      { action: "extractProblemData" },
      (response) => {
        if (chrome.runtime.lastError || !response) {
          showNotProblemPage();
          return;
        }
        currentProblemData = response;

        // Check if already saved locally
        chrome.storage.local.get("savedProblems", (data) => {
          const savedProblems = data.savedProblems || [];
          const alreadySaved = savedProblems.some(
            (p) => p.url === currentProblemData.url
          );
          if (alreadySaved) {
            const savedProblem = savedProblems.find(
              (p) => p.url === currentProblemData.url
            );
            showAlreadySaved(savedProblem);
          } else {
            showProblemDetected(currentProblemData);
          }
        });
      }
    );
  });
}

// ─── 9) SAVE PROBLEM: Save Locally + To Web App ───────────────────────────────────────
saveButton.addEventListener("click", async () => {
  if (!currentProblemData) return;
  saveButton.disabled = true;
  saveButton.textContent = "Saving…";

  // Explicitly fetch the user object (v2 does not populate session.user reliably)
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
    user_id: userId, // ← use user.id from getUser()
  };

  // 1) Save locally
  chrome.storage.local.get("savedProblems", async (data) => {
    const savedProblems = data.savedProblems || [];
    savedProblems.push(problemToSave);
    chrome.storage.local.set({ savedProblems }, async () => {
      log("Saved locally in extension");

      console.log("Problem to save:", problemToSave);

      // 2) Save to your web app via API, with Authorization header
      try {
        // Fetch the session (for the access_token header)
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

// ─── 10) VIEW BUTTON → Open Web App with JWT ──────────────────────────────────────────
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

// ─── 11) REMOVE BUTTON → Delete from Local Storage ────────────────────────────────────
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
