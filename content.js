let currentSettings = {}

function loadAndApplySettings() {
  window.chrome.storage.sync.get(null, (settings) => {
    currentSettings = settings
    console.log("Current settings:", settings)
    applyStyles()
  })
}

loadAndApplySettings()



// Listen for messages from popup
window.chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "applyStyles") {
    loadAndApplySettings()
  }
})

function applyStyles() {
  if (!currentSettings.className || !currentSettings.regexConfigs) {
    return
  }

  // Remove existing styled elements
  document.querySelectorAll(".regex-styled-title").forEach((el) => {
    el.classList.remove("regex-styled-title")
    el.style.cssText = el.getAttribute("data-original-style") || ""
    el.removeAttribute("data-original-style")
    el.removeAttribute("data-config-id")
  })

  // Remove existing badges
  document.querySelectorAll(".date-badge").forEach((badge) => badge.remove())

  const targetElements = document.querySelectorAll(`.${currentSettings.className}`)
  if (targetElements.length === 0) {
    console.warn(`No elements found with class "${currentSettings.className}"`)
    return
  }

  // If elements are found, set a timeout to re-apply styles after 10 seconds
  setTimeout(applyStyles, 10000)

  currentSettings.regexConfigs.forEach((config) => {
    if (!config.enabled || !config.pattern) return

    try {
      const regex = new RegExp(config.pattern, "gi")

      targetElements.forEach((element) => {
        const titleElements = element.querySelectorAll("*")

        titleElements.forEach((titleEl) => {
          // Skip if already styled by another config
          //if (titleEl.classList.contains("regex-styled-title")) return

          const text = titleEl.textContent || titleEl.innerText

          if (regex.test(text)) {
            // Store original style and config ID
            titleEl.setAttribute("data-original-style", titleEl.style.cssText)
            titleEl.setAttribute("data-config-id", config.id)
            titleEl.classList.add("regex-styled-title")

            // Apply styles
            if (config.enableBackground) {
              titleEl.style.backgroundColor = config.backgroundColor
            }

            if (config.enableBorder) {
              titleEl.style.border = `1px solid ${config.borderColor}`
            }

            if (config.enableFontSize) {
              titleEl.style.fontSize = `${config.fontSize}px`
            }
            if (config.enableFontColor) {
              titleEl.style.color = config.fontColor
            }
            //titleEl.style.position = "relative"

            // Add date badge if enabled
            if (config.enableBadge) {
              addDateBadge(titleEl, text, config)
            }
          }
        })
      })
      console.log(`Applied styles for config "${config.name}"`)
    } catch (error) {
      console.error(`Invalid regex pattern in config "${config.name}":`, error)
    }
  })
}

function addDateBadge(element, text, config) {
  // Extract date in dd/mm format
  const dateMatch = text.match(/(\d{2})\/(\d{2})/)
  if (!dateMatch) return
  const isFatal = text.match("fatal")

  const day = Number.parseInt(dateMatch[1])
  const month = Number.parseInt(dateMatch[2])
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()

  // Create date object (assuming current year)
  const targetDate = new Date(currentYear, month - 1, day)

  // If the date has passed this year, assume it's for next year
  if (isMoreThanOneMonthPast(targetDate, currentDate)) {
    targetDate.setFullYear(currentYear + 1)
  }

  // Calculate remaining days
  const timeDiff = targetDate.getTime() - currentDate.getTime()
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))

  // Determine badge color based on thresholds
  let badgeColor = "#cccccc" // default color

  // Sort thresholds by value for proper evaluation
  const sortedThresholds = [...config.thresholds].sort((a, b) => {
    if (a.operator === ">" && b.operator !== ">") return 1
    if (b.operator === ">" && a.operator !== ">") return -1
    return a.value - b.value
  })

  for (const threshold of sortedThresholds) {
    let matches = false

    switch (threshold.operator) {
      case "<=":
        matches = daysDiff <= threshold.value
        break
      case "=":
        matches = daysDiff === threshold.value
        break
      case ">=":
        matches = daysDiff >= threshold.value
        break
      case "<":
        matches = daysDiff < threshold.value
        break
      case ">":
        matches = daysDiff > threshold.value
        break
    }

    if (matches) {
      badgeColor = threshold.color
      break
    }
  }

  // Create badge element
  const badge = document.createElement("span")
  badge.className = "date-badge"
  badge.textContent = `${daysDiff}d`
  badge.style.cssText = `
    position: absolute;
    top: -8px;
    right: -8px;
    background-color: ${badgeColor};
    color: white;
    border-radius: ${isFatal ? 0 : 50}%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
    z-index: 1000;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `

  element.appendChild(badge)
}

// Re-apply styles when DOM changes (for dynamic content)
let debounceTimeout = null;

const observer = new MutationObserver((mutations) => {
  let shouldReapply = false;

  mutations.forEach((mutation) => {
    if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
      shouldReapply = true;
    }
  });

  if (shouldReapply) {
    // Debounce: wait 1 second after the last mutation before applying styles
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      applyStyles();
    }, 1000);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
})

function isMoreThanOneMonthPast(dateToCheck, referenceDate) {
  const oneMonthAgo = new Date(referenceDate);
  oneMonthAgo.setMonth(referenceDate.getMonth() - 1);

  return dateToCheck < oneMonthAgo;
}
