// content‐script.js

// ─── 1) Override history.pushState / replaceState to detect client‐side navigation ─────────────────
(function() {
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;

  history.pushState = function (...args) {
    originalPush.apply(this, args);
    onUrlChange();
  };

  history.replaceState = function (...args) {
    originalReplace.apply(this, args);
    onUrlChange();
  };

  window.addEventListener("popstate", () => {
    onUrlChange();
  });
})();

// ─── 2) Callback to re‐run extractor after a short delay ─────────────────────────────────────────
function onUrlChange() {
  setTimeout(() => {
    const data = extractProblemData();
    console.log("Re‐extracted after URL change:", data);
    // If needed, notify other parts of your extension:
    // chrome.runtime.sendMessage({ action: "newProblemData", payload: data });
  }, 200);
}

// ─── 3) MutationObserver helper to detect when a specific selector appears ────────────────────────
function watchForProblemContainer(selector, onFound) {
  const existing = document.querySelector(selector);
  if (existing) {
    onFound(existing);
    return;
  }
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const el = node.matches(selector) ? node : node.querySelector(selector);
        if (el) {
          observer.disconnect();
          onFound(el);
          return;
        }
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

// ─── 4) Start watching for the GFG problem‐content div (example) ─────────────────────────────────
watchForProblemContainer("div[class*='problems_problem_content']", () => {
  const data = extractProblemData();
  console.log("Re‐extracted when GFG problem appeared:", data);
  // chrome.runtime.sendMessage({ action: "newProblemData", payload: data });
});

// ────────────────────────────────────────────────────────────────────────────────
// Helper function to determine which platform we're on
function detectPlatform() {
  const url = window.location.href;
  if (url.includes("leetcode.com")) return "leetcode";
  if (url.includes("geeksforgeeks.org")) return "geeksforgeeks";
  if (url.includes("interviewbit.com")) return "interviewbit";
  if (url.includes("codechef.com")) return "codechef";
  if (url.includes("codeforces.com")) return "codeforces";
  return null;
}

// Extract problem data based on the platform
function extractProblemData() {
  const platform = detectPlatform();
  const data = {
    title: "",
    difficulty: "",
    url: window.location.href,
    platform: platform,
    topics: [],
    companies: [],
    description: "",
  };

  console.log("Extracting data for platform:", platform);

  switch (platform) {
    case "leetcode":
      extractLeetCodeData(data);
      break;
    case "geeksforgeeks":
      extractGeeksForGeeksData(data);
      break;
    case "interviewbit":
      extractInterviewBitData(data);
      break;
    case "codechef":
      extractCodeChefData(data);
      break;
    case "codeforces":
      extractCodeforcesData(data);
      break;
    default:
      // Fallback extraction
      extractGenericData(data);
  }

  console.log("Extracted data:", data);
  return data;
}

// Generic extraction for unknown platforms
function extractGenericData(data) {
  // Try to find title in common selectors
  const titleSelectors = ["h1", ".title", ".problem-title", "[data-cy='question-title']"];
  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      data.title = element.textContent.trim();
      break;
    }
  }

  // If no title found, use page title
  if (!data.title) {
    data.title = document.title.split(" - ")[0] || "Unknown Problem";
  }

  // Default difficulty
  data.difficulty = "Medium";
}

