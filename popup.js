document.addEventListener("DOMContentLoaded", () => {
  const elements = {
    className: document.getElementById("className"),
    regexList: document.getElementById("regexList"),
    addRegex: document.getElementById("addRegex"),
    applySettings: document.getElementById("applySettings"),
    resetSettings: document.getElementById("resetSettings"),
    exportConfig: document.getElementById("exportConfig"),
    importConfig: document.getElementById("importConfig"),
    fileInput: document.getElementById("fileInput"),
    status: document.getElementById("status"),
  }

  const regexTemplate = document.getElementById("regexTemplate")
  const thresholdTemplate = document.getElementById("thresholdTemplate")

  let regexConfigs = []

  // Load saved settings
  loadSettings()

  // Event listeners
  elements.addRegex.addEventListener("click", () => addRegexConfig())
  elements.applySettings.addEventListener("click", saveAndApplySettings)
  elements.resetSettings.addEventListener("click", resetSettings)
  elements.exportConfig.addEventListener("click", exportConfig)
  elements.importConfig.addEventListener("click", () => elements.fileInput.click())
  elements.fileInput.addEventListener("change", importConfig)

  function loadSettings() {
    window.chrome.storage.sync.get(["className", "regexConfigs"], (result) => {
      elements.className.value = result.className || "calendar-event-container"
      regexConfigs = result.regexConfigs || []

      if (regexConfigs.length === 0) {
        addRegexConfig() // Add default config if none exist
      } else {
        renderRegexConfigs()
      }
    })
  }

  function addRegexConfig(config = null) {
    const defaultConfig = {
      id: Date.now() + Math.random(),
      name: `Config ${regexConfigs.length + 1}`,
      pattern: "",
      enabled: true,
      enableBackground: false,
      backgroundColor: "#ffff00",
      enableBorder: false,
      borderColor: "#ff0000",
      enableFontSize: false,
      fontSize: 16,
      enableFontColor: false,
      fontColor: "#000000",
      enableBadge: false,
      thresholds: [
        { operator: "<=", value: 1, color: "#000000" },
        { operator: "=", value: 2, color: "#ff0000" },
        { operator: "<=", value: 4, color: "#ffa500" },
        { operator: ">", value: 4, color: "#008000" },
      ],
    }

    const newConfig = config || defaultConfig
    regexConfigs.push(newConfig)
    renderRegexConfigs()
  }

  function renderRegexConfigs() {
    elements.regexList.innerHTML = ""

    regexConfigs.forEach((config, index) => {
      const configElement = createRegexConfigElement(config, index)
      elements.regexList.appendChild(configElement)
    })
  }

  function createRegexConfigElement(config, index) {
    const template = regexTemplate.content.cloneNode(true)
    const configDiv = template.querySelector(".regex-config")

    // Set up basic elements
    const nameInput = template.querySelector(".regex-name")
    const toggleBtn = template.querySelector(".toggle-config")
    const duplicateBtn = template.querySelector(".duplicate-config")
    const deleteBtn = template.querySelector(".delete-config")
    const content = template.querySelector(".regex-content")

    // Set values
    nameInput.value = config.name
    template.querySelector(".regex-pattern").value = config.pattern
    template.querySelector(".enable-config").checked = config.enabled
    template.querySelector(".enable-background").checked = config.enableBackground
    template.querySelector(".background-color").value = config.backgroundColor
    template.querySelector(".background-color").disabled = !config.enableBackground
    template.querySelector(".enable-border").checked = config.enableBorder
    template.querySelector(".border-color").value = config.borderColor
    template.querySelector(".border-color").disabled = !config.enableBorder
    template.querySelector(".font-size").value = config.fontSize
    template.querySelector(".font-size").disabled = !config.enableFontSize
    template.querySelector(".enable-font-size").checked = config.enableFontSize
    template.querySelector(".font-color").value = config.fontColor
    template.querySelector(".font-color").disabled = !config.enableFontColor
    template.querySelector(".enable-font-color").checked = config.enableFontColor
    template.querySelector(".enable-badge").checked = config.enableBadge

    // Set up event listeners
    nameInput.addEventListener("input", (e) => {
      regexConfigs[index].name = e.target.value
    })

    template.querySelector(".regex-pattern").addEventListener("input", (e) => {
      regexConfigs[index].pattern = e.target.value
    })

    template.querySelector(".enable-config").addEventListener("change", (e) => {
      regexConfigs[index].enabled = e.target.checked
    })

    const enableBg = template.querySelector(".enable-background")
    const bgColor = template.querySelector(".background-color")
    enableBg.addEventListener("change", (e) => {
      regexConfigs[index].enableBackground = e.target.checked
      bgColor.disabled = !e.target.checked
    })
    bgColor.addEventListener("change", (e) => {
      regexConfigs[index].backgroundColor = e.target.value
    })

    const enableBorder = template.querySelector(".enable-border")
    const borderColor = template.querySelector(".border-color")
    enableBorder.addEventListener("change", (e) => {
      regexConfigs[index].enableBorder = e.target.checked
      borderColor.disabled = !e.target.checked
    })
    borderColor.addEventListener("change", (e) => {
      regexConfigs[index].borderColor = e.target.value
    })

    const enableFontSize = template.querySelector(".enable-font-size")
    const fontSize = template.querySelector(".font-size")
    enableFontSize.addEventListener("change", (e) => {
      regexConfigs[index].enableFontSize = e.target.checked
      fontSize.disabled = !e.target.checked
    })
    fontSize.addEventListener("change", (e) => {
      regexConfigs[index].fontSize = Number.parseInt(e.target.value)
    })

    const enableFontColor = template.querySelector(".enable-font-color")
    const fontColor = template.querySelector(".font-color")
    enableFontColor.addEventListener("change", (e) => {
      regexConfigs[index].enableFontColor = e.target.checked
      fontColor.disabled = !e.target.checked
    })
    fontColor.addEventListener("change", (e) => {
      regexConfigs[index].fontColor = e.target.value
    })

    template.querySelector(".enable-badge").addEventListener("change", (e) => {
      regexConfigs[index].enableBadge = e.target.checked
    })

    // Toggle content visibility
    toggleBtn.addEventListener("click", () => {
      const isExpanded = content.classList.contains("expanded")
      content.classList.toggle("expanded")
      toggleBtn.innerHTML = isExpanded ? '<i class="fa fa-angle-down" aria-hidden="true"></i>' : '<i class="fa fa-angle-up" aria-hidden="true"></i>'
    })

    // Duplicate config
    duplicateBtn.addEventListener("click", () => {
      const duplicatedConfig = JSON.parse(JSON.stringify(config))
      duplicatedConfig.id = Date.now() + Math.random()
      duplicatedConfig.name = `${config.name} (Copy)`
      addRegexConfig(duplicatedConfig)
    })

    // Delete config
    deleteBtn.addEventListener("click", () => {
      if (regexConfigs.length > 1) {
        regexConfigs.splice(index, 1)
        renderRegexConfigs()
      } else {
        showStatus("Cannot delete the last configuration", "error")
      }
    })

    // Set up thresholds
    setupThresholds(template, config, index)

    return template
  }

  function setupThresholds(template, config, configIndex) {
    const thresholdsList = template.querySelector(".thresholds-list")
    const addThresholdBtn = template.querySelector(".add-threshold")

    function renderThresholds() {
      thresholdsList.innerHTML = ""
      config.thresholds.forEach((threshold, thresholdIndex) => {
        const thresholdElement = createThresholdElement(threshold, configIndex, thresholdIndex)
        thresholdsList.appendChild(thresholdElement)
      })
    }

    addThresholdBtn.addEventListener("click", () => {
      config.thresholds.push({
        operator: "<=",
        value: 1,
        color: "#ff0000",
      })
      renderThresholds()
    })

    renderThresholds()
  }

  function createThresholdElement(threshold, configIndex, thresholdIndex) {
    const template = thresholdTemplate.content.cloneNode(true)

    template.querySelector(".threshold-operator").value = threshold.operator
    template.querySelector(".threshold-value").value = threshold.value
    template.querySelector(".threshold-color").value = threshold.color

    template.querySelector(".threshold-operator").addEventListener("change", (e) => {
      regexConfigs[configIndex].thresholds[thresholdIndex].operator = e.target.value
    })

    template.querySelector(".threshold-value").addEventListener("change", (e) => {
      regexConfigs[configIndex].thresholds[thresholdIndex].value = Number.parseInt(e.target.value)
    })

    template.querySelector(".threshold-color").addEventListener("change", (e) => {
      regexConfigs[configIndex].thresholds[thresholdIndex].color = e.target.value
    })

    template.querySelector(".remove-threshold").addEventListener("click", () => {
      if (regexConfigs[configIndex].thresholds.length > 1) {
        regexConfigs[configIndex].thresholds.splice(thresholdIndex, 1)
        renderRegexConfigs()
      }
    })

    return template
  }

  function saveAndApplySettings() {
    const settings = {
      className: elements.className.value,
      regexConfigs: regexConfigs,
    }

    window.chrome.storage.sync.set(settings, () => {
      window.chrome.tabs.query({ url: "https://cscadv.novajus.com.br/agenda/compromissotarefa*" }, (tabs) => {
        for (const tab of tabs) {
          window.chrome.tabs.sendMessage(tab.id, { action: "applyStyles" });
          console.log(`Styles applied to tab: ${tab.id} - ${tab.url}`);
          console.log(tab);
        }
      })

      showStatus("Settings applied successfully!", "success")
    })
  }

  function resetSettings() {
    window.chrome.storage.sync.clear(() => {
      regexConfigs = []
      loadSettings()
      showStatus("Settings reset successfully!", "success")
    })
  }

  function exportConfig() {
    const settings = {
      className: elements.className.value,
      regexConfigs: regexConfigs,
    }

    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement("a")
    link.href = url
    link.download = "advanced-regex-styler-config.json"
    link.click()

    URL.revokeObjectURL(url)
    showStatus("Configuration exported successfully!", "success")
  }

  function importConfig(event) {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result)

        if (config.regexConfigs && Array.isArray(config.regexConfigs)) {
          elements.className.value = config.className || ""
          regexConfigs = config.regexConfigs
          renderRegexConfigs()
          showStatus("Configuration imported successfully!", "success")
        } else {
          showStatus("Error: Invalid configuration format", "error")
        }
      } catch (error) {
        showStatus("Error importing configuration: Invalid JSON file", "error")
      }
    }
    reader.readAsText(file)
  }

  function showStatus(message, type) {
    elements.status.textContent = message
    elements.status.className = `status ${type}`
    elements.status.style.display = "block"

    setTimeout(() => {
      elements.status.style.display = "none"
    }, 3000)
  }
})
