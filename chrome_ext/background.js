// This script runs in the background to handle events

// Initialize when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log("CodeTracker extension installed")

  // Initialize storage with empty arrays if needed
  chrome.storage.local.get(["savedProblems"], (result) => {
    if (!result.savedProblems) {
      chrome.storage.local.set({ savedProblems: [] })
    }
  })
})

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "isProblemPage") {
    // Don't try to change icon - just log
    console.log("Problem page detected:", request.isProblemPage)
  }

  return true
})

// Optional: Sync with web app if user is logged in
async function syncWithWebApp() {
  try {
    const { savedProblems } = await chrome.storage.local.get("savedProblems")

    if (savedProblems && savedProblems.length > 0) {
      // Send data to backend
      const response = await fetch("http://localhost:3000/api/problems", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ problems: savedProblems }),
      })

      if (response.ok) {
        console.log("Successfully synced with web app")
      }
    }
  } catch (error) {
    console.error("Error syncing with web app:", error)
  }
}
