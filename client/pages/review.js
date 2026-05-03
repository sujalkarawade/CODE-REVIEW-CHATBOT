import hljs from "highlight.js";
import "./review.css";

const severityClass = {
  critical: "severity-critical",
  high: "severity-high",
  medium: "severity-medium",
  low: "severity-low",
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
  const highlighted = hljs.highlightAuto(review.fileContent || "").value;

  container.innerHTML = `
    <div class="container review-page">

      <!-- Review Top Bar -->
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

      <!-- Code -->
      <div class="section-block">
        <div class="section-header">⌨ &nbsp;Code</div>
        <div class="section-body code-block">
          <pre><code class="hljs">${highlighted}</code></pre>
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
                <div class="bug-item">
                  <div class="bug-meta">
                    <span class="severity-badge ${severityClass[b.severity] || ""}">${escHtml(b.severity)}</span>
                    ${b.line ? `<span class="bug-line">Line ${b.line}</span>` : ""}
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

      <!-- Chat CTA Banner -->
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
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
