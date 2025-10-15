// ---------------------------
// Step Generator Functions
// ---------------------------

// Helper: find the most descriptive parent or sibling element
function findMeaningfulParentOrSiblings(element) {
  if (!element) return null;

  const isMeaningful = (el) => {
    const tag = el.tagName?.toUpperCase();
    const text = el.innerText?.trim() || '';
    const aria = el.getAttribute?.('aria-label');
    const title = el.getAttribute?.('title');
    const placeholder = el.getAttribute?.('placeholder');

    if (['I', 'SVG', 'SPAN', 'DIV'].includes(tag)) {
      return !!(text.length > 1 || aria || title || placeholder);
    }

    return (
      ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'P', 'LABEL'].includes(tag) ||
      text.length > 1 ||
      aria ||
      title ||
      placeholder
    );
  };

  // 🔹 Start with the clicked element
  if (isMeaningful(element)) return element;

  // 🔹 Step 1: Check direct siblings
  const siblings = Array.from(element.parentNode?.children || []);
  for (const sibling of siblings) {
    if (sibling !== element && isMeaningful(sibling)) {
      return sibling;
    }
  }

  // 🔹 Step 2: Climb up but limit traversal to 3 levels
  let parent = element.parentElement;
  let depth = 0;
  while (parent && parent.tagName.toLowerCase() !== 'body' && depth < 3) {
    if (isMeaningful(parent)) return parent;

    const parentSiblings = Array.from(parent.parentNode?.children || []);
    for (const sibling of parentSiblings) {
      if (isMeaningful(sibling)) return sibling;
    }

    parent = parent.parentElement;
    depth++;
  }

  // If nothing meaningful found, return original element
  return element;
}


// Step Generator Function
function generateStep(event) {
  const el = getEffectiveElement(event);
  const label = getElementLabel(el);

  switch (event.type) {
    case "click":
      return handleClick(el, label);

    case "input":
    case "keyup":
    case "blur":
      return handleTextInput(el, label);

    case "change":
      return handleChange(el, label);

    case "submit":
      return handleSubmit(el, label);

    default:
      return `Interacted with '${label}'`;
  }
}

function getEffectiveElement(event) {
  const target = event.target;
  const type = event.type;

  // Ignore invisible or script elements
  if (!target || !target.tagName) return target;

  // For click and change, try to find meaningful element
  if (["click", "change"].includes(type)) {
    const meaningful = findMeaningfulParentOrSiblings(target, 3); // limit to 3 levels
    return meaningful || target;
  }

  return target;
}



function getElementLabel(el) {
  if (!el) return "an element";

  // If el is a text node, move up to its parent element
  if (el.nodeType !== 1) { // 1 = ELEMENT_NODE
    el = el.parentElement;
    if (!el) return "an element";
  }

  return (
    el.getAttribute("aria-label") ||
    el.getAttribute("data-testid") ||
    el.getAttribute("data-cy") ||
    el.getAttribute("data-test") ||
    el.getAttribute("data-test-id") ||
    el.getAttribute("data-test-cy") ||
    el.getAttribute("data-test-aria-label") ||
    el.name ||
    el.id ||
    el.placeholder ||
    el.innerText?.trim() ||
    el.value ||
    el.tagName
  );
}

/* ---------- Event-specific Handlers ---------- */

function handleClick(el, label) {
  if (!el) return;
  if (el.tagName === "SELECT") return; // handled by 'change'
  return `Clicked on '${label}'`;
}

function handleTextInput(el, label) {
  if (!el || !label || el.tagName === "SELECT") return;

  if (el.type === "password") {
    return `Entered password in '${label}' field`;
  }
  if (el.type === "date") {
    return `Selected date '${el.value}' in '${label}' field`;
  }
  if (el.value?.trim()) {
    return `Entered '${el.value.trim()}' in '${label}' field`;
  }
}

function handleChange(el, label) {
  if (!el) return;

  if (el.tagName === "SELECT") {
    const selected = el.options[el.selectedIndex];
    const value = selected?.textContent?.trim() || selected?.value || "unknown";
    return `Selected '${value}' from dropdown '${label}'`;
  }

  if (el.type === "checkbox" || el.type === "radio") {
    return `Changed '${label}' to ${el.checked ? "checked" : "unchecked"}`;
  }

  if (el.type === "date") {
    return `Selected date '${el.value}' in '${label}' field`;
  }

  return `Changed value of '${label}' to '${el.value}'`;
}

function handleSubmit(el, label) {
  return `Submitted form '${label}'`;
}


// Natural Language Formatter
function formatStep(step) {
  if (!step || typeof step !== "string") return "";

  const pageTitle = document.title || "this page";
  const url = location.hostname.replace("www.", "");

  // 🔹 Extract all text enclosed in single quotes
  const extractQuoted = (text) => {
    const matches = text.match(/'([^']+)'/g);
    return matches ? matches.map((m) => m.replace(/'/g, "").trim()) : [];
  };

  const parts = extractQuoted(step);

  // 🔹 Clean and capitalize first word
  const capitalize = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  let result = "";

  if (step.startsWith("Clicked on") && parts[0]) {
    result = `Click on the ${parts[0]}`;
  } else if (step.startsWith("Entered") && parts.length >= 2) {
    result = `Enter "${parts[0]}" in the ${parts[1]} field`;
  } else if (step.startsWith("Selected") && parts.length >= 2) {
    result = `Select "${parts[0]}" from the ${parts[1]} dropdown`;
  } else if (step.startsWith("Changed value of") && parts[0]) {
    result = `Modify the value of ${parts[0]}`;
  } else if (step.startsWith("Submitted") && parts[0]) {
    result = `Submit the ${parts[0]} form`;
  } else if (step.startsWith("Navigated to")) {
    const destination = step.replace("Navigated to", "").trim();
    result = `Navigate to ${destination || url}`;
  } else if (step.startsWith("Selected date") && parts[0]) {
    result = `Select the date ${parts[0]} from the calendar`;
  } else {
    result = `Perform action: ${step}`;
  }

  // 🔹 Cleanup: normalize punctuation & spacing
  result = result
    .replace(/\s+/g, " ") // multiple spaces → single space
    .replace(/\.\s*$/, "") // remove trailing period
    .trim();

  // 🔹 Ensure it starts with a capital letter and ends with a period
  return `${capitalize(result.charAt(0)) + result.slice(1)}.`;
}

