// Element references
const inputCssEl = document.getElementById("inputCss");
const outputCssEl = document.getElementById("outputCss");
const statusMessageEl = document.getElementById("statusMessage");
const inputLinesEl = document.getElementById("inputLines");
const outputLinesEl = document.getElementById("outputLines");
const minifyBtn = document.getElementById("minifyBtn");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");

// Status message utility
function setStatus(message, type = "") {
  statusMessageEl.textContent = message;
  statusMessageEl.className = "status-message";
  if (type) {
    statusMessageEl.classList.add(type);
  }
}

// Simulated editor line numbers
function getLineNumbersText(value) {
  const lineCount = Math.max(1, value.split("\n").length);
  let numbers = "";
  for (let i = 1; i <= lineCount; i += 1) {
    numbers += i + (i < lineCount ? "\n" : "");
  }
  return numbers;
}

function updateLineNumbers(textareaEl, lineNumbersEl) {
  lineNumbersEl.textContent = getLineNumbersText(textareaEl.value);
  lineNumbersEl.scrollTop = textareaEl.scrollTop;
}

// Cleanup and auto-fix helpers
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

// Safe property-name corrections (small predefined map only).
const PROPERTY_CORRECTIONS = {
  backgroung: "background",
  colr: "color",
  widht: "width",
  heigth: "height"
};

// Validation helpers
function getBraceBalanceInfo(css) {
  let depth = 0;
  let hasExtraClosingBrace = false;

  for (let i = 0; i < css.length; i += 1) {
    const char = css[i];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth < 0) {
        hasExtraClosingBrace = true;
        depth = 0;
      }
    }
  }

  return {
    missingClosingCount: depth,
    hasExtraClosingBrace
  };
}

function getBlockContents(css) {
  const blocks = css.match(/\{[^{}]*\}/g) || [];
  return blocks.map((block) => block.slice(1, -1));
}

function hasMissingSemicolon(css) {
  // Missing semicolon before next property OR before closing brace.
  const pattern = /([a-zA-Z-]+\s*:\s*[^;{}]+)(?=\s+[a-zA-Z-]+\s*:|\s*})/g;
  return pattern.test(css);
}

function hasInvalidDeclarationFormat(css) {
  const blockContents = getBlockContents(css);
  return blockContents.some((content) => {
    const declarations = content.split(";").map((item) => item.trim()).filter(Boolean);
    return declarations.some((declaration) => {
      if (!declaration.includes(":")) return true;
      const parts = declaration.split(":");
      const property = (parts[0] || "").trim();
      const value = parts.slice(1).join(":").trim();
      return !property || !value;
    });
  });
}

// validateCSS: checks syntax structure before minification.
function validateCSS(css) {
  const errors = [];
  const braceInfo = getBraceBalanceInfo(css);

  // 1) Validate bracket balance.
  if (braceInfo.hasExtraClosingBrace || braceInfo.missingClosingCount > 0) {
    errors.push("Unmatched bracket detected.");
  }

  // 2) Validate missing semicolon after declarations.
  if (hasMissingSemicolon(css)) {
    errors.push("Missing semicolon before } detected.");
  }

  // 3) Detect property spelling mistakes from safe correction map.
  const warnings = [];
  const typoPattern = /\b([a-zA-Z-]+)\s*:/g;
  let typoMatch;
  while ((typoMatch = typoPattern.exec(css)) !== null) {
    const propName = typoMatch[1];
    if (PROPERTY_CORRECTIONS[propName]) {
      warnings.push(`Property typo found: "${propName}" -> "${PROPERTY_CORRECTIONS[propName]}"`);
    }
  }

  // 4) Ensure declaration format is property: value;
  if (hasInvalidDeclarationFormat(css)) {
    errors.push("Invalid CSS property format detected.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// autoCorrectCSS: safe, rule-based fixes only.
function autoCorrectCSS(css) {
  const fixes = [];
  let corrected = css;

  // Add missing semicolon before next property or before }.
  const semicolonFixed = corrected.replace(
    /([a-zA-Z-]+\s*:\s*[^;{}]+)(?=\s+[a-zA-Z-]+\s*:|\s*})/g,
    "$1;"
  );

  if (semicolonFixed !== corrected) {
    corrected = semicolonFixed;
    fixes.push("\u26A0 Auto-corrected missing semicolon before }");
  }

  // Apply safe property spelling corrections.
  const correctionKeys = Object.keys(PROPERTY_CORRECTIONS).join("|");
  const propFixRegex = new RegExp(`\\b(${correctionKeys})\\b(?=\\s*:)`, "g");
  const beforeSpellingFix = corrected;
  corrected = corrected.replace(propFixRegex, (badProp) => {
    const fixed = PROPERTY_CORRECTIONS[badProp] || badProp;
    if (fixed !== badProp) {
      fixes.push(`\u26A0 Corrected spelling: ${badProp} -> ${fixed}`);
    }
    return fixed;
  });
  if (corrected !== beforeSpellingFix) {
    // Details already pushed above per corrected property.
  }

  // Close simple unclosed blocks at end of file only if safe.
  const braceInfo = getBraceBalanceInfo(corrected);
  if (!braceInfo.hasExtraClosingBrace && braceInfo.missingClosingCount > 0) {
    corrected += "}".repeat(braceInfo.missingClosingCount);
    fixes.push("\u26A0 Auto-closed unclosed block at end of file");
  }

  return {
    correctedCss: corrected,
    fixes
  };
}

function minifyCss(css) {
  return css
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>+~])\s*/g, "$1")
    .replace(/;}/g, "}")
    .replace(/\s*!important/g, "!important")
    .trim();
}

