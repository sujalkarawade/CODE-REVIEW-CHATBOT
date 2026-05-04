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

const ALL_SEVERITIES = ["critical", "high", "medium", "low"];

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

  function buildCodeLines(activeSeverities) {
    return lines.map((lineHtml, i) => {
      const lineNum = i + 1;
      const lineBugs = (bugsByLine[lineNum] || []).filter(b =>
        activeSeverities.includes(b.severity)
      );
      const hasBug = lineBugs.length > 0;
      const topBug = hasBug ? lineBugs[0] : null;
      const lineClass = hasBug
        ? `code-line has-bug ${severityClass[topBug.severity] || ""}`
        : "code-line";

      const badge = hasBug ? lineBugs.map(b =>
        `<span class="bug-badge ${severityClass[b.severity]}" data-bug="${b.idx}" title="${escHtml(b.issue)}">
          <span class="bug-badge-dot"></span>
          <span class="bug-badge-label">${escHtml(b.severity[0].toUpperCase())}</span>
        </span>`
      ).join("") : "";

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
  }

  // Severity counts for filter badges
  const sevCounts = {};
  ALL_SEVERITIES.forEach(s => { sevCounts[s] = bugs.filter(b => b.severity === s).length; });

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
          <button class="btn btn-sm" id="diff-btn">⇄ Diff View</button>
          <button class="btn btn-primary" id="chat-btn">💬 Chat</button>
        </div>
      </div>

      <!-- Code Section -->
      <div class="section-block" id="code-section">
        <div class="section-header">
          ⌨ &nbsp;Code
          ${inlineBugCount > 0 ? `<span class="section-count">${inlineBugCount} inline bug${inlineBugCount !== 1 ? "s" : ""}</span>` : ""}
          <!-- Severity Filter -->
          <div class="severity-filter" id="severity-filter">
            ${ALL_SEVERITIES.map(s => sevCounts[s] > 0 ? `
              <button class="sev-filter-btn active ${severityClass[s]}" data-sev="${s}">
                ${s} <span class="sev-filter-count">${sevCounts[s]}</span>
              </button>` : ""
            ).join("")}
          </div>
        </div>
        <div class="section-body code-block-wrap" id="code-block-wrap">
          <div class="code-lines" id="code-lines">${buildCodeLines(ALL_SEVERITIES)}</div>
        </div>
      </div>

      <!-- Diff View (hidden by default) -->
      <div class="section-block hidden" id="diff-section">
        <div class="section-header">
          ⇄ &nbsp;Diff View — Original vs Fixed
          <button class="btn btn-sm diff-close-btn" id="diff-close" style="margin-left:auto;border-color:rgba(255,255,255,0.4);color:#fff;background:transparent;">✕ Close</button>
        </div>
        <div class="section-body diff-body" id="diff-body">
          <div class="diff-loading">
            <div class="spinner"></div>
            <p>Generating fixed code...</p>
          </div>
        </div>
      </div>

      <!-- Bugs -->
      <div class="review-two-col">
        <div class="section-block">
          <div class="section-header">
            ⚠ &nbsp;Bugs
            <span class="section-count">${bugs.length}</span>
          </div>
          <div class="section-body" id="bugs-list">
            ${renderBugsList(bugs, bugs.map((_, i) => i))}
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

  // ── Navigation ──
  document.getElementById("back-btn").addEventListener("click", () => navigate("/"));
  document.getElementById("chat-btn").addEventListener("click", () => navigate(`/chat/${reviewId}`));
  document.getElementById("chat-cta-btn").addEventListener("click", () => navigate(`/chat/${reviewId}`));

  // ── Severity Filter ──
  let activeSeverities = [...ALL_SEVERITIES];

  container.querySelectorAll(".sev-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const sev = btn.dataset.sev;
      if (activeSeverities.includes(sev)) {
        if (activeSeverities.length === 1) return; // keep at least one
        activeSeverities = activeSeverities.filter(s => s !== sev);
        btn.classList.remove("active");
      } else {
        activeSeverities.push(sev);
        btn.classList.add("active");
      }
      // Re-render code lines
      document.getElementById("code-lines").innerHTML = buildCodeLines(activeSeverities);
      // Re-render bugs list
      const visibleIdxs = bugs.map((b, i) => ({ b, i }))
        .filter(({ b }) => activeSeverities.includes(b.severity))
        .map(({ i }) => i);
      document.getElementById("bugs-list").innerHTML = renderBugsList(bugs, visibleIdxs);
      attachLineClickHandlers(container);
    });
  });

  // ── Diff View ──
  let diffLoaded = false;

  document.getElementById("diff-btn").addEventListener("click", async () => {
    const diffSection = document.getElementById("diff-section");
    diffSection.classList.remove("hidden");
    diffSection.scrollIntoView({ behavior: "smooth", block: "start" });

    if (diffLoaded) return;
    diffLoaded = true;

    try {
      const res = await fetch(`/api/reviews/${reviewId}/fix`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const origLines = (review.fileContent || "").split("\n");
      const fixedLines = (data.fixedCode || "").split("\n");
      const origHl = hljs.highlightAuto(review.fileContent || "").value.split("\n");
      const fixedHl = hljs.highlightAuto(data.fixedCode || "").value.split("\n");

      const maxLen = Math.max(origLines.length, fixedLines.length);
      let diffRows = "";
      for (let i = 0; i < maxLen; i++) {
        const orig = origLines[i] ?? "";
        const fixed = fixedLines[i] ?? "";
        const origH = origHl[i] ?? "";
        const fixedH = fixedHl[i] ?? "";
        const changed = orig !== fixed;
        diffRows += `
          <div class="diff-row ${changed ? "diff-changed" : ""}">
            <div class="diff-side diff-orig">
              <span class="diff-ln">${i + 1}</span>
              <span class="diff-code">${origH || " "}</span>
            </div>
            <div class="diff-divider"></div>
            <div class="diff-side diff-fixed">
              <span class="diff-ln">${i + 1}</span>
              <span class="diff-code">${fixedH || " "}</span>
            </div>
          </div>`;
      }

      document.getElementById("diff-body").innerHTML = `
        <div class="diff-toolbar">
          <div class="diff-col-label">Original</div>
          <div class="diff-col-label">Fixed</div>
          <button class="btn btn-sm" id="copy-fixed-btn">⎘ Copy Fixed Code</button>
        </div>
        <div class="diff-lines">${diffRows}</div>
      `;

      // Copy fixed code button
      document.getElementById("copy-fixed-btn").addEventListener("click", () => {
        navigator.clipboard.writeText(data.fixedCode).then(() => {
          const btn = document.getElementById("copy-fixed-btn");
          btn.textContent = "✓ Copied!";
          setTimeout(() => { btn.textContent = "⎘ Copy Fixed Code"; }, 2000);
        });
      });

    } catch (err) {
      document.getElementById("diff-body").innerHTML = `
        <p style="padding:20px;font-weight:700;color:#c0392b;">Failed to generate fix: ${escHtml(err.message)}</p>`;
    }
  });

  document.getElementById("diff-close").addEventListener("click", () => {
    document.getElementById("diff-section").classList.add("hidden");
  });

  // ── Line click handlers ──
  attachLineClickHandlers(container);
}

