// popup.js
// ========
// Handles authentication with Clerk and problem detection/save logic.

const log = (...args) => {
  console.log("popup.js:", ...args);
};

// DOM element references
const loadingViewEl = document.getElementById("loading-view");
const authContainerEl = document.getElementById("auth-container");
const signinFormEl = document.getElementById("signin-form");
const signedInViewEl = document.getElementById("signed-in-view");
const userEmailTextEl = document.getElementById("user-email-text");
const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");
const loginErrorEl = document.getElementById("login-error");
const headerActions = document.getElementById("header-actions");

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
let currentUserId = null;
let currentTabId = null;

// Show/hide functions
function showLoading() {
  loadingViewEl.classList.remove("hidden");
  authContainerEl.classList.add("hidden");
  headerActions.classList.add("hidden");
  notProblemPageEl.classList.add("hidden");
  problemDetectedEl.classList.add("hidden");
  alreadySavedEl.classList.add("hidden");
  statusIndicator.classList.add("hidden");
}

function showSignInForm() {
  loadingViewEl.classList.add("hidden");
  authContainerEl.classList.remove("hidden");
  signinFormEl.classList.remove("hidden");
  signedInViewEl.classList.add("hidden");
  headerActions.classList.add("hidden");

  notProblemPageEl.classList.add("hidden");
  problemDetectedEl.classList.add("hidden");
  alreadySavedEl.classList.add("hidden");
  statusIndicator.classList.add("hidden");
}

function showSignedInSkeleton(email) {
  loadingViewEl.classList.add("hidden");
  authContainerEl.classList.remove("hidden");
  signinFormEl.classList.add("hidden");
  signedInViewEl.classList.remove("hidden");
  headerActions.classList.remove("hidden");
  userEmailTextEl.textContent = `Signed in as ${email}`;

  notProblemPageEl.classList.add("hidden");
  problemDetectedEl.classList.add("hidden");
  alreadySavedEl.classList.add("hidden");
  statusIndicator.classList.add("hidden");
}

function showProblemDetected(problem) {
  loadingViewEl.classList.add("hidden");
  authContainerEl.classList.remove("hidden");
  signinFormEl.classList.add("hidden");
  signedInViewEl.classList.remove("hidden");
  headerActions.classList.remove("hidden");

  notProblemPageEl.classList.add("hidden");
  problemDetectedEl.classList.remove("hidden");
  alreadySavedEl.classList.add("hidden");

  statusIndicator.classList.remove("hidden", "bg-gray-300", "bg-indigo-500");
  statusIndicator.classList.add("bg-emerald-500", "pulse");

  problemTitleEl.textContent = problem.title || "Unknown Title";
  difficultyEl.textContent = problem.difficulty || "Medium";

  // Enhanced difficulty display with icon
  if (problem.difficulty === "Easy") {
    difficultyEl.className = "text-sm inline-flex items-center space-x-1";
    difficultyEl.innerHTML = `
      <span class="inline-block w-2 h-2 rounded-full bg-green-500"></span>
      <span class="text-green-600 font-medium">Easy</span>
    `;
  } else if (problem.difficulty === "Medium") {
    difficultyEl.className = "text-sm inline-flex items-center space-x-1";
    difficultyEl.innerHTML = `
      <span class="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
      <span class="text-orange-600 font-medium">Medium</span>
    `;
  } else {
    difficultyEl.className = "text-sm inline-flex items-center space-x-1";
    difficultyEl.innerHTML = `
      <span class="inline-block w-2 h-2 rounded-full bg-red-500"></span>
      <span class="text-red-600 font-medium">Hard</span>
    `;
  }

  topicsContainer.innerHTML = "";
  if (problem.topics && problem.topics.length > 0) {
    problem.topics.forEach((topic) => {
      const span = document.createElement("span");
      span.className = "text-xs bg-emerald-100 text-emerald-800 rounded-full px-2.5 py-1";
      span.textContent = topic;
      span.style.display = "inline-flex";
      span.style.visibility = "visible";
      span.style.opacity = "1";
      topicsContainer.appendChild(span);
    });
  } else {
    const noTopicsSpan = document.createElement("span");
    noTopicsSpan.className = "text-xs text-gray-500";
    noTopicsSpan.textContent = "No topics detected";
    noTopicsSpan.style.display = "inline-flex";
    noTopicsSpan.style.visibility = "visible";
    noTopicsSpan.style.opacity = "1";
    topicsContainer.appendChild(noTopicsSpan);
  }

  // Auto-select a topic in the dropdown
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

  saveButton.disabled = false;
  saveButton.style.display = "flex";
  saveButton.style.visibility = "visible";
  saveButton.style.opacity = "1";
}

