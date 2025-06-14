// ─── 1) Override history.pushState / replaceState to detect client-side navigation ─────────────────
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

  // Run once on initial load
  onUrlChange();
})();

// ─── 2) Callback to re-run extractor after a short delay ─────────────────────────────────────────
let lastPlatform = null;
let lastObserver = null;
function onUrlChange() {
  setTimeout(() => {
    // When the URL changes, stop any previous observer
    if (lastObserver) {
      lastObserver.disconnect();
      lastObserver = null;
    }
    // Determine platform and start watching for its problem container
    const platform = detectPlatform();
    if (!platform) {
      // Not on a recognized problem page, nothing to do
      return;
    }
    // If platform didn’t change, we might already be observing; otherwise start new observer
    if (platform !== lastPlatform) {
      lastPlatform = platform;
    }
    const selector = getProblemContainerSelector(platform);
    if (selector) {
      watchForProblemContainer(selector, () => {
        const data = extractProblemData();
        console.log("Re-extracted after URL or DOM change:", data);
        // If needed, notify other parts of your extension:
        // chrome.runtime.sendMessage({ action: "newProblemData", payload: data });
      });
    } else {
      // Fallback: directly extract if we have no selector
      const data = extractProblemData();
      console.log("Re-extracted (no container selector):", data);
    }
  }, 200);
}

//  3) MutationObserver helper to detect when a specific selector appears 
function watchForProblemContainer(selector, onFound) {
  // If an observer already exists, disconnect it before creating a new one
  if (lastObserver) {
    lastObserver.disconnect();
    lastObserver = null;
  }

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
          lastObserver = null;
          onFound(el);
          return;
        }
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  lastObserver = observer;

  // Safety: stop observing after 5 seconds if the container never appears
  setTimeout(() => {
    if (lastObserver === observer) {
      observer.disconnect();
      lastObserver = null;
      // Attempt a fallback extraction
      const data = extractProblemData();
      console.log("Fallback extraction (timeout):", data);
    }
  }, 5000);
}

// 4) Helper function to determine which platform we're on 
function detectPlatform() {
  const url = window.location.href;
  if (url.includes("leetcode.com/problems/")) return "leetcode";
  if (url.includes("geeksforgeeks.org/problems/")) return "geeksforgeeks";
  if (url.includes("interviewbit.com/problems/")) return "interviewbit";
  if (url.includes("codechef.com/problems/") || url.includes("codechef.com/")) return "codechef";
  if (url.includes("codeforces.com/problemset/problem/")) return "codeforces";
  return null;
}

// ─── 5) Map each platform to the CSS selector that wraps the problem content ────────────────────
function getProblemContainerSelector(platform) {
  switch (platform) {
    case "leetcode":
      return '[data-cy="question-content"], .question-content, .content__u3I1';
    case "geeksforgeeks":
      return "div[class*='problems_problem_content']";
    case "interviewbit":
      return ".p-html-content__container, .problem-statement, .p-html-content";
    case "codechef":
      return "#problem-statement, .problem-statement";
    case "codeforces":
      return ".problem-statement, .roundbox .problem-statement";
    default:
      return null;
  }
}

// 6) Extract problem data based on the platform 
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
      extractGenericData(data);
  }

  // Final fallbacks
  if (!data.title) {
    data.title = document.title.split(" - ")[0] || "Unknown Problem";
  }
  if (!data.difficulty) {
    data.difficulty = "Medium";
  }

  return data;
}

// 7) Generic extraction for unknown platforms 
function extractGenericData(data) {
  const titleSelectors = ["h1", ".title", ".problem-title", "[data-cy='question-title']"];
  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim()) {
      data.title = element.textContent.trim();
      break;
    }
  }
  if (!data.title) {
    data.title = document.title.split(" - ")[0] || "Unknown Problem";
  }
  data.difficulty = "Medium";
}

