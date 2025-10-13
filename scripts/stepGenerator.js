// Converts DOM elements into human-readable test steps
function getReadableLabel(el) {
  if (!el) return "unknown element";
  return (
    el.innerText ||
    el.placeholder ||
    el.ariaLabel ||
    el.name ||
    el.id ||
    el.value ||
    el.tagName
  ).trim();
}

function generateStep(event) {
  const el = event.target;
  const label = getReadableLabel(el);
  const url = window.location.href;

  switch (event.type) {
    case "click":
      return `Clicked on '${label}'`;
    case "input":
      if (el.type === "password") return `Entered password in '${label}' field`;
      return `Entered '${el.value}' in '${label}' field`;
    case "change":
      return `Changed value of '${label}'`;
    case "submit":
      return `Submitted form '${label}'`;
    default:
      return `Interacted with '${label}' on ${url}`;
  }
}

export { generateStep };