// Keep requested function naming style while preserving existing flow.
const minifyCSS = minifyCss;

// Main minification pipeline
function processCss() {
  const rawInput = inputCssEl.value;
  if (!rawInput.trim()) {
    setStatus("Please enter CSS input first.", "error");
    outputCssEl.value = "";
    updateLineNumbers(outputCssEl, outputLinesEl);
    return;
  }

  const withoutComments = stripComments(rawInput);
  const initialValidation = validateCSS(withoutComments);

  // Valid CSS: minify directly.
  if (initialValidation.isValid) {
    outputCssEl.value = minifyCSS(withoutComments);
    updateLineNumbers(outputCssEl, outputLinesEl);
    setStatus("\u2705 CSS validated and minified", "success");
    return;
  }

  // Invalid CSS: attempt safe auto-correction, then validate again.
  const autoCorrectResult = autoCorrectCSS(withoutComments);
  const correctedValidation = validateCSS(autoCorrectResult.correctedCss);

  if (correctedValidation.isValid) {
    outputCssEl.value = minifyCSS(autoCorrectResult.correctedCss);
    updateLineNumbers(outputCssEl, outputLinesEl);

    const fixText = autoCorrectResult.fixes.length > 0
      ? autoCorrectResult.fixes.join(" | ")
      : "\u26A0 Auto-correction applied";
    setStatus(`${fixText} | \u2705 CSS validated and minified`, "warning");
    return;
  }

  // Still invalid after correction: clear output and show clear error.
  outputCssEl.value = "";
  updateLineNumbers(outputCssEl, outputLinesEl);

  setStatus(
    "\u274C Invalid CSS structure detected",
    "error"
  );
}

// Editor actions
function clearEditors() {
  inputCssEl.value = "";
  outputCssEl.value = "";
  setStatus("Editors cleared.");
  updateLineNumbers(inputCssEl, inputLinesEl);
  updateLineNumbers(outputCssEl, outputLinesEl);
}

async function copyOutput() {
  const output = outputCssEl.value.trim();
  if (!output) {
    setStatus("No minified output available to copy.", "error");
    return;
  }
  try {
    await navigator.clipboard.writeText(output);
    setStatus("Minified CSS copied to clipboard.", "success");
  } catch (error) {
    setStatus("Clipboard access failed. Please copy manually.", "error");
  }
}

minifyBtn.addEventListener("click", processCss);
clearBtn.addEventListener("click", clearEditors);
copyBtn.addEventListener("click", copyOutput);

inputCssEl.addEventListener("input", () => {
  updateLineNumbers(inputCssEl, inputLinesEl);
});
inputCssEl.addEventListener("scroll", () => {
  inputLinesEl.scrollTop = inputCssEl.scrollTop;
});
outputCssEl.addEventListener("scroll", () => {
  outputLinesEl.scrollTop = outputCssEl.scrollTop;
});

// Initial line-number sync.
updateLineNumbers(inputCssEl, inputLinesEl);
updateLineNumbers(outputCssEl, outputLinesEl);

