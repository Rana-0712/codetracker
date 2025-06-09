// popup.js
// ========
// Handles authentication (Supabase Auth) and problem‐detection/save logic.
// Runs as an ES module; popup.html already loaded vendor/supabase.js, so `supabase` is global.

const { createClient } = window.supabase // from UMD build

// ─── HELPER: Log to popup's console (for debugging) ─────────────────────────────────────
const log = (...args) => {
  console.log("popup.js:", ...args)
}

// ─── 1) READ SUPABASE KEYS FROM chrome.storage.local ────────────────────────────────────
async function getEnv() {
  return new Promise((resolve) => {
    window.chrome.storage.local.get(
      ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
      (items) => {
        const url = items.SUPABASE_URL || NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = items.SUPABASE_ANON_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY;
        resolve({ url, anonKey });
      }
    );
  });
}

// ─── 2) INITIALIZE SUPABASE CLIENT FOR EXTENSION ───────────────────────────────────────
let supabaseExt = null
async function initSupabaseClient() {
  const { url, anonKey } = await getEnv();
  if (!url || !anonKey) {
    log("ERROR: Missing Supabase URL or anon key (storage + config fallback)");
    return null;
  }
  if (!supabaseExt) {
    supabaseExt = createClient(url, anonKey);
    log("Supabase client initialized in popup", { url, anonKey: anonKey.slice(0,8)+"…" });
  }
  return supabaseExt;
}

// ─── HELPER: Return the current logged‐in user (or null) ────────────────────────────────
async function getCurrentUser() {
  if (!supabaseExt) return null
  const {
    data: { user },
    error,
  } = await supabaseExt.auth.getUser()
  if (error) {
    console.error("getCurrentUser error:", error)
    return null
  }
  return user
}

// ─── DEBUG: Enhanced problem detection with retry logic ─────────────────────────────────
async function checkProblemWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const tabs = await new Promise((resolve) => {
        window.chrome.tabs.query({ active: true, currentWindow: true }, resolve)
      })

      if (tabs && tabs[0]) {
        currentTabId = tabs[0].id
        const response = await new Promise((resolve) => {
          window.chrome.tabs.sendMessage(currentTabId, { action: "extractProblemData" }, (response) => {
            if (window.chrome.runtime.lastError) {
              console.log("Retry", i + 1, "- Runtime error:", window.chrome.runtime.lastError.message)
              resolve(null)
            } else {
              resolve(response)
            }
          })
        })

        if (response) {
          return response
        }
      }
    } catch (error) {
      console.log("Retry", i + 1, "- Error:", error)
    }

    // Wait before retry
    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
  return null
}

// ─── HELPER: Ask Supabase if this user already saved a problem with this URL (server‐side) ─
async function isSavedServerSide(url) {
  const user = await getCurrentUser()
  if (!user) {
    console.error("isSavedServerSide: no user in Supabase client")
    return false
  }

  // Query the `problems` table filtering by (user_id == currentUser.id AND url == url)
  const { data: existing, error: queryError } = await supabaseExt
    .from("problems")
    .select("id, topic")
    .eq("url", url)
    .eq("user_id", user.id)
    .maybeSingle()

  if (queryError) {
    console.error("isSavedServerSide: unexpected query error", queryError)
    return false
  }
  return !!existing
}

// ─── 3) DOM ELEMENT REFERENCES ────────────────────────────────────────────────────────
const loadingViewEl = document.getElementById("loading-view")
const authContainerEl = document.getElementById("auth-container")
const signinFormEl = document.getElementById("signin-form")
const signedInViewEl = document.getElementById("signed-in-view")
const userEmailTextEl = document.getElementById("user-email-text")
const loginButton = document.getElementById("login-button")
const logoutButton = document.getElementById("logout-button")
const loginErrorEl = document.getElementById("login-error")
const headerActions = document.getElementById("header-actions")

const notProblemPageEl = document.getElementById("not-problem-page")
const problemDetectedEl = document.getElementById("problem-detected")
const alreadySavedEl = document.getElementById("already-saved")
const statusIndicator = document.getElementById("status-indicator")

