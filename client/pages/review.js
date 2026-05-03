import hljs from "highlight.js";
import "./review.css";

const severityClass = {
  critical: "severity-critical",
  high: "severity-high",
  medium: "severity-medium",
  low: "severity-low",
};

const severityIcon = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🔵",
};

export async function renderReview(container, reviewId, navigate) {
  container.innerHTML = `<div class="analyzing-overlay"><div class="spinner"></div><p>Loading Review...</p></div>`;

  let review;
  try {
    const res = await fetch(`/api/reviews/${reviewId}`);
    if (!res.ok) throw new Error("Not found");
    review = await res.json();
  } catch {
    container.innerHTML = `
      <div class="container not-found">
        <h2>Review Not Found</h2>
        <p>This review doesn't exist or has expired.</p>
        <button class="btn btn-primary" id="go-home">← Go Home</button>
      </div>`;
    container.querySelector("#go-home").addEventListener("click", () => navigate("/"));
    return;
  }

  const bugs = Array.isArray(review.bugs) ? review.bugs : [];
  const suggestions = Array.isArray(review.suggestions) ? review.suggestions : [];

  // Build a map of line number → bugs
  const bugsByLine = {};
  bugs.forEach((b, idx) => {
    if (b.line) {
      if (!bugsByLine[b.line]) bugsByLine[b.line] = [];
      bugsByLine[b.line].push({ ...b, idx });
    }
  });

  // Highlight and split into lines
  const highlighted = hljs.highlightAuto(review.fileContent || "").value;
  const lines = highlighted.split("\n");

  // Build line-by-line code with inline bug markers
  const codeLines = lines.map((lineHtml, i) => {
    const lineNum = i + 1;
    const lineBugs = bugsByLine[lineNum] || [];
    const hasBug = lineBugs.length > 0;
    const bugClass = hasBug ? `code-line has-bug ${severityClass[lineBugs[0].severity] || ""}` : "code-line";

    const markers = lineBugs.map(b =>
      `<button class="bug-marker ${severityClass[b.severity] || ""}" data-bug="${b.idx}" title="${escHtml(b.issue)}">
        ${severityIcon[b.severity] || "⚠"} Bug
      </button>`
    ).join("");

    const popups = lineBugs.map(b =>
      `<div class="bug-popup" id="bug-popup-${b.idx}">
        <div class="bug-popup-header">
          <span class="severity-badge ${severityClass[b.severity]}">${escHtml(b.severity)}</span>
          <span class="bug-popup-line">Line ${lineNum}</span>
          <button class="bug-popup-close" data-bug="${b.idx}">✕</button>
        </div>
        <p class="bug-popup-issue">${escHtml(b.issue)}</p>
        <p class="bug-popup-fix"><strong>Fix:</strong> ${escHtml(b.fix)}</p>
      </div>`
    ).join("");

    return `
      <div class="${bugClass}" data-line="${lineNum}">
        <span class="line-num">${lineNum}</span>
        <span class="line-code">${lineHtml || " "}</span>
        ${markers}
        ${popups}
      </div>`;
  }).join("");

  container.innerHTML = `
    <div class="container review-page">

      <!-- Top Bar -->
      <div class="review-topbar">
        <div class="review-file-info">
          <span class="file-name-badge">${escHtml(review.fileName)}</span>
          <span class="lang-badge">${escHtml(review.language)}</span>
        </div>
        <div class="review-actions">
          <button class="btn btn-sm" id="back-btn">← Home</button>
          <button class="btn btn-primary" id="chat-btn">💬 Chat about this code</button>
        </div>
      </div>

      <!-- Code with inline bug markers -->
      <div class="section-block">
        <div class="section-header">
          ⌨ &nbsp;Code
          ${bugs.filter(b => b.line).length > 0
            ? `<span class="section-count">${bugs.filter(b => b.line).length} inline bug${bugs.filter(b => b.line).length !== 1 ? "s" : ""}</span>`
            : ""}
        </div>
        <div class="section-body code-block-wrap">
          <div class="code-lines">${codeLines}</div>
        </div>
      </div>

      <!-- Two column: Bugs + Suggestions -->
      <div class="review-two-col">

        <!-- Bugs -->
        <div class="section-block">
          <div class="section-header">
            ⚠ &nbsp;Bugs
            <span class="section-count">${bugs.length}</span>
          </div>
          <div class="section-body">
            ${bugs.length === 0
              ? `<p class="no-bugs">✓ No bugs detected!</p>`
              : bugs.map(b => `
                <div class="bug-item ${severityClass[b.severity] || ""}">
                  <div class="bug-meta">
                    <span class="severity-badge ${severityClass[b.severity] || ""}">${escHtml(b.severity)}</span>
                    ${b.line ? `<span class="bug-line-tag">Line ${b.line}</span>` : ""}
                  </div>
                  <p class="bug-issue">${escHtml(b.issue)}</p>
                  <p class="bug-fix"><strong>Fix:</strong> ${escHtml(b.fix)}</p>
                </div>`).join("")}
          </div>
        </div>

        <!-- Suggestions -->
        <div class="section-block">
          <div class="section-header">
            💡 &nbsp;Suggestions
            <span class="section-count">${suggestions.length}</span>
          </div>
          <div class="section-body">
            ${suggestions.length === 0
              ? `<p class="no-suggestions">No suggestions at this time.</p>`
              : suggestions.map(s => `
                <div class="suggestion-item">
                  <span class="suggestion-category">${escHtml(s.category)}</span>
                  <p class="suggestion-text">${escHtml(s.suggestion)}</p>
                  <p class="suggestion-benefit"><strong>Benefit:</strong> ${escHtml(s.benefit)}</p>
                </div>`).join("")}
          </div>
        </div>

      </div>

      <!-- Explanation -->
      <div class="section-block">
        <div class="section-header">📖 &nbsp;Explanation</div>
        <div class="section-body">
          <p class="explanation-text">${escHtml(review.explanation)}</p>
        </div>
      </div>

      <!-- Chat CTA -->
      <div class="chat-cta">
        <div class="chat-cta-text">
          <strong>Have questions about this code?</strong>
          <span>Chat with AI to dig deeper into bugs, fixes, or how the code works.</span>
        </div>
        <button class="btn btn-primary" id="chat-cta-btn">💬 Open Chat →</button>
      </div>

    </div>
  `;

  document.getElementById("back-btn").addEventListener("click", () => navigate("/"));
  document.getElementById("chat-btn").addEventListener("click", () => navigate(`/chat/${reviewId}`));
  document.getElementById("chat-cta-btn").addEventListener("click", () => navigate(`/chat/${reviewId}`));

  // Bug marker click — toggle popup
  container.querySelectorAll(".bug-marker").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = btn.dataset.bug;
      const popup = document.getElementById(`bug-popup-${idx}`);
      const isOpen = popup.classList.contains("open");

      // Close all popups first
      container.querySelectorAll(".bug-popup.open").forEach(p => p.classList.remove("open"));

      if (!isOpen) popup.classList.add("open");
    });
  });

  // Close button inside popup
  container.querySelectorAll(".bug-popup-close").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.getElementById(`bug-popup-${btn.dataset.bug}`)?.classList.remove("open");
    });
  });

  // Click outside closes popups
  document.addEventListener("click", () => {
    container.querySelectorAll(".bug-popup.open").forEach(p => p.classList.remove("open"));
  });
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
