const DATA = { us: US_CONSTITUTION, az: AZ_CONSTITUTION };

const listEl = document.getElementById("list");
const searchEl = document.getElementById("search");
const countEl = document.getElementById("count");
const tabs = document.querySelectorAll(".tab");

let current = "us";

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function highlight(text, q) {
  const safe = escapeHtml(text);
  if (!q) return safe;
  const re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
  return safe.replace(re, "<mark>$1</mark>");
}

function matches(entry, q) {
  if (!q) return true;
  const hay = (entry.title + " " + entry.tag + " " + entry.summary + " " + entry.points.join(" ")).toLowerCase();
  return hay.includes(q);
}

function render() {
  const q = searchEl.value.trim().toLowerCase();
  const items = DATA[current].filter((e) => matches(e, q));
  listEl.innerHTML = "";

  if (items.length === 0) {
    listEl.innerHTML = '<div class="empty">No matches. Try another term.</div>';
    countEl.textContent = "";
    return;
  }

  items.forEach((entry) => {
    const div = document.createElement("div");
    div.className = "entry" + (q ? " open" : "");
    const pointsHtml = entry.points.length
      ? "<ul>" + entry.points.map((p) => "<li>" + highlight(p, q) + "</li>").join("") + "</ul>"
      : "";
    div.innerHTML =
      '<div class="entry-head">' +
        '<span class="entry-title">' + highlight(entry.title, q) + "</span>" +
        '<span style="display:flex;gap:6px;align-items:center">' +
          '<span class="tag">' + escapeHtml(entry.tag) + "</span>" +
          '<span class="arrow">▶</span>' +
        "</span>" +
      "</div>" +
      '<div class="entry-body">' +
        '<div class="summary">' + highlight(entry.summary, q) + "</div>" +
        pointsHtml +
      "</div>";
    div.querySelector(".entry-head").addEventListener("click", () => div.classList.toggle("open"));
    listEl.appendChild(div);
  });

  countEl.textContent = items.length + " of " + DATA[current].length + " topics";
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    current = tab.dataset.set;
    render();
  });
});

searchEl.addEventListener("input", render);
render();