// ────────────────────────────────────────────────────────────────────────────────
// LeetCode-specific extraction
function extractLeetCodeData(data) {
  // 1) Title - try multiple selectors (old + new design)
  const titleSelectors = [
    '[data-cy="question-title"]',
    ".css-v3d350",         // New LeetCode design (might vary)
    ".question-title h3",
    "h1"
  ];
  for (const selector of titleSelectors) {
    const titleElement = document.querySelector(selector);
    if (titleElement && titleElement.textContent.trim()) {
      data.title = titleElement.textContent.trim();
      break;
    }
  }

  // 2) Difficulty - multiple possible selectors
  const difficultySelectors = [
    '[class*="text-difficulty-easy"]',
    '[class*="text-difficulty-medium"]',
    '[class*="text-difficulty-hard"]',
    '[class*="text-green"]',   // Easy
    '[class*="text-yellow"]',  // Medium
    '[class*="text-red"]',     // Hard
    '[class*="text-orange"]',  // Medium alternative
    ".css-10o4wqw",
    ".difficulty"
  ];
  for (const selector of difficultySelectors) {
    const difficultyElement = document.querySelector(selector);
    if (difficultyElement) {
      const text = difficultyElement.textContent.trim();
      if (text.includes("Easy")) data.difficulty = "Easy";
      else if (text.includes("Medium")) data.difficulty = "Medium";
      else if (text.includes("Hard")) data.difficulty = "Hard";
      break;
    }
  }

  // 3) Topics/Tags
  //    We add 'a[href^="/tag/"]' to catch <a href="/tag/array/">Array</a> etc.
  const topicSelectors = [
    'a[data-act*="topic-list-click"]',  // new React design
    ".css-1v6v87n",                      // new tag element class
    ".topic-tag",
    ".tag",
    ".css-1hky5w4 a",
    "a[text-caption]",
    'a[href^="/tag/"]'                   // <a href="/tag/array/">Array</a> etc.
  ];
  for (const selector of topicSelectors) {
    const topicElements = document.querySelectorAll(selector);
    if (topicElements.length > 0) {
      data.topics = Array.from(topicElements)
        .map(el => el.textContent.trim())
        .filter(t => t.length > 0);
      break;
    }
  }

  // 4) Description
  //    LeetCode’s new layout wraps it in a <div class="elfjs" data-track-load="description_content">…</div>
  //    So we add 'div[data-track-load="description_content"]' and also check '.elfjs' as fallback.
  const descriptionSelectors = [
    '[data-cy="question-content"]',
    ".question-content",
    ".css-1uqhpru",                       // old new-design class
    ".content__u3I1.question-content__JfgR",
    'div[data-track-load="description_content"]',
    ".elfjs"
  ];
  for (const selector of descriptionSelectors) {
    const descriptionElement = document.querySelector(selector);
    if (descriptionElement) {
      data.description = descriptionElement.textContent.trim().substring(0, 500);
      break;
    }
  }

  // 5) Companies (if available)
  const companyElements = document.querySelectorAll(".company-tag, .css-1et4wmp");
  if (companyElements.length > 0) {
    data.companies = Array.from(companyElements)
      .map(el => el.textContent.trim())
      .filter(c => c.length > 0);
  }

  // Fallback if title or difficulty still missing
  if (!data.title) {
    data.title = document.title.split(" - ")[0] || "LeetCode Problem";
  }
  if (!data.difficulty) {
    data.difficulty = "Medium";
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// GeeksForGeeks-specific extraction (updated)
function extractGeeksForGeeksData(data) {
  // 1) Title
  const titleSelectors = [
    ".problem-statement h1",
    ".problemTitle",
    "h1",
    ".header-title"
  ];
  for (const selector of titleSelectors) {
    const titleElement = document.querySelector(selector);
    if (titleElement && titleElement.textContent.trim()) {
      data.title = titleElement.textContent.trim();
      break;
    }
  }

  // 2) Difficulty
  // Look for the container whose class contains "problems_header_description"
  const headerDesc = document.querySelector("div[class*='problems_header_description']");
  if (headerDesc) {
    // Within that container, the first <strong> will hold "Easy", "Medium", or "Hard"
    const diffStrong = headerDesc.querySelector("span strong");
    if (diffStrong) {
      data.difficulty = diffStrong.textContent.trim();
    }
  }
  // Fallback if difficulty not found
  if (!data.difficulty) {
    data.difficulty = "Medium";
  }

  // 3) Topics Only (not companies)
  //   Find the accordion section that contains "<strong>Topic Tags</strong>"
  const accordionSections = document.querySelectorAll("div.problems_accordion_tags__JJ2DX");
  for (const section of accordionSections) {
    const strongTag = section.querySelector("strong");
    if (strongTag && strongTag.textContent.includes("Topic Tags")) {
      const labelsDiv = section.querySelector("div.ui.labels");
      if (labelsDiv) {
        const topicElements = labelsDiv.querySelectorAll("a.ui.label.problems_tag_label__A4Ism");
        data.topics = Array.from(topicElements)
          .map(el => el.textContent.trim())
          .filter(t => t.length > 0);
      }
      break; // stop after finding the "Topic Tags" section
    }
  }

  // 4) Description
  // The problem statement is inside an element whose class contains "problems_problem_content"
  const descContainer = document.querySelector("div[class*='problems_problem_content']");
  if (descContainer) {
    data.description = descContainer.textContent.trim().substring(0, 500);
  }

  // Fallbacks
  if (!data.title) {
    data.title = document.title.split(" | ")[0] || "GeeksForGeeks Problem";
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// InterviewBit-specific extraction
function extractInterviewBitData(data) {
  // 1) Title
  const titleElement = document.querySelector(".problem-title, h1");
  if (titleElement) {
    data.title = titleElement.textContent.trim();
  }

  // 2) Difficulty
  const diffElement = document.querySelector(".p-difficulty-level");
  if (diffElement) {
    const classList = Array.from(diffElement.classList);
    if (classList.includes("p-difficulty-level--easy")) {
      data.difficulty = "Easy";
    } else if (classList.includes("p-difficulty-level--medium")) {
      data.difficulty = "Medium";
    } else if (classList.includes("p-difficulty-level--hard")) {
      data.difficulty = "Hard";
    } else {
      // Fallback to reading textContent if class naming changes
      const txt = diffElement.textContent.trim();
      if (txt.includes("Easy")) data.difficulty = "Easy";
      else if (txt.includes("Medium")) data.difficulty = "Medium";
      else if (txt.includes("Hard")) data.difficulty = "Hard";
    }
  }
  // Final fallback
  if (!data.difficulty) {
    data.difficulty = "Medium";
  }

  // 3) Topics/Tags
  const breadcrumbDiv = document.querySelector("div.ib-breadcrumb");
  if (breadcrumbDiv) {
    const topicAnchors = breadcrumbDiv.querySelectorAll("a.ib-breadcrumb__item--link");
    data.topics = Array.from(topicAnchors)
      .map(a => a.textContent.trim())
      .filter(t => t.length > 0);
  }

  // 4) Description
  const descriptionElement = document.querySelector(".p-html-content__container");
  if (descriptionElement) {
    data.description = descriptionElement.textContent.trim().substring(0, 500);
  }

  // Fallbacks
  if (!data.title) {
    data.title = document.title.split(" | ")[0] || "InterviewBit Problem";
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// CodeChef-specific extraction
function extractCodeChefData(data) {
  // Title
  const titleElement = document.querySelector("#problem-statement h3");
  if (titleElement) {
    data.title = titleElement.textContent.trim();
  }

  // Difficulty – infer from problem code
  const problemCode = window.location.pathname.split("/").pop();
  if (problemCode) {
    if (problemCode.includes("LTIME") || problemCode.includes("COOK")) {
      data.difficulty = "Medium";
    } else if (problemCode.includes("EASY")) {
      data.difficulty = "Easy";
    } else {
      data.difficulty = "Medium";
    }
  }
  if (!data.difficulty) {
    data.difficulty = "Medium";
  }

  // Topics/Tags
  const topicSelectors = [
    ".problem-tags a",
    ".problem-tag",
    ".tags a"
  ];
  for (const selector of topicSelectors) {
    const tagElements = document.querySelectorAll(selector);
    if (tagElements.length > 0) {
      data.topics = Array.from(tagElements)
        .map(el => el.textContent.trim())
        .filter(t => t.length > 0);
      break;
    }
  }

  // Description
  const descriptionElement = document.querySelector(".problem-statement");
  if (descriptionElement) {
    data.description = descriptionElement.textContent.trim().substring(0, 500);
  }

  // Fallbacks
  if (!data.title) {
    data.title = document.title.split(" | ")[0] || "CodeChef Problem";
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// Codeforces-specific extraction
function extractCodeforcesData(data) {
  // Title
  const titleElement = document.querySelector(".title, .problem-statement .title");
  if (titleElement) {
    data.title = titleElement.textContent.trim();
  }

  // Difficulty based on rating (e.g., “*1200”)
  const ratingText = document.body.textContent;
  const ratingMatch = ratingText.match(/\*(\d+)/);
  if (ratingMatch) {
    const rating = Number.parseInt(ratingMatch[1], 10);
    if (rating < 1300) data.difficulty = "Easy";
    else if (rating < 1800) data.difficulty = "Medium";
    else data.difficulty = "Hard";
  } else {
    data.difficulty = "Medium";
  }

  // Topics/Tags
  const topicSelectors = [
    ".tag-box__type",
    ".roundbox .tag-box a"
  ];
  for (const selector of topicSelectors) {
    const tagElements = document.querySelectorAll(selector);
    if (tagElements.length > 0) {
      data.topics = Array.from(tagElements)
        .map(el => el.textContent.trim())
        .filter(t => t.length > 0);
      break;
    }
  }

  // Description
  const descriptionElement = document.querySelector(".problem-statement");
  if (descriptionElement) {
    data.description = descriptionElement.textContent.trim().substring(0, 500);
  }

  // Fallbacks
  if (!data.title) {
    data.title = document.title.split(" - ")[0] || "Codeforces Problem";
  }
  if (!data.difficulty) {
    data.difficulty = "Medium";
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractProblemData") {
    const data = extractProblemData();
    sendResponse(data);
  }
  return true;
});

// Notify the background script that this is a problem page
chrome.runtime.sendMessage({
  action: "isProblemPage",
  isProblemPage: detectPlatform() !== null,
});