const saveButton = document.getElementById("save-button")
const viewButton = document.getElementById("view-button")
const removeButton = document.getElementById("remove-button")

const openWebappLink = document.getElementById("open-webapp-link")

const problemTitleEl = document.getElementById("problem-title")
const difficultyEl = document.getElementById("problem-difficulty")
const topicsContainer = document.getElementById("problem-topics")
const topicSelect = document.getElementById("topic-select")
const notesTextarea = document.getElementById("notes")
const savedTitleEl = document.getElementById("saved-title")
const savedTopicEl = document.getElementById("saved-topic")

// ─── 4) STATE ─────────────────────────────────────────────────────────────────────────
let currentProblemData = null
let currentUserId = null
let currentTabId = null

// ─── 5) SHOW/HIDE FUNCTIONS ────────────────────────────────────────────────────────────
function showLoading() {
  loadingViewEl.classList.remove("hidden")
  authContainerEl.classList.add("hidden")
  headerActions.classList.add("hidden")
  notProblemPageEl.classList.add("hidden")
  problemDetectedEl.classList.add("hidden")
  alreadySavedEl.classList.add("hidden")
  statusIndicator.classList.add("hidden")
}

function showSignInForm() {
  loadingViewEl.classList.add("hidden")
  authContainerEl.classList.remove("hidden")
  signinFormEl.classList.remove("hidden")
  signedInViewEl.classList.add("hidden")
  headerActions.classList.add("hidden")

  notProblemPageEl.classList.add("hidden")
  problemDetectedEl.classList.add("hidden")
  alreadySavedEl.classList.add("hidden")
  statusIndicator.classList.add("hidden")
}

function showSignedInSkeleton(email) {
  loadingViewEl.classList.add("hidden")
  authContainerEl.classList.remove("hidden")
  signinFormEl.classList.add("hidden")
  signedInViewEl.classList.remove("hidden")
  headerActions.classList.remove("hidden")
  userEmailTextEl.textContent = `Signed in as ${email}`

  notProblemPageEl.classList.add("hidden")
  problemDetectedEl.classList.add("hidden")
  alreadySavedEl.classList.add("hidden")
  statusIndicator.classList.add("hidden")
}

