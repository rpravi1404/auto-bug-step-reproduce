// ---------------------------
// Step Generator Functions
// ---------------------------

// Helper: find the most descriptive parent or sibling element
function findMeaningfulParentOrSiblings(element) {
  if (!element) return null;

  const isMeaningful = (el) => {
    const tag = el.tagName?.toUpperCase();
    const text = el.innerText?.trim();
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

// Helper: find the most descriptive parent element (useful for React apps)
// function findMeaningfulParent(el) {
//   let current = el;
//   while (current && current.tagName !== 'BODY') {
//     const tag = current.tagName.toUpperCase();
//     if (['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'LABEL'].includes(tag)) {
//       return current;
//     }
//     // If it has an onclick or a role that looks interactive
//     if (current.onclick || current.getAttribute('role') === 'button' || current.getAttribute('tabindex') !== null) {
//       return current;
//     }

//     current = current.parentElement;
//   }
//   return el;
// }

// Step Generator Function
function generateStep(event) {
  const el = event.type === "click" ? findMeaningfulParentOrSiblings(event.target) : event.target;
  const label =
    (el.innerText && el.innerText.trim()) ||
    el.placeholder ||
    el.ariaLabel ||
    el.name ||
    el.id ||
    el.value ||
    el.tagName ||
    el.getAttribute('data-testid') ||
    el.getAttribute('data-cy') ||
    el.getAttribute('aria-label') ||
    el.getAttribute('data-test') ||
    el.getAttribute('data-test-id') ||
    el.getAttribute('data-test-cy') ||
    el.getAttribute('data-test-aria-label');

  switch (event.type) {
    case "click":
      if (el.tagName === "SELECT") {
        return; // Ignore clicks on dropdowns, handled in 'change' event
      }
      return `Clicked on '${label}'`;
    case "keyup":
    case "blur":
    case "input":
      if (el.value && label ) {
        if (el.tagName === "SELECT") {
          return; // Ignore, handled in 'change' event
        }else {
          if (el.type === "password") return `Entered password in '${label}' field`;
          return `Entered '${el.value}' in '${label}' field`;
        }
      }  
    case "change":
      if (el.tagName === "SELECT") {
        const selectedOption = el.options[el.selectedIndex];
        const value = selectedOption?.textContent?.trim() || selectedOption?.value || "unknown";
        return `Selected '${value}' from dropdown '${el.name || label}'`;
      } else if (el.type === "checkbox" || el.type === "radio") {
        return `Changed value of '${label}' to '${el.checked}'`;
      } else {
        return `Changed value of '${label}' to '${el.value}'`;
      }
    case "submit":
      return `Submitted form '${label}'`;
    case "date":
      return `Selected date '${el.value}' in '${label}' field`;
    default:
      return `Interacted with '${label}'`;
  }
}

// Natural Language Formatter
function formatStep(step) {
  const pageTitle = document.title || "this page";
  const url = location.hostname.replace("www.", "");

  if (step.startsWith("Clicked on")) {
    return `Click on the ${step.split("'")[1]}`;
  }
  if (step.startsWith("Entered")) {
    return `Enter ${step.split("'")[1]} in the ${step.split("'")[3]} field.`;
  }
  if (step.startsWith("Selected")) {
    return `Select ${step.split("'")[1]} from the ${step.split("'")[3]} dropdown.`;
  }
  if (step.startsWith("Changed value of")) {
    return `Modify the value of ${step.split("'")[1]}.`;
  }
  if (step.startsWith("Submitted")) {
    return `Submit the ${step.split("'")[1]} form.`;
  }
  if (step.startsWith("Navigated to")) {
    return `Navigate to ${step.replace("Navigated to", "").trim()}.`;
  }
  if (step.startsWith("Selected date")) {
    return `Select the date ${step.split("'")[1]} from calendar.`;
  }
  return `Perform: ${step}`;
}