// 8) LeetCode-specific extraction 
function extractLeetCodeData(data) {
  // Title
  const titleSelectors = [
    "text-title-large",
  ];
  for (const selector of titleSelectors) {
    const titleElement = document.querySelector(selector);
    if (titleElement && titleElement.textContent.trim()) {
      data.title = titleElement.textContent.trim();
      break;
    }
  }

  // Difficulty
  const difficultySelectors = [
    '[class*="text-difficulty-easy"]',
    '[class*="text-difficulty-medium"]',
    '[class*="text-difficulty-hard"]',
    '[class*="text-green"]',
    '[class*="text-yellow"]',
    '[class*="text-red"]',
    '[class*="text-orange"]',
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

  // Topics/Tags
  const topicSelectors = [
    'a[data-act*="topic-list-click"]',
    ".css-1v6v87n",
    ".topic-tag",
    ".tag",
    ".css-1hky5w4 a",
    "[data-cy='tag']",
    'a[href^="/tag/"]'
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

  // Description
  const descriptionSelectors = [
    '[data-cy="question-content"]',
    ".question-content",
    ".css-1uqhpru",
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

  // Companies (if available)
  const companyElements = document.querySelectorAll(".company-tag, .css-1et4wmp");
  if (companyElements.length > 0) {
    data.companies = Array.from(companyElements)
      .map(el => el.textContent.trim())
      .filter(c => c.length > 0);
  }
}

// ─── 9) GeeksForGeeks-specific extraction ─────────────────────────────────────────────────────
function extractGeeksForGeeksData(data) {
  // Title
  const titleSelectors = [
    "problems_header_content__title__L2cB2 ",
    // ".problem-statement h1",
    // ".problemTitle",
    // "h1",
    // ".header-title"
  ];
  for (const selector of titleSelectors) {
    const titleElement = document.querySelector(selector);
    if (titleElement && titleElement.textContent.trim()) {
      data.title = titleElement.textContent.trim();
      break;
    }
  }

  // Difficulty
  const headerDesc = document.querySelector("div[class*='problems_header_description']");
  if (headerDesc) {
    const diffStrong = headerDesc.querySelector("span strong");
    if (diffStrong) {
      data.difficulty = diffStrong.textContent.trim();
    }
  }

  // Topics/Tags
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
      break;
    }
  }

  // Description
  const descContainer = document.querySelector("div[class*='problems_problem_content']");
  if (descContainer) {
    data.description = descContainer.textContent.trim().substring(0, 500);
  }
}

// ─── 10) InterviewBit-specific extraction ────────────────────────────────────────────────────
function extractInterviewBitData(data) {
  // Title
  const titleElement = document.querySelector(".problem-title, h1");
  if (titleElement) {
    data.title = titleElement.textContent.trim();
  }

  // Difficulty
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
      const txt = diffElement.textContent.trim();
      if (txt.includes("Easy")) data.difficulty = "Easy";
      else if (txt.includes("Medium")) data.difficulty = "Medium";
      else if (txt.includes("Hard")) data.difficulty = "Hard";
    }
  }

  // Topics/Tags
  const breadcrumbDiv = document.querySelector("div.ib-breadcrumb");
  if (breadcrumbDiv) {
    const topicAnchors = breadcrumbDiv.querySelectorAll("a.ib-breadcrumb__item--link");
    data.topics = Array.from(topicAnchors)
      .map(a => a.textContent.trim())
      .filter(t => t.length > 0);
  }

  // Description
  const descriptionElement = document.querySelector(".p-html-content__container");
  if (descriptionElement) {
    data.description = descriptionElement.textContent.trim().substring(0, 500);
  }
}

// ─── 11) CodeChef-specific extraction ───────────────────────────────────────────────────────
function extractCodeChefData(data) {
  // Title
  const titleElement = document.querySelector("#problem-statement h3");
  if (titleElement) {
    data.title = titleElement.textContent.trim();
  }

  // Difficulty (infer from problem code)
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
}

// ─── 12) Codeforces-specific extraction ────────────────────────────────────────────────────
function extractCodeforcesData(data) {
  // Title
  const titleElement = document.querySelector(".title, .problem-statement .title");
  if (titleElement) {
    data.title = titleElement.textContent.trim();
  }

  // Difficulty (based on rating)
  const ratingText = document.body.textContent;
  const ratingMatch = ratingText.match(/\*(\d+)/);
  if (ratingMatch) {
    const rating = Number.parseInt(ratingMatch[1], 10);
    if (rating < 1300) data.difficulty = "Easy";
    else if (rating < 1800) data.difficulty = "Medium";
    else data.difficulty = "Hard";
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
}

// ─── 13) Listen for messages from the popup or background script ─────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractProblemData") {
    const data = extractProblemData();
    console.log(data);
    sendResponse(data);
  }
  return true;
});

// ─── 14) Notify the background script (or popup) if this is a problem page ─────────────────────
chrome.runtime.sendMessage({
  action: "isProblemPage",
  isProblemPage: detectPlatform() !== null,
});