function showAlreadySaved(problem) {
  loadingViewEl.classList.add("hidden");
  authContainerEl.classList.remove("hidden");
  signinFormEl.classList.add("hidden");
  signedInViewEl.classList.remove("hidden");
  headerActions.classList.remove("hidden");

  notProblemPageEl.classList.add("hidden");
  problemDetectedEl.classList.add("hidden");
  alreadySavedEl.classList.remove("hidden");

  statusIndicator.classList.remove("hidden", "bg-gray-300", "bg-green-500");
  statusIndicator.classList.add("bg-emerald-500", "pulse");

  savedTitleEl.textContent = problem.title || "Unknown Title";
  let topicDisplay = problem.topic || "dynamic-programming";
  topicDisplay = topicDisplay
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  savedTopicEl.textContent = topicDisplay;

  savedTopicEl.style.display = "inline-flex";
  savedTopicEl.style.visibility = "visible";
  savedTopicEl.style.opacity = "1";

  viewButton.disabled = false;
  viewButton.style.display = "flex";
  viewButton.style.visibility = "visible";
  viewButton.style.opacity = "1";
}

function showNotProblemPage() {
  loadingViewEl.classList.add("hidden");
  authContainerEl.classList.remove("hidden");
  signinFormEl.classList.add("hidden");
  signedInViewEl.classList.remove("hidden");
  headerActions.classList.remove("hidden");

  notProblemPageEl.classList.remove("hidden");
  problemDetectedEl.classList.add("hidden");
  alreadySavedEl.classList.add("hidden");
  statusIndicator.classList.add("hidden");
}

// Enhanced problem detection with retry logic
async function checkProblemWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const tabs = await new Promise((resolve) => {
        window.chrome.tabs.query({ active: true, currentWindow: true }, resolve);
      });

      if (tabs && tabs[0]) {
        currentTabId = tabs[0].id;
        const response = await new Promise((resolve) => {
          window.chrome.tabs.sendMessage(currentTabId, { action: "extractProblemData" }, (response) => {
            if (window.chrome.runtime.lastError) {
              console.log("Retry", i + 1, "- Runtime error:", window.chrome.runtime.lastError.message);
              resolve(null);
            } else {
              resolve(response);
            }
          });
        });

        if (response) {
          return response;
        }
      }
    } catch (error) {
      console.log("Retry", i + 1, "- Error:", error);
    }

    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return null;
}

