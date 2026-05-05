import "./chat.css";

const QUICK_PROMPTS = [
  { icon: "🐛", label: "Critical bugs",   msg: "What are the most critical bugs in this code?" },
  { icon: "⚡", label: "Performance",     msg: "How can I improve the performance of this code?" },
  { icon: "🔒", label: "Security",        msg: "Are there any security vulnerabilities?" },
  { icon: "📖", label: "Explain code",    msg: "Explain what this code does in simple terms." },
  { icon: "✅", label: "Best practices",  msg: "What best practices am I violating?" },
  { icon: "🧪", label: "How to test",     msg: "How should I write tests for this code?" },
];

export async function renderChat(container, reviewId, navigate) {
  container.innerHTML = `<div class="analyzing-overlay"><div class="spinner"></div><p>Loading...</p></div>`;

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
  const criticalCount = bugs.filter(b => b.severity === "critical").length;

  container.innerHTML = `
    <div class="chat-layout">

      <!-- LEFT: Context Panel -->
      <aside class="chat-sidebar">
        <div class="chat-sidebar-header">
          <button class="btn btn-sm" id="back-btn">← Review</button>
        </div>

        <div class="chat-sidebar-file">
          <div class="chat-sidebar-filename">${escHtml(review.fileName)}</div>
          <div class="chat-sidebar-lang">${escHtml(review.language)}</div>
        </div>

        <div class="chat-sidebar-stats">
          <div class="chat-stat">
            <span class="chat-stat-num">${bugs.length}</span>
            <span class="chat-stat-label">Bugs</span>
          </div>
          <div class="chat-stat-div"></div>
          <div class="chat-stat">
            <span class="chat-stat-num ${criticalCount > 0 ? "chat-stat-critical" : ""}">${criticalCount}</span>
            <span class="chat-stat-label">Critical</span>
          </div>
          <div class="chat-stat-div"></div>
          <div class="chat-stat">
            <span class="chat-stat-num">${(review.fileContent || "").split("\n").length}</span>
            <span class="chat-stat-label">Lines</span>
          </div>
        </div>

        <div class="chat-sidebar-section">
          <div class="chat-sidebar-section-title">Quick Ask</div>
          <div class="chat-quick-list">
            ${QUICK_PROMPTS.map(p => `
              <button class="chat-quick-btn" data-msg="${escHtml(p.msg)}">
                <span class="chat-quick-icon">${p.icon}</span>
                <span class="chat-quick-label">${p.label}</span>
                <span class="chat-quick-arrow">→</span>
              </button>`).join("")}
          </div>
        </div>

        ${review.explanation ? `
        <div class="chat-sidebar-section">
          <div class="chat-sidebar-section-title">Summary</div>
          <p class="chat-sidebar-summary">${escHtml(review.explanation)}</p>
        </div>` : ""}
      </aside>

      <!-- RIGHT: Chat Panel -->
      <div class="chat-panel">

        <!-- Chat Topbar -->
        <div class="chat-topbar">
          <div class="chat-topbar-info">
            <span class="chat-online-dot"></span>
            <span class="chat-topbar-title">AI Code Assistant</span>
          </div>
          <div class="chat-topbar-actions">
            <button class="chat-action-btn" id="clear-btn" title="Clear chat">⊘ Clear</button>
          </div>
        </div>

        <!-- Messages -->
        <div class="chat-messages" id="chat-messages">
          <div class="chat-welcome-msg" id="chat-welcome">
            <div class="chat-welcome-avatar">AI</div>
            <div class="chat-welcome-content">
              <p class="chat-welcome-title">Hello! I've analyzed <strong>${escHtml(review.fileName)}</strong></p>
              <p class="chat-welcome-sub">Found ${bugs.length} bug${bugs.length !== 1 ? "s" : ""}${criticalCount > 0 ? ` (${criticalCount} critical)` : ""}. Ask me anything about the code.</p>
              <div class="chat-welcome-chips">
                ${QUICK_PROMPTS.slice(0, 3).map(p => `
                  <button class="chat-welcome-chip" data-msg="${escHtml(p.msg)}">${p.icon} ${p.label}</button>
                `).join("")}
              </div>
            </div>
          </div>
        </div>

        <!-- Input -->
        <div class="chat-input-section">
          <div class="chat-input-box" id="chat-input-box">
            <input
              type="text"
              id="chat-input"
              placeholder="Ask anything about this code..."
              autocomplete="off"
              maxlength="500"
            />
            <div class="chat-input-right">
              <span class="chat-char-count" id="char-count">0/500</span>
              <button class="chat-send-btn" id="chat-send" title="Send (Enter)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
          <div class="chat-input-footer">
            <span>↵ Enter to send</span>
            <span class="chat-input-footer-right">AI may make mistakes — verify important info</span>
          </div>
        </div>

      </div>
    </div>
  `;

  document.getElementById("back-btn").addEventListener("click", () => navigate(`/review/${reviewId}`));

  document.getElementById("clear-btn").addEventListener("click", () => {
    const msgs = document.getElementById("chat-messages");
    msgs.innerHTML = `<div class="chat-divider-msg">Chat cleared</div>`;
  });

  await loadChatHistory(reviewId);

  const chatInput = document.getElementById("chat-input");
  const chatSend = document.getElementById("chat-send");
  const charCount = document.getElementById("char-count");

  chatInput.addEventListener("input", () => {
    const len = chatInput.value.length;
    charCount.textContent = `${len}/500`;
    charCount.classList.toggle("chat-char-warn", len > 400);
  });

  chatSend.addEventListener("click", () => sendMessage(reviewId));
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(reviewId); }
  });

  // Sidebar quick prompts
  container.querySelectorAll(".chat-quick-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      chatInput.value = btn.dataset.msg;
      charCount.textContent = `${chatInput.value.length}/500`;
      sendMessage(reviewId);
    });
  });

  // Welcome chips
  container.querySelectorAll(".chat-welcome-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      chatInput.value = chip.dataset.msg;
      charCount.textContent = `${chatInput.value.length}/500`;
      sendMessage(reviewId);
    });
  });

  chatInput.focus();
}

