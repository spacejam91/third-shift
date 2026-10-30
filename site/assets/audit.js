// Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
// The "Which of these does your team still do by hand?" checklist.

const VERDICTS = [
  [0, "Start ticking."],
  [1, "A good place to start. One build could take that off your plate."],
  [3, "That’s a real shift’s worth of work. Worth a 20-minute call."],
  [6, "Your team is already working a third shift. Let’s hand it to a machine."],
];

export function initAudit({ onSend = () => {} } = {}) {
  const boxes = [...document.querySelectorAll('.audit-list input[type="checkbox"]')];
  const num = document.getElementById("audit-num");
  const bar = document.getElementById("audit-bar");
  const verdict = document.getElementById("audit-verdict");
  const send = document.getElementById("audit-send");
  if (!boxes.length || !num) return null;

  const picked = () => boxes.filter((b) => b.checked).map((b) => b.value);

  function update() {
    const n = picked().length;
    num.textContent = String(n);
    num.classList.remove("bump");
    void num.offsetWidth;            // restart the bump animation
    num.classList.add("bump");
    bar.style.setProperty("--audit", (n / boxes.length).toFixed(3));
    verdict.textContent = VERDICTS.filter(([min]) => n >= min).pop()[1];
    send.disabled = n === 0;
    send.textContent = n ? `Book a call about these ${n}` : "Book a call about these";
  }

  boxes.forEach((b) => b.addEventListener("change", update));
  send.addEventListener("click", () => {
    const list = picked();
    if (list.length) onSend(`From the overnight audit, we still do these by hand: ${list.join("; ")}.`);
  });
  return { picked };
}
