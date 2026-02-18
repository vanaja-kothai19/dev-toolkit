// DOM references
const inputJson = document.getElementById("inputJson");
const outputJson = document.getElementById("outputJson");
const formatBtn = document.getElementById("formatBtn");
const validateBtn = document.getElementById("validateBtn");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");
const statusMessage = document.getElementById("statusMessage");
const inputCount = document.getElementById("inputCount");
const outputCount = document.getElementById("outputCount");

// Keep counters in sync
function updateCounters() {
  inputCount.textContent = `Input: ${inputJson.value.length} chars`;
  outputCount.textContent = `Output: ${outputJson.value.length} chars`;
}

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = "status-message";
  if (type) {
    statusMessage.classList.add(type);
  }
}

// Convert JSON.parse error position into line/column
function buildErrorMessage(rawText, parseError) {
  const match = parseError.message.match(/position\s+(\d+)/i);

  if (!match) {
    return `Invalid JSON: ${parseError.message}`;
  }

  const position = Number(match[1]);
  const beforeError = rawText.slice(0, position);
  const lines = beforeError.split("\n");
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;

  return `Invalid JSON at line ${line}, column ${column}: ${parseError.message}`;
}

function tryParseInput() {
  const rawText = inputJson.value.trim();

  if (!rawText) {
    throw new Error("Input is empty. Paste JSON to continue.");
  }

  return JSON.parse(rawText);
}

function formatJson() {
  try {
    const parsed = tryParseInput();
    const formatted = JSON.stringify(parsed, null, 2);
    outputJson.value = formatted;
    setStatus("JSON formatted successfully.", "success");
  } catch (error) {
    const message =
      error instanceof SyntaxError
        ? buildErrorMessage(inputJson.value, error)
        : error.message;

    outputJson.value = "";
    setStatus(message, "error");
  }

  updateCounters();
}

function validateJson() {
  try {
    tryParseInput();
    setStatus("JSON is valid.", "success");
  } catch (error) {
    const message =
      error instanceof SyntaxError
        ? buildErrorMessage(inputJson.value, error)
        : error.message;

    setStatus(message, "error");
  }
}

function clearAll() {
  inputJson.value = "";
  outputJson.value = "";
  setStatus("Cleared.");
  updateCounters();
  inputJson.focus();
}

// Clipboard support with fallback
async function copyOutput() {
  const text = outputJson.value;

  if (!text) {
    setStatus("Nothing to copy. Format JSON first.", "error");
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      outputJson.removeAttribute("readonly");
      outputJson.select();
      document.execCommand("copy");
      outputJson.setAttribute("readonly", "readonly");
      window.getSelection().removeAllRanges();
    }

    setStatus("Formatted JSON copied to clipboard.", "success");
  } catch {
    setStatus("Copy failed. Please copy manually.", "error");
  }
}

formatBtn.addEventListener("click", formatJson);
validateBtn.addEventListener("click", validateJson);
clearBtn.addEventListener("click", clearAll);
copyBtn.addEventListener("click", copyOutput);
inputJson.addEventListener("input", updateCounters);

// Initial UI state
updateCounters();
inputJson.focus();
