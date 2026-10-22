const WEDDING = Date.parse("2027-06-12T16:00:00");

/**
 * Split a millisecond difference into countdown cells.
 * Clamps to zero once the date has passed.
 */
export function countdownParts(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: ms <= 0,
  };
}

function pad(value, length = 2) {
  return String(value).padStart(length, "0");
}

function renderCountdown(root, now = Date.now()) {
  const parts = countdownParts(WEDDING - now);
  root.querySelector('[data-cd="days"]').textContent = pad(parts.days, 3);
  root.querySelector('[data-cd="hours"]').textContent = pad(parts.hours);
  root.querySelector('[data-cd="minutes"]').textContent = pad(parts.minutes);
  root.querySelector('[data-cd="seconds"]').textContent = pad(parts.seconds);
}

function initDemo() {
  const preview = document.querySelector("#preview");
  const status = document.querySelector("#demo-status");
  const note = document.querySelector("#demo-note");
  const themeButtons = [...document.querySelectorAll("[data-theme-btn]")];
  if (!preview || themeButtons.length === 0) return;

  const labels = new Map(themeButtons.map((button) => [button.dataset.themeBtn, button.textContent.trim()]));

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      preview.dataset.theme = button.dataset.themeBtn;
      themeButtons.forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
      if (status) status.textContent = labels.get(button.dataset.themeBtn);
    });
  });

  const tick = () => renderCountdown(preview);
  tick();
  setInterval(tick, 1000);

  document.querySelectorAll("[data-demo-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!note) return;
      note.textContent =
        button.dataset.demoAction === "rsvp"
          ? "Preview only — the real site opens a validated RSVP form with headcount, meal and dietary notes."
          : "Preview only — the real site opens the logistics hub with schedule, venue map and accommodations.";
    });
  });

  const copyButton = document.querySelector("[data-copy-target]");
  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      const target = document.getElementById(copyButton.dataset.copyTarget);
      if (!target) return;
      try {
        await navigator.clipboard.writeText(target.textContent.trim());
        copyButton.textContent = "Copied";
      } catch {
        copyButton.textContent = "Select above";
      }
      setTimeout(() => {
        copyButton.textContent = "Copy";
      }, 2000);
    });
  }
}

if (typeof document !== "undefined") {
  initDemo();
}