function renderBugsList(bugs, visibleIdxs) {
  if (bugs.length === 0) return `<p class="no-bugs">✓ No bugs detected!</p>`;
  if (visibleIdxs.length === 0) return `<p class="no-bugs" style="color:var(--gray-400)">No bugs match the current filter.</p>`;
  return visibleIdxs.map(i => {
    const b = bugs[i];
    return `
      <div class="bug-item">
        <div class="bug-meta">
          <span class="severity-badge ${severityClass[b.severity] || ""}">${escHtml(b.severity)}</span>
          ${b.line ? `<span class="bug-line-tag">Line ${b.line}</span>` : ""}
        </div>
        <p class="bug-issue">${escHtml(b.issue)}</p>
        <p class="bug-fix"><strong>Fix:</strong> ${escHtml(b.fix)}</p>
      </div>`;
  }).join("");
}

function attachLineClickHandlers(container) {
  container.querySelectorAll(".code-line.has-bug").forEach(line => {
    line.addEventListener("click", (e) => {
      if (e.target.closest(".bug-popup-close")) return;
      const bugIds = line.dataset.bugs?.split(",") || [];
      const firstPopup = document.getElementById(`bug-popup-${bugIds[0]}`);
      if (!firstPopup) return;
      const isOpen = firstPopup.classList.contains("open");
      container.querySelectorAll(".bug-popup.open").forEach(p => p.classList.remove("open"));
      container.querySelectorAll(".code-line.active-bug").forEach(l => l.classList.remove("active-bug"));
      if (!isOpen) { firstPopup.classList.add("open"); line.classList.add("active-bug"); }
    });
  });

  container.querySelectorAll(".bug-popup-close").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const popup = document.getElementById(`bug-popup-${btn.dataset.bug}`);
      popup?.classList.remove("open");
      popup?.closest(".code-line")?.classList.remove("active-bug");
    });
  });

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
