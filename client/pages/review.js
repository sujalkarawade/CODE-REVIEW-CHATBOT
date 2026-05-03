import hljs from "highlight.js";
import "./review.css";

const severityClass = {
  critical: "severity-critical",
  high: "severity-high",
  medium: "severity-medium",
  low: "severity-low",
};

const severityColor = {
  critical: "#c0392b",
  high:     "#d35400",
  medium:   "#b7950b",
  low:      "#1a5276",
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

  // Map line → bugs
  const bugsByLine = {};
  bugs.forEach((b, idx) => {
    if (b.line) {
      if (!bugsByLine[b.line]) bugsByLine[b.line] = [];
      bugsByLine[b.line].push({ ...b, idx });
    }
  });

  const highlighted = hljs.highlightAuto(review.fileContent || "").value;
  const lines = highlighted.split("\n");
  const inlineBugCount = bugs.filter(b => b.line).length;

  // Build line-by-line code
  const codeLines = lines.map((lineHtml, i) => {
    const lineNum = i + 1;
    const lineBugs = bugsByLine[lineNum] || [];
    const hasBug = lineBugs.length > 0;
    const topBug = hasBug ? lineBugs[0] : null;
    const lineClass = hasBug
      ? `code-line has-bug ${severityClass[topBug.severity] || ""}`
      : "code-line";

    // Innovative badge: numbered circle with severity color
    const badge = hasBug ? lineBugs.map((b, bi) =>
      `<span class="bug-badge ${severityClass[b.severity]}" data-bug="${b.idx}" title="${escHtml(b.issue)}">
        <span class="bug-badge-dot"></span>
        <span class="bug-badge-label">${escHtml(b.severity[0].toUpperCase())}</span>
      </span>`
    ).join("") : "";

    // Popup rendered inside the line row
    const popups = lineBugs.map(b =>
      `<div class="bug-popup" id="bug-popup-${b.idx}">
        <div class="bug-popup-top ${severityClass[b.severity]}">
          <div class="bug-popup-top-left">
            <span class="bug-popup-sev">${escHtml(b.severity.toUpperCase())}</span>
            <span class="bug-popup-lineno">Line ${lineNum}</span>
          </div>
          <button class="bug-popup-close" data-bug="${b.idx}">✕</button>
        </div>
        <div class="bug-popup-body">
          <p class="bug-popup-issue">${escHtml(b.issue)}</p>
          <div class="bug-popup-fix">
            <span class="bug-popup-fix-label">Fix</span>
            <p>${escHtml(b.fix)}</p>
          </div>
        </div>
      </div>`
    ).join("");

    return `
      <div class="${lineClass}" data-line="${lineNum}" ${hasBug ? `data-bugs="${lineBugs.map(b=>b.idx).join(',')}"` : ""}>
        <span class="line-num">${lineNum}</span>
        <span class="line-code">${lineHtml || " "}</span>
        ${badge}
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
          <button class="btn btn-primary" id="chat-btn">Chat about this code</button>
        </div>
      </div>

      <!-- Code -->
      <div class="section-block">
        <div class="section-header">
          ⌨ &nbsp;Code
          ${inlineBugCount > 0
            ? `<span class="section-count">${inlineBugCount} inline bug${inlineBugCount !== 1 ? "s" : ""} </span>`
            : ""}
        </div>
        <div class="section-body code-block-wrap">
          <div class="code-lines">${codeLines}</div>
        </div>
      </div>

      <!-- Bugs -->
      <div class="review-two-col">
        <div class="section-block">
          <div class="section-header">
            ⚠ &nbsp;Bugs
            <span class="section-count">${bugs.length}</span>
          </div>
          <div class="section-body">
            ${bugs.length === 0
              ? `<p class="no-bugs">✓ No bugs detected!</p>`
              : bugs.map(b => `
                <div class="bug-item">
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
        <div class="section-header">&nbsp;Explanation</div>
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
        <button class="btn btn-primary" id="chat-cta-btn">Open Chat →</button>
      </div>

    </div>
  `;

  document.getElementById("back-btn").addEventListener("click", () => navigate("/"));
  document.getElementById("chat-btn").addEventListener("click", () => navigate(`/chat/${reviewId}`));
  document.getElementById("chat-cta-btn").addEventListener("click", () => navigate(`/chat/${reviewId}`));

  // Click on buggy LINE (anywhere) → toggle popup
  container.querySelectorAll(".code-line.has-bug").forEach(line => {
    line.addEventListener("click", (e) => {
      // Don't re-trigger if clicking close button
      if (e.target.closest(".bug-popup-close")) return;

      const bugIds = line.dataset.bugs?.split(",") || [];
      const firstPopup = document.getElementById(`bug-popup-${bugIds[0]}`);
      if (!firstPopup) return;

      const isOpen = firstPopup.classList.contains("open");

      // Close all
      container.querySelectorAll(".bug-popup.open").forEach(p => p.classList.remove("open"));
      container.querySelectorAll(".code-line.active-bug").forEach(l => l.classList.remove("active-bug"));

      if (!isOpen) {
        firstPopup.classList.add("open");
        line.classList.add("active-bug");
      }
    });
  });

  // Close button
  container.querySelectorAll(".bug-popup-close").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const popup = document.getElementById(`bug-popup-${btn.dataset.bug}`);
      popup?.classList.remove("open");
      popup?.closest(".code-line")?.classList.remove("active-bug");
    });
  });

  // Click outside code block closes all
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".code-block-wrap")) {
      container.querySelectorAll(".bug-popup.open").forEach(p => p.classList.remove("open"));
      container.querySelectorAll(".code-line.active-bug").forEach(l => l.classList.remove("active-bug"));
    }
  });
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