// Check if problem is already saved (server-side check)
async function isSavedServerSide(url) {
  try {
    const userSession = await new Promise((resolve) => {
      chrome.storage.local.get(["user_session"], (result) => {
        resolve(result.user_session);
      });
    });

    if (!userSession || !userSession.sessionToken) {
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/api/problems/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userSession.sessionToken}`,
      },
      body: JSON.stringify({ url }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.exists;
    }
  } catch (error) {
    console.error("Error checking if problem is saved:", error);
  }
  return false;
}

// Check problem and render appropriate UI
async function checkProblemAndRender() {
  try {
    const response = await checkProblemWithRetry();

    if (!response) {
      showNotProblemPage();
      return;
    }

    currentProblemData = response;

    // Local check - only for the currently signed-in user
    const userId = currentUserId;
    chrome.storage.local.get("savedProblemsByUser", async (data) => {
      const allSaved = data.savedProblemsByUser || {};
      const savedForMe = allSaved[userId] || [];
      const locallySaved = savedForMe.find((p) => p.url === currentProblemData.url);

      if (locallySaved) {
        showAlreadySaved(locallySaved);
      } else {
        // Server-side check
        let serverSaved = false;
        try {
          serverSaved = await isSavedServerSide(currentProblemData.url);
        } catch (err) {
          console.error("checkProblemAndRender: Server error", err);
          serverSaved = false;
        }

        if (serverSaved) {
          showAlreadySaved({
            title: currentProblemData.title,
            topic: currentProblemData.topic || "dynamic-programming",
            url: currentProblemData.url,
          });
        } else {
          showProblemDetected(currentProblemData);
        }
      }
    });
  } catch (error) {
    console.error("checkProblemAndRender error:", error);
    showNotProblemPage();
  }
}

// Simple authentication simulation (replace with actual Clerk integration)
async function authenticateUser(email, password) {
  // This is a placeholder - in a real implementation, you'd integrate with Clerk
  // For now, we'll simulate authentication
  if (email && password) {
    const userId = btoa(email); // Simple user ID generation
    const sessionToken = "mock_session_token_" + Date.now();
    
    const userSession = {
      userId,
      email,
      sessionToken,
      timestamp: Date.now(),
    };

    return new Promise((resolve) => {
      chrome.storage.local.set({ user_session: userSession }, () => {
        resolve({ success: true, user: userSession });
      });
    });
  }
  
  return { success: false, error: "Invalid credentials" };
}

// On popup load: initialize & drive flow
document.addEventListener("DOMContentLoaded", async () => {
  showLoading();

  // Check if user is already signed in
  chrome.storage.local.get(["user_session"], async ({ user_session }) => {
    if (user_session && user_session.userId) {
      currentUserId = user_session.userId;
      showSignedInSkeleton(user_session.email);
      await checkProblemAndRender();
    } else {
      setTimeout(() => showSignInForm(), 800);
    }
  });
});

// Handle sign-in
loginButton.addEventListener("click", async () => {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  loginErrorEl.classList.add("hidden");
  loginButton.disabled = true;

  loginButton.innerHTML = `
    <div class="inline-flex items-center">
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Signing In...
    </div>
  `;

  const result = await authenticateUser(email, password);

  if (result.success) {
    currentUserId = result.user.userId;
    showSignedInSkeleton(result.user.email);
    await checkProblemAndRender();
  } else {
    loginErrorEl.textContent = result.error || "Authentication failed";
    loginErrorEl.classList.remove("hidden");
    loginButton.innerHTML = "Sign In";
    loginButton.disabled = false;
  }
});

// Handle sign-out
logoutButton.addEventListener("click", async () => {
  logoutButton.innerHTML = `
    <div class="inline-flex items-center">
      <svg class="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Signing Out...
    </div>
  `;

  chrome.storage.local.remove(["user_session"], () => {
    currentUserId = null;
    showSignInForm();
    notProblemPageEl.classList.add("hidden");
    problemDetectedEl.classList.add("hidden");
    alreadySavedEl.classList.add("hidden");
    statusIndicator.classList.add("hidden");
  });
});

// Save problem
saveButton.addEventListener("click", async () => {
  if (!currentProblemData || !currentUserId) return;
  
  saveButton.disabled = true;
  saveButton.innerHTML = `
    <div class="inline-flex items-center">
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Saving...
    </div>
  `;

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
    user_id: currentUserId,
  };

  // Store locally
  chrome.storage.local.get("savedProblemsByUser", async (data) => {
    const allSaved = data.savedProblemsByUser || {};
    const savedForMe = allSaved[currentUserId] || [];
    savedForMe.push(problemToSave);
    allSaved[currentUserId] = savedForMe;

    chrome.storage.local.set({ savedProblemsByUser: allSaved }, async () => {
      log("Saved locally in extension for user:", currentUserId);

      // Try to save on server
      try {
        const userSession = await new Promise((resolve) => {
          chrome.storage.local.get(["user_session"], (result) => {
            resolve(result.user_session);
          });
        });

        if (userSession && userSession.sessionToken) {
          const response = await fetch(`${API_BASE_URL}/api/problems`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${userSession.sessionToken}`,
            },
            body: JSON.stringify({ problem: problemToSave }),
          });
          
          const resData = await response.json();
          log("API response:", resData);

          if (resData.success) {
            saveButton.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Saved!</span>
            `;
          } else {
            saveButton.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Saved Locally!</span>
            `;
          }
        }
      } catch (err) {
        console.error("Error saving to web app:", err);
        saveButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Saved Locally!</span>
        `;
      } finally {
        saveButton.classList.add("animate-pulse");
        setTimeout(() => {
          saveButton.classList.remove("animate-pulse");
          showAlreadySaved(problemToSave);
        }, 1200);
      }
    });
  });
});

// View button - open web app
viewButton.addEventListener("click", async () => {
  viewButton.innerHTML = `
    <div class="inline-flex items-center">
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Opening...
    </div>
  `;

  window.chrome.tabs.create({ url: API_BASE_URL });
});

// Remove button - delete from local storage
removeButton.addEventListener("click", () => {
  if (!currentProblemData || !currentUserId) return;

  if (confirm("Are you sure you want to remove this problem from your collection?")) {
    removeButton.innerHTML = `
      <div class="inline-flex items-center">
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Removing...
      </div>
    `;

    chrome.storage.local.get("savedProblemsByUser", (data) => {
      const allSaved = data.savedProblemsByUser || {};
      const savedForMe = allSaved[currentUserId] || [];
      const filtered = savedForMe.filter((p) => p.url !== currentProblemData.url);
      allSaved[currentUserId] = filtered;
      chrome.storage.local.set({ savedProblemsByUser: allSaved }, () => {
        log("Removed from local storage for user:", currentUserId);
        setTimeout(() => {
          showProblemDetected(currentProblemData);
        }, 500);
      });
    });
  }
});

// Set the webapp link
openWebappLink.href = API_BASE_URL;