function showProblemDetected(problem) {
  loadingViewEl.classList.add("hidden")
  authContainerEl.classList.remove("hidden")
  signinFormEl.classList.add("hidden")
  signedInViewEl.classList.remove("hidden")
  headerActions.classList.remove("hidden")

  notProblemPageEl.classList.add("hidden")
  problemDetectedEl.classList.remove("hidden")
  alreadySavedEl.classList.add("hidden")

  // Show and animate status indicator
  statusIndicator.classList.remove("hidden", "bg-gray-300", "bg-indigo-500")
  statusIndicator.classList.add("bg-emerald-500", "pulse")

  problemTitleEl.textContent = problem.title || "Unknown Title"
  difficultyEl.textContent = problem.difficulty || "Medium"

  // Enhanced difficulty display with icon
  if (problem.difficulty === "Easy") {
    difficultyEl.className = "text-sm inline-flex items-center space-x-1"
    difficultyEl.innerHTML = `
      <span class="inline-block w-2 h-2 rounded-full bg-green-500"></span>
      <span class="text-green-600 font-medium">Easy</span>
    `
  } else if (problem.difficulty === "Medium") {
    difficultyEl.className = "text-sm inline-flex items-center space-x-1"
    difficultyEl.innerHTML = `
      <span class="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
      <span class="text-orange-600 font-medium">Medium</span>
    `
  } else {
    difficultyEl.className = "text-sm inline-flex items-center space-x-1"
    difficultyEl.innerHTML = `
      <span class="inline-block w-2 h-2 rounded-full bg-red-500"></span>
      <span class="text-red-600 font-medium">Hard</span>
    `
  }

  topicsContainer.innerHTML = ""
  if (problem.topics && problem.topics.length > 0) {
    problem.topics.forEach((topic) => {
      const span = document.createElement("span")
      span.className = "text-xs bg-emerald-100 text-emerald-800 rounded-full px-2.5 py-1"
      span.textContent = topic
      // Force styling to ensure visibility
      span.style.display = "inline-flex"
      span.style.visibility = "visible"
      span.style.opacity = "1"
      span.style.backgroundColor = "#d1fae5"
      span.style.color = "#065f46"
      span.style.border = "1px solid #a7f3d0"
      span.style.borderRadius = "9999px"
      span.style.padding = "0.25rem 0.75rem"
      span.style.margin = "0.125rem"
      span.style.fontSize = "0.75rem"
      span.style.fontWeight = "500"
      topicsContainer.appendChild(span)
    })
  } else {
    const noTopicsSpan = document.createElement("span")
    noTopicsSpan.className = "text-xs text-gray-500"
    noTopicsSpan.textContent = "No topics detected"
    // Force styling for the "No topics detected" message
    noTopicsSpan.style.display = "inline-flex"
    noTopicsSpan.style.visibility = "visible"
    noTopicsSpan.style.opacity = "1"
    topicsContainer.appendChild(noTopicsSpan)
  }

  // Auto‐select a topic in the dropdown
  topicSelect.value = "dynamic-programming"
  if (problem.topics && problem.topics.length > 0) {
    const lowerTopics = problem.topics.map((t) => t.toLowerCase())
    if (lowerTopics.some((t) => t.includes("dynamic") || t.includes("dp"))) {
      topicSelect.value = "dynamic-programming"
    } else if (lowerTopics.some((t) => t.includes("array"))) {
      topicSelect.value = "arrays"
    } else if (lowerTopics.some((t) => t.includes("string"))) {
      topicSelect.value = "strings"
    } else if (lowerTopics.some((t) => t.includes("tree") || t.includes("bst"))) {
      topicSelect.value = "trees"
    } else if (lowerTopics.some((t) => t.includes("graph"))) {
      topicSelect.value = "graphs"
    } else if (lowerTopics.some((t) => t.includes("linked") || t.includes("list"))) {
      topicSelect.value = "linked-lists"
    } else if (lowerTopics.some((t) => t.includes("stack") || t.includes("queue"))) {
      topicSelect.value = "stacks-queues"
    } else if (lowerTopics.some((t) => t.includes("binary") || t.includes("search"))) {
      topicSelect.value = "binary-search"
    } else if (lowerTopics.some((t) => t.includes("greedy"))) {
      topicSelect.value = "greedy"
    } else if (lowerTopics.some((t) => t.includes("backtrack"))) {
      topicSelect.value = "backtracking"
    }
  }

  // FORCE the save button to be visible with explicit styling
  saveButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
    <span>Save Problem</span>
  `
  saveButton.disabled = false
  saveButton.style.display = "flex"
  saveButton.style.visibility = "visible"
  saveButton.style.opacity = "1"
  saveButton.style.background = "linear-gradient(to right, #059669, #374151)"
  saveButton.style.color = "white"
  saveButton.style.minHeight = "44px"
  saveButton.style.fontWeight = "600"

  // Remove any conflicting classes
  saveButton.classList.remove("bg-green-600", "from-green-600", "to-green-500", "hidden")
  saveButton.classList.add(
    "w-full",
    "text-white",
    "font-semibold",
    "py-3",
    "px-4",
    "rounded-lg",
    "transition-all",
    "flex",
    "items-center",
    "justify-center",
    "space-x-2",
    "btn-hover-effect",
  )

  console.log("Save button should now be visible:", saveButton)
}

function showAlreadySaved(problem) {
  loadingViewEl.classList.add("hidden")
  authContainerEl.classList.remove("hidden")
  signinFormEl.classList.add("hidden")
  signedInViewEl.classList.remove("hidden")
  headerActions.classList.remove("hidden")

  notProblemPageEl.classList.add("hidden")
  problemDetectedEl.classList.add("hidden")
  alreadySavedEl.classList.remove("hidden")

  // Show and animate status indicator
  statusIndicator.classList.remove("hidden", "bg-gray-300", "bg-green-500")
  statusIndicator.classList.add("bg-emerald-500", "pulse")

  savedTitleEl.textContent = problem.title || "Unknown Title"
  let topicDisplay = problem.topic || "dynamic-programming"
  topicDisplay = topicDisplay
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
  savedTopicEl.textContent = topicDisplay

  // Force styling to ensure saved topic visibility
  savedTopicEl.style.display = "inline-flex"
  savedTopicEl.style.visibility = "visible"
  savedTopicEl.style.opacity = "1"
  savedTopicEl.style.backgroundColor = "#d1fae5"
  savedTopicEl.style.color = "#065f46"
  savedTopicEl.style.border = "1px solid #a7f3d0"
  savedTopicEl.style.borderRadius = "9999px"
  savedTopicEl.style.padding = "0.25rem 0.75rem"
  savedTopicEl.style.margin = "0.125rem"
  savedTopicEl.style.fontWeight = "500"

  // FORCE the view button to be visible with explicit styling
  viewButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
    <span>View</span>
  `
  viewButton.disabled = false
  viewButton.style.display = "flex"
  viewButton.style.visibility = "visible"
  viewButton.style.opacity = "1"
  viewButton.style.background = "linear-gradient(to right, #059669, #374151)"
  viewButton.style.color = "white"
  viewButton.style.minHeight = "44px"
  viewButton.style.fontWeight = "600"

  // Remove any conflicting classes
  viewButton.classList.remove("hidden")
  viewButton.classList.add(
    "flex-1",
    "text-white",
    "font-medium",
    "py-2.5",
    "px-4",
    "rounded-lg",
    "transition-all",
    "flex",
    "items-center",
    "justify-center",
    "space-x-2",
    "btn-hover-effect",
  )

  console.log("View button should now be visible:", viewButton)
}

