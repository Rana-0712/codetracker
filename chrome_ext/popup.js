// This script handles the popup UI and interactions

document.addEventListener("DOMContentLoaded", () => {
  const notProblemPageEl = document.getElementById("not-problem-page")
  const problemDetectedEl = document.getElementById("problem-detected")
  const alreadySavedEl = document.getElementById("already-saved")
  const statusIndicator = document.getElementById("status-indicator")
  const saveButton = document.getElementById("save-button")
  const viewButton = document.getElementById("view-button")
  const removeButton = document.getElementById("remove-button")

  let currentProblemData = null
  let currentTabId = null

  // Get the current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    currentTabId = tabs[0].id

    // Check if this is a problem page
    chrome.tabs.sendMessage(currentTabId, { action: "extractProblemData" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        // Not a problem page or content script not loaded
        showNotProblemPage()
        return
      }

      currentProblemData = response
      console.log("Extracted problem data:", currentProblemData)

      // Check if this problem is already saved
      chrome.storage.local.get("savedProblems", (data) => {
        const savedProblems = data.savedProblems || []
        const alreadySaved = savedProblems.some((p) => p.url === currentProblemData.url)

        if (alreadySaved) {
          const savedProblem = savedProblems.find((p) => p.url === currentProblemData.url)
          showAlreadySaved(savedProblem)
        } else {
          showProblemDetected(currentProblemData)
        }
      })
    })
  })

  // Save button click handler
  saveButton.addEventListener("click", () => {
    const topicSelect = document.getElementById("topic-select")
    const notesTextarea = document.getElementById("notes")

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
    }

    console.log("Saving problem:", problemToSave)

    // Show saving state
    saveButton.textContent = "Saving..."
    saveButton.disabled = true

    // Save to Chrome storage first
    chrome.storage.local.get("savedProblems", (data) => {
      const savedProblems = data.savedProblems || []
      savedProblems.push(problemToSave)

      chrome.storage.local.set({ savedProblems: savedProblems }, () => {
        console.log("Saved to local storage")

        // Also save to web app via API
        fetch("https://codetracker-psi.vercel.app/api/problems", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ problem: problemToSave }),
        })
          .then((response) => {
            console.log("API Response status:", response.status)
            return response.json()
          })
          .then((data) => {
            console.log("API Response data:", data)
            if (data.success) {
              console.log("Problem saved to web app successfully")
              saveButton.textContent = "Saved!"
            } else {
              console.log("API returned error:", data.error)
              saveButton.textContent = "Saved Locally!"
            }

            saveButton.classList.remove("bg-blue-600")
            saveButton.classList.add("bg-green-600")

            // Switch to already saved view after a delay
            setTimeout(() => {
              showAlreadySaved(problemToSave)
            }, 1500)
          })
          .catch((error) => {
            console.error("Error saving to web app:", error)

            // Still show success since local save worked
            saveButton.textContent = "Saved Locally!"
            saveButton.classList.remove("bg-blue-600")
            saveButton.classList.add("bg-green-600")

            setTimeout(() => {
              showAlreadySaved(problemToSave)
            }, 1500)
          })
      })
    })
  })

  // View button click handler
  viewButton.addEventListener("click", () => {
    // Open the web app
    chrome.tabs.create({
      url: "https://codetracker-psi.vercel.app",
    })
  })

  // Remove button click handler
  removeButton.addEventListener("click", () => {
    chrome.storage.local.get("savedProblems", (data) => {
      let savedProblems = data.savedProblems || []
      savedProblems = savedProblems.filter((p) => p.url !== currentProblemData.url)

      chrome.storage.local.set({ savedProblems: savedProblems }, () => {
        console.log("Removed from local storage")
        // Show problem detected view
        showProblemDetected(currentProblemData)
      })
    })
  })

  // Helper functions to update the UI
  function showNotProblemPage() {
    notProblemPageEl.classList.remove("hidden")
    problemDetectedEl.classList.add("hidden")
    alreadySavedEl.classList.add("hidden")
    statusIndicator.classList.remove("bg-green-500", "bg-blue-500")
    statusIndicator.classList.add("bg-gray-300")
  }

  function showProblemDetected(problem) {
    notProblemPageEl.classList.add("hidden")
    problemDetectedEl.classList.remove("hidden")
    alreadySavedEl.classList.add("hidden")
    statusIndicator.classList.remove("bg-gray-300", "bg-blue-500")
    statusIndicator.classList.add("bg-green-500")

    // Reset save button
    saveButton.textContent = "Save Problem"
    saveButton.disabled = false
    saveButton.classList.remove("bg-green-600")
    saveButton.classList.add("bg-blue-600")

    // Update UI with problem data
    document.getElementById("problem-title").textContent = problem.title || "Unknown Title"

    const difficultyEl = document.getElementById("problem-difficulty")
    difficultyEl.textContent = problem.difficulty || "Medium"
    if (problem.difficulty === "Easy") {
      difficultyEl.className = "text-sm text-green-600 font-medium"
    } else if (problem.difficulty === "Medium") {
      difficultyEl.className = "text-sm text-orange-600 font-medium"
    } else if (problem.difficulty === "Hard") {
      difficultyEl.className = "text-sm text-red-600 font-medium"
    } else {
      difficultyEl.className = "text-sm text-gray-600 font-medium"
    }

    // Update topics
    const topicsContainer = document.getElementById("problem-topics")
    topicsContainer.innerHTML = ""

    if (problem.topics && problem.topics.length > 0) {
      problem.topics.forEach((topic) => {
        const topicSpan = document.createElement("span")
        topicSpan.className = "text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5"
        topicSpan.textContent = topic
        topicsContainer.appendChild(topicSpan)
      })
    } else {
      const noTopicsSpan = document.createElement("span")
      noTopicsSpan.className = "text-xs text-gray-500"
      noTopicsSpan.textContent = "No topics detected"
      topicsContainer.appendChild(noTopicsSpan)
    }

    // Pre-select topic based on detected topics
    const topicSelect = document.getElementById("topic-select")
    topicSelect.value = "dynamic-programming" // Default

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

    console.log("Selected topic:", topicSelect.value)
  }

  function showAlreadySaved(problem) {
    notProblemPageEl.classList.add("hidden")
    problemDetectedEl.classList.add("hidden")
    alreadySavedEl.classList.remove("hidden")
    statusIndicator.classList.remove("bg-gray-300", "bg-green-500")
    statusIndicator.classList.add("bg-blue-500")

    // Update UI with saved problem data
    document.getElementById("saved-title").textContent = problem.title || "Unknown Title"

    // Format topic name for display
    let topicDisplay = problem.topic || "dynamic-programming"
    topicDisplay = topicDisplay
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")

    document.getElementById("saved-topic").textContent = topicDisplay
  }
})