async function loadChatHistory(reviewId) {
  try {
    const res = await fetch(`/api/reviews/${reviewId}/chat`);
    const history = await res.json();
    if (history.length > 0) {
      document.getElementById("chat-welcome")?.remove();
      history.forEach(m => appendBubble(m.role, m.content, new Date(m.createdAt)));
    }
  } catch { /* ignore */ }
}

async function sendMessage(reviewId) {
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");
  const charCount = document.getElementById("char-count");
  const message = input.value.trim();
  if (!message) return;

  document.getElementById("chat-welcome")?.remove();

  input.value = "";
  charCount.textContent = "0/500";
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
    appendBubble("assistant", "Connection error. Please try again.");
  } finally {
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

function formatMessage(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // **bold**
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // *italic*
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // `inline code`
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // newlines
    .replace(/\n/g, "<br>");
}

function appendBubble(role, content, date = new Date()) {
  const messagesEl = document.getElementById("chat-messages");
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const row = document.createElement("div");
  row.className = `chat-msg-row ${role}`;

  if (role === "assistant") {
    const avatar = document.createElement("div");
    avatar.className = "chat-msg-avatar";
    avatar.textContent = "AI";
    row.appendChild(avatar);
  }

  const wrap = document.createElement("div");
  wrap.className = "chat-msg-wrap";

  const bubble = document.createElement("div");
  bubble.className = `chat-msg-bubble ${role}`;

  if (role === "assistant") {
    bubble.innerHTML = formatMessage(content);
  } else {
    bubble.textContent = content;
  }

  const meta = document.createElement("div");
  meta.className = "chat-msg-meta";
  meta.innerHTML = `<span class="chat-msg-time">${timeStr}</span>`;

  wrap.appendChild(bubble);
  wrap.appendChild(meta);
  row.appendChild(wrap);

  if (role === "user") {
    const avatar = document.createElement("div");
    avatar.className = "chat-msg-avatar user";
    avatar.textContent = "You";
    row.appendChild(avatar);
  }

  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showTyping() {
  const messagesEl = document.getElementById("chat-messages");
  const row = document.createElement("div");
  row.className = "chat-msg-row assistant";
  row.id = "typing-indicator";
  row.innerHTML = `
    <div class="chat-msg-avatar">AI</div>
    <div class="chat-msg-wrap">
      <div class="chat-msg-bubble assistant typing-bubble">
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>
    </div>
  `;
  messagesEl.appendChild(row);
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