function showNotProblemPage() {
  loadingViewEl.classList.add("hidden")
  authContainerEl.classList.remove("hidden")
  signinFormEl.classList.add("hidden")
  signedInViewEl.classList.remove("hidden")
  headerActions.classList.remove("hidden")

  notProblemPageEl.classList.remove("hidden")
  problemDetectedEl.classList.add("hidden")
  alreadySavedEl.classList.add("hidden")
  statusIndicator.classList.add("hidden")
}

// ─── 6) ON POPUP LOAD: INITIALIZE & DRIVE FLOW ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  showLoading()

  await initSupabaseClient()
  if (!supabaseExt) {
    log("ERROR: could not initialize Supabase client in popup")
    setTimeout(() => showSignInForm(), 800) // Slightly longer delay for better UX
    return
  }

  // 6a) Try to see if supabaseExt already has a session in‐memory (from a previous login)
  const {
    data: { session: existingSession },
  } = await supabaseExt.auth.getSession()

  if (existingSession && existingSession.access_token) {
    // Supabase client already has a valid session
    const user = await getCurrentUser()
    if (user) {
      currentUserId = user.id
      showSignedInSkeleton(user.email)
      await checkProblemAndRender()
      return
    }
  }

  // 6b) Otherwise, try to load supabase_session from chrome.storage.local
  window.chrome.storage.local.get(["supabase_session"], async ({ supabase_session }) => {
    if (supabase_session && supabase_session.access_token) {
      // Explicitly set the session so in‐memory client sees it
      await supabaseExt.auth.setSession({
        access_token: supabase_session.access_token,
        refresh_token: supabase_session.refresh_token,
      })

      const user = await getCurrentUser()
      if (user) {
        currentUserId = user.id
        showSignedInSkeleton(user.email)
        await checkProblemAndRender()
      } else {
        showSignInForm()
      }
    } else {
      // Add a slight delay for smoother transition
      setTimeout(() => showSignInForm(), 800)
    }
  })
})

