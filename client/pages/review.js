import hljs from "highlight.js";

const severityClass = { critical: "severity-critical", high: "severity-high", medium: "severity-medium", low: "severity-low" };

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
        <button class="btn btn-primary" id="go-home">Go Home</button>
      </div>`;
    container.querySelector("#go-home").addEventListener("click", () => navigate("/"));
    return;
  }

  const bugs = Array.isArray(review.bugs) ? review.bugs : [];
  const suggestions = Array.isArray(review.suggestions) ? review.suggestions : [];
  const highlighted = hljs.highlightAuto(review.fileContent || "").value;

  container.innerHTML = `
    <div class="review-layout">
      <!-- Main Content -->
      <div class="review-main container" style="padding-left:0">
        <div style="margin-bottom:24px;padding-top:32px">
          <span class="file-name-badge">${escHtml(review.fileName)}</span><br>
          <span class="lang-badge">${escHtml(review.language)}</span>
        </div>

        <!-- Code -->
        <div class="section-block">
          <div class="section-header">⌨ Code</div>
          <div class="section-body code-block">
            <pre><code class="hljs">${highlighted}</code></pre>
          </div>
        </div>

        <!-- Bugs -->
        <div class="section-block">
          <div class="section-header">⚠ Bugs (${bugs.length})</div>
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
          <div class="section-header">💡 Suggestions (${suggestions.length})</div>
          <div class="section-body">
            ${suggestions.length === 0
              ? `<p class="no-suggestions">No suggestions at this time.</p>`
              : suggestions.map(s => `
                <div class="suggestion-item">
                  <p class="suggestion-category">${escHtml(s.category)}</p>
                  <p class="suggestion-text">${escHtml(s.suggestion)}</p>
                  <p class="suggestion-benefit"><strong>Benefit:</strong> ${escHtml(s.benefit)}</p>
                </div>`).join("")}
          </div>
        </div>

        <!-- Explanation -->
        <div class="section-block">
          <div class="section-header">📖 Explanation</div>
          <div class="section-body">
            <p class="explanation-text">${escHtml(review.explanation)}</p>
          </div>
        </div>
      </div>

      <!-- Chat Sidebar -->
      <div class="review-sidebar">
        <div class="chat-header">💬 Chat</div>
        <div class="chat-messages" id="chat-messages">
          <p class="chat-empty">Ask questions about this code...</p>
        </div>
        <div class="chat-input-area">
          <input type="text" id="chat-input" placeholder="Ask about this code..." />
          <button class="btn btn-primary" id="chat-send">Send</button>
        </div>
      </div>
    </div>
  `;

  // Load existing chat history
  loadChatHistory(reviewId);

  const chatInput = document.getElementById("chat-input");
  const chatSend = document.getElementById("chat-send");

  chatSend.addEventListener("click", () => sendMessage(reviewId));
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(reviewId); }
  });
}

async function loadChatHistory(reviewId) {
  try {
    const res = await fetch(`/api/reviews/${reviewId}/chat`);
    const history = await res.json();
    if (history.length > 0) {
      const messagesEl = document.getElementById("chat-messages");
      messagesEl.innerHTML = "";
      history.forEach(m => appendBubble(m.role, m.content));
    }
  } catch { /* ignore */ }
}

async function sendMessage(reviewId) {
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");
  const message = input.value.trim();
  if (!message) return;

  input.value = "";
  input.disabled = true;
  sendBtn.disabled = true;

  appendBubble("user", message);
  showTyping();

  try {
    const res = await fetch(`/api/reviews/${reviewId}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    removeTyping();
    appendBubble("assistant", data.message || data.error || "No response.");
  } catch {
    removeTyping();
    appendBubble("assistant", "Error sending message. Please try again.");
  } finally {
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

function appendBubble(role, content) {
  const messagesEl = document.getElementById("chat-messages");
  const empty = messagesEl.querySelector(".chat-empty");
  if (empty) empty.remove();

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = content;
  messagesEl.appendChild(bubble);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showTyping() {
  const messagesEl = document.getElementById("chat-messages");
  const typing = document.createElement("div");
  typing.className = "chat-typing";
  typing.id = "typing-indicator";
  typing.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
  messagesEl.appendChild(typing);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTyping() {
  document.getElementById("typing-indicator")?.remove();
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
