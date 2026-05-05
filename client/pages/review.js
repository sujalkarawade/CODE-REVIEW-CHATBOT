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

  const totalLines = lines.length;
  const bugLineNums = bugs.filter(b => b.line).map(b => b.line);

  const codeLines = lines.map((lineHtml, i) => {
    const lineNum = i + 1;
    const lineBugs = bugsByLine[lineNum] || [];
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
          <button class="btn btn-primary" id="chat-btn">Chat</button>
        </div>
      </div>

      <!-- Code Section -->
      <div class="section-block">
        <div class="section-header">
          ⌨ &nbsp;Code
          ${inlineBugCount > 0 ? `<span class="section-count">${inlineBugCount} inline bug${inlineBugCount !== 1 ? "s" : ""}</span>` : ""}
        </div>
        <div class="code-toolbar">
          <div class="code-toolbar-left">
            <span class="code-meta-item">
              <span class="code-meta-label">Lines</span>
              <span class="code-meta-val">${totalLines}</span>
            </span>
            <span class="code-meta-item">
              <span class="code-meta-label">Language</span>
              <span class="code-meta-val">${escHtml(review.language)}</span>
            </span>
            ${inlineBugCount > 0 ? `
            <span class="code-meta-item code-meta-bugs">
              <span class="code-meta-label">Bugs</span>
              <span class="code-meta-val">${inlineBugCount} flagged</span>
            </span>` : ""}
          </div>
          <div class="code-toolbar-right">
            ${inlineBugCount > 0 ? `
            <button class="code-tool-btn" id="code-prev-bug">↑ Prev Bug</button>
            <button class="code-tool-btn" id="code-next-bug">↓ Next Bug</button>` : ""}
            <button class="code-tool-btn" id="code-copy-btn">⎘ Copy</button>
          </div>
        </div>
        <div class="section-body code-block-wrap" id="code-block-wrap">
          <div class="code-lines">${codeLines}</div>
        </div>
      </div>

      <!-- Diff View (hidden by default) -->
      <div class="section-block hidden" id="diff-section">
        <div class="section-header">
          ⇄ &nbsp;Diff View — Original vs Fixed
          <button class="btn btn-sm" id="diff-close" style="margin-left:auto;border-color:rgba(255,255,255,0.4);color:#fff;background:transparent;">✕ Close</button>
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

  // ── Code toolbar ──
  let bugNavIdx = -1;

  if (inlineBugCount > 0) {
    document.getElementById("code-next-bug")?.addEventListener("click", () => {
      bugNavIdx = (bugNavIdx + 1) % bugLineNums.length;
      jumpToBugLine(bugLineNums[bugNavIdx]);
    });
    document.getElementById("code-prev-bug")?.addEventListener("click", () => {
      bugNavIdx = (bugNavIdx - 1 + bugLineNums.length) % bugLineNums.length;
      jumpToBugLine(bugLineNums[bugNavIdx]);
    });
  }

  document.getElementById("code-copy-btn")?.addEventListener("click", () => {
    navigator.clipboard.writeText(review.fileContent).then(() => {
      const btn = document.getElementById("code-copy-btn");
      btn.textContent = "✓ Copied!";
      setTimeout(() => { btn.textContent = "⎘ Copy"; }, 2000);
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

      // Compute diff stats
      let added = 0, removed = 0, modified = 0;
      const diffData = [];
      for (let i = 0; i < maxLen; i++) {
        const orig = origLines[i] ?? null;
        const fixed = fixedLines[i] ?? null;
        let type = "same";
        if (orig === null) { type = "added"; added++; }
        else if (fixed === null) { type = "removed"; removed++; }
        else if (orig !== fixed) { type = "modified"; modified++; }
        diffData.push({ i, orig, fixed, origH: origHl[i] ?? "", fixedH: fixedHl[i] ?? "", type });
      }

      let showChangedOnly = false;

      function renderDiffRows(changedOnly) {
        return diffData
          .filter(d => !changedOnly || d.type !== "same")
          .map(d => {
            const lineNum = d.i + 1;
            const typeClass = `diff-${d.type}`;
            const origSymbol = d.type === "added" ? "" : d.type === "removed" ? "−" : d.type === "modified" ? "~" : "";
            const fixedSymbol = d.type === "removed" ? "" : d.type === "added" ? "+" : d.type === "modified" ? "+" : "";
            return `
              <div class="diff-row ${typeClass}" data-line="${lineNum}">
                <div class="diff-side diff-orig">
                  <span class="diff-gutter ${d.type !== "added" ? "diff-gutter-" + d.type : ""}">${origSymbol}</span>
                  <span class="diff-ln">${d.type !== "added" ? lineNum : ""}</span>
                  <span class="diff-code">${d.type !== "added" ? (d.origH || " ") : ""}</span>
                </div>
                <div class="diff-divider"></div>
                <div class="diff-side diff-fixed">
                  <span class="diff-gutter ${d.type !== "removed" ? "diff-gutter-" + (d.type === "modified" ? "added" : d.type) : ""}">${fixedSymbol}</span>
                  <span class="diff-ln">${d.type !== "removed" ? lineNum : ""}</span>
                  <span class="diff-code">${d.type !== "removed" ? (d.fixedH || " ") : ""}</span>
                </div>
              </div>`;
          }).join("");
      }

      // Change navigation
      const changeLines = diffData.filter(d => d.type !== "same").map(d => d.i + 1);
      let changeIdx = -1;

      function jumpToChange(dir) {
        if (!changeLines.length) return;
        changeIdx = (changeIdx + dir + changeLines.length) % changeLines.length;
        const target = document.querySelector(`.diff-row[data-line="${changeLines[changeIdx]}"]`);
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
        document.querySelectorAll(".diff-row.jump-highlight").forEach(r => r.classList.remove("jump-highlight"));
        target?.classList.add("jump-highlight");
      }

      document.getElementById("diff-body").innerHTML = `
        <div class="diff-stats-bar">
          <div class="diff-stat diff-stat-modified">
            <span class="diff-stat-icon">~</span>
            <span>${modified} modified</span>
          </div>
          <div class="diff-stat diff-stat-added">
            <span class="diff-stat-icon">+</span>
            <span>${added} added</span>
          </div>
          <div class="diff-stat diff-stat-removed">
            <span class="diff-stat-icon">−</span>
            <span>${removed} removed</span>
          </div>
          <div class="diff-stat-spacer"></div>
          <span class="diff-total-lines">${maxLen} lines total</span>
        </div>

        <div class="diff-toolbar">
          <div class="diff-col-header">
            <span class="diff-col-tag diff-col-tag-orig">ORIGINAL</span>
            <span class="diff-col-filename">${escHtml(review.fileName)}</span>
          </div>
          <div class="diff-col-header">
            <span class="diff-col-tag diff-col-tag-fixed">FIXED</span>
            <span class="diff-col-filename">${escHtml(review.fileName)}</span>
          </div>
          <div class="diff-toolbar-actions">
            <button class="btn btn-sm" id="diff-prev-btn" title="Previous change">↑ Prev</button>
            <button class="btn btn-sm" id="diff-next-btn" title="Next change">↓ Next</button>
            <button class="btn btn-sm" id="diff-toggle-btn">Show Changes Only</button>
            <button class="btn btn-primary btn-sm" id="copy-fixed-btn">⎘ Copy Fixed</button>
          </div>
        </div>

        <div class="diff-lines" id="diff-lines">
          ${renderDiffRows(false)}
        </div>
      `;

      document.getElementById("diff-prev-btn").addEventListener("click", () => jumpToChange(-1));
      document.getElementById("diff-next-btn").addEventListener("click", () => jumpToChange(1));

      document.getElementById("diff-toggle-btn").addEventListener("click", () => {
        showChangedOnly = !showChangedOnly;
        document.getElementById("diff-lines").innerHTML = renderDiffRows(showChangedOnly);
        document.getElementById("diff-toggle-btn").textContent = showChangedOnly ? "Show All Lines" : "Show Changes Only";
        changeIdx = -1;
      });

      document.getElementById("copy-fixed-btn").addEventListener("click", () => {
        navigator.clipboard.writeText(data.fixedCode).then(() => {
          const btn = document.getElementById("copy-fixed-btn");
          btn.textContent = "✓ Copied!";
          setTimeout(() => { btn.textContent = "⎘ Copy Fixed"; }, 2000);
        });
      });

      // Auto-jump to first change
      if (changeLines.length) setTimeout(() => jumpToChange(1), 300);

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

function jumpToBugLine(lineNum) {
  const target = document.querySelector(`.code-line[data-line="${lineNum}"]`);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  document.querySelectorAll(".code-line.jump-highlight").forEach(l => l.classList.remove("jump-highlight"));
  target.classList.add("jump-highlight");
  setTimeout(() => target.classList.remove("jump-highlight"), 1800);
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