// ─── 7) CHECK PROBLEM & RENDER ───────────────────────────────────────────────────────────
async function checkProblemAndRender() {
  try {
    const response = await checkProblemWithRetry()

    if (!response) {
      showNotProblemPage()
      return
    }

    currentProblemData = response

    // 7a) LOCAL CHECK – only for the currently signed‐in user:
    const userId = currentUserId
    window.chrome.storage.local.get("savedProblemsByUser", async (data) => {
      const allSaved = data.savedProblemsByUser || {}
      const savedForMe = allSaved[userId] || []
      const locallySaved = savedForMe.find((p) => p.url === currentProblemData.url)

      if (locallySaved) {
        showAlreadySaved(locallySaved)
      } else {
        // 7b) SERVER‐SIDE CHECK – call Supabase
        let serverSaved = false
        try {
          serverSaved = await isSavedServerSide(currentProblemData.url)
        } catch (err) {
          console.error("checkProblemAndRender: Supabase error", err)
          serverSaved = false
        }

        if (serverSaved) {
          // If it exists on the server for _my_ user, show Already Saved
          showAlreadySaved({
            title: currentProblemData.title,
            topic: currentProblemData.topic || "dynamic-programming",
            url: currentProblemData.url,
          })
        } else {
          // Not found anywhere → let user save it
          showProblemDetected(currentProblemData)
        }
      }
    })
  } catch (error) {
    console.error("checkProblemAndRender error:", error)
    showNotProblemPage()
  }
}

// ─── 8) HANDLE SIGN‐IN ─────────────────────────────────────────────────────────────────
loginButton.addEventListener("click", async () => {
  const emailInput = document.getElementById("email")
  const passwordInput = document.getElementById("password")
  const email = emailInput.value.trim()
  const password = passwordInput.value

  loginErrorEl.classList.add("hidden")
  loginButton.disabled = true

  // Force button styling to ensure visibility
  loginButton.style.display = "flex"
  loginButton.style.visibility = "visible"
  loginButton.style.opacity = "1"
  loginButton.style.background = "linear-gradient(to right, #059669, #374151)"
  loginButton.style.color = "white"
  loginButton.style.minHeight = "44px"
  loginButton.style.fontWeight = "600"
  loginButton.style.width = "100%"
  loginButton.style.justifyContent = "center"
  loginButton.style.alignItems = "center"

  loginButton.innerHTML = `
    <div class="inline-flex items-center">
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Signing In...
    </div>
  `

  const { data, error } = await supabaseExt.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    loginErrorEl.textContent = error.message
    loginErrorEl.classList.remove("hidden")
    loginButton.innerHTML = `Sign In`
    loginButton.disabled = false

    // Force button styling to ensure visibility
    loginButton.style.display = "flex"
    loginButton.style.visibility = "visible"
    loginButton.style.opacity = "1"
    loginButton.style.background = "linear-gradient(to right, #059669, #374151)"
    loginButton.style.color = "white"
    loginButton.style.minHeight = "44px"
    loginButton.style.fontWeight = "600"
    loginButton.style.width = "100%"
    loginButton.style.justifyContent = "center"
    loginButton.style.alignItems = "center"

    return
  }

  // 8a) We have a new session for User X
  const session = data.session
  const user = data.user
  currentUserId = user.id

  // 8b) Store it in chrome.storage.local
  window.chrome.storage.local.set(
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
      })

      showSignedInSkeleton(user.email)
      await checkProblemAndRender()
    },
  )
})

// ─── 9) HANDLE SIGN‐OUT ─────────────────────────────────────────────────────────────────
logoutButton.addEventListener("click", async () => {
  // Show loading state on button
  logoutButton.innerHTML = `
    <div class="inline-flex items-center">
      <svg class="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Signing Out...
    </div>
  `

  // 9a) Supabase sign out
  try {
    await supabaseExt.auth.signOut()
  } catch (e) {
    console.warn("popup.js: supabaseExt.auth.signOut() threw:", e)
  }
  // 9b) Also clear any leftover in‐memory session
  await supabaseExt.auth.setSession({ access_token: "", refresh_token: "" })

  // 9c) Remove session and user‐specific saved problems from storage
  window.chrome.storage.local.remove(["supabase_session"], () => {
    // We do NOT remove savedProblemsByUser completely,
    // because we want to preserve other users' data. Just clear currentUserId:
    currentUserId = null

    showSignInForm()
    notProblemPageEl.classList.add("hidden")
    problemDetectedEl.classList.add("hidden")
    alreadySavedEl.classList.add("hidden")
    statusIndicator.classList.add("hidden")
  })
})

// ─── 10) SAVE PROBLEM ───────────────────────────────────────────────────────────────────
saveButton.addEventListener("click", async () => {
  if (!currentProblemData || !currentUserId) return
  saveButton.disabled = true
  saveButton.innerHTML = `
    <div class="inline-flex items-center">
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Saving...
    </div>
  `

  const user = await getCurrentUser()
  if (!user) {
    console.error("popup.js: Could not fetch user for saving")
    alert("Session expired. Please sign in again.")
    saveButton.disabled = false
    saveButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
      </svg>
      <span>Save Problem</span>
    `
    return
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
  }

  // 10a) Store it locally, under this user's bucket:
  window.chrome.storage.local.get("savedProblemsByUser", async (data) => {
    const allSaved = data.savedProblemsByUser || {}
    const savedForMe = allSaved[user.id] || []
    savedForMe.push(problemToSave)
    allSaved[user.id] = savedForMe

    window.chrome.storage.local.set({ savedProblemsByUser: allSaved }, async () => {
      log("Saved locally in extension for user:", user.email)
      console.log("Problem to save locally:", problemToSave)

      // 10b) THEN attempt to save on the server
      try {
        // Make sure in‐memory session is up‐to‐date
        const {
          data: { session },
          error: getSessionError,
        } = await supabaseExt.auth.getSession()

        if (getSessionError || !session) {
          console.error("popup.js: Could not fetch session for API call:", getSessionError)
          alert("Session expired. Please sign in again.")
          return
        }

        // POST to your web app's /api/problems
        const response = await fetch("https://codetracker-psi.vercel.app/api/problems", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ problem: problemToSave }),
        })
        const resData = await response.json()
        log("API response:", resData)

        if (resData.success) {
          saveButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Saved!</span>
          `
        } else {
          saveButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Saved Locally!</span>
          `
        }
      } catch (err) {
        console.error("Error saving to web app:", err)
        saveButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Saved Locally!</span>
        `
      } finally {
        saveButton.classList.remove("from-emerald-600", "to-gray-700")
        saveButton.classList.add("from-green-600", "to-green-500")

        // Add success animation
        saveButton.classList.add("animate-pulse")

        setTimeout(() => {
          saveButton.classList.remove("animate-pulse")
          showAlreadySaved(problemToSave)
        }, 1200)
      }
    })
  })
})

// ─── 11) VIEW BUTTON → Open Web App (no token in URL) ─────────────────────────────────
viewButton.addEventListener("click", async () => {
  // Show loading state
  viewButton.innerHTML = `
    <div class="inline-flex items-center">
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Opening...
    </div>
  `

  // Just open the homepage; we no longer pass the token in the URL
  window.chrome.tabs.create({ url: "https://codetracker-psi.vercel.app" })
})

// ─── 12) REMOVE BUTTON → Delete from Local Storage (current user only) ────────────────
removeButton.addEventListener("click", () => {
  if (!currentProblemData || !currentUserId) return

  // Show confirmation dialog with modern styling
  if (confirm("Are you sure you want to remove this problem from your collection?")) {
    // Show loading state
    removeButton.innerHTML = `
      <div class="inline-flex items-center">
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Removing...
      </div>
    `

    window.chrome.storage.local.get("savedProblemsByUser", (data) => {
      const allSaved = data.savedProblemsByUser || {}
      const savedForMe = allSaved[currentUserId] || []
      // Remove any entry whose url matches the current problem's URL
      const filtered = savedForMe.filter((p) => p.url !== currentProblemData.url)
      allSaved[currentUserId] = filtered
      window.chrome.storage.local.set({ savedProblemsByUser: allSaved }, () => {
        log("Removed from local storage for user:", currentUserId)

        // Add a small delay for better UX
        setTimeout(() => {
          showProblemDetected(currentProblemData)
        }, 500)
      })
    })
  }
})

// Add event listeners for input focus effects
document.querySelectorAll("input, textarea, select").forEach((element) => {
  element.addEventListener("focus", () => {
    element.parentElement.classList.add("ring-2", "ring-emerald-100", "ring-opacity-50")
  })

  element.addEventListener("blur", () => {
    element.parentElement.classList.remove("ring-2", "ring-emerald-100", "ring-opacity-50")
  })
})

// Set the webapp link
openWebappLink.href = "https://codetracker-psi.vercel.app"
