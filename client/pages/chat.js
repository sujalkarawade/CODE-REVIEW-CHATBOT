import "./chat.css";

export async function renderChat(container, reviewId, navigate) {
  container.innerHTML = `<div class="analyzing-overlay"><div class="spinner"></div><p>Loading Chat...</p></div>`;

  // Load review info for context header
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

  container.innerHTML = `
    <div class="chat-page">

      <!-- Chat Header Bar -->
      <div class="chat-page-header">
        <div class="chat-page-header-left">
          <button class="btn btn-sm" id="back-to-review">← Back to Review</button>
          <div class="chat-context-info">
            <span class="chat-context-file">${escHtml(review.fileName)}</span>
            <span class="chat-context-lang">${escHtml(review.language)}</span>
          </div>
        </div>
        <div class="chat-page-title">💬 Chat with AI</div>
      </div>

      <!-- Messages -->
      <div class="chat-page-messages" id="chat-messages">
        <div class="chat-welcome">
          <div class="chat-welcome-icon">🤖</div>
          <h3>Ask me anything about <strong>${escHtml(review.fileName)}</strong></h3>
          <p>I've already analyzed your code. Ask about bugs, improvements, how it works, or anything else.</p>
          <div class="chat-suggestions">
            <button class="chat-suggestion-chip" data-msg="What are the most critical issues in this code?">What are the most critical issues?</button>
            <button class="chat-suggestion-chip" data-msg="How can I improve the performance of this code?">How to improve performance?</button>
            <button class="chat-suggestion-chip" data-msg="Explain what this code does in simple terms.">Explain this code simply</button>
            <button class="chat-suggestion-chip" data-msg="Are there any security vulnerabilities?">Any security issues?</button>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="chat-page-input-area">
        <div class="chat-page-input-wrap">
          <input type="text" id="chat-input" placeholder="Ask about this code..." autocomplete="off" />
          <button class="btn btn-primary" id="chat-send">
            <span id="send-label">Send</span>
          </button>
        </div>
        <p class="chat-hint">Press Enter to send · Shift+Enter for new line</p>
      </div>

    </div>
  `;

  document.getElementById("back-to-review").addEventListener("click", () => navigate(`/review/${reviewId}`));

  // Load existing history
  await loadChatHistory(reviewId);

  const chatInput = document.getElementById("chat-input");
  const chatSend = document.getElementById("chat-send");

  chatSend.addEventListener("click", () => sendMessage(reviewId));
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(reviewId); }
  });

  // Suggestion chips
  container.querySelectorAll(".chat-suggestion-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      chatInput.value = chip.dataset.msg;
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
      // Hide welcome screen
      const welcome = document.querySelector(".chat-welcome");
      if (welcome) welcome.remove();
      history.forEach(m => appendBubble(m.role, m.content));
    }
  } catch { /* ignore */ }
}

async function sendMessage(reviewId) {
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");
  const message = input.value.trim();
  if (!message) return;

  // Hide welcome on first message
  const welcome = document.querySelector(".chat-welcome");
  if (welcome) welcome.remove();

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

  const row = document.createElement("div");
  row.className = `chat-row ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "chat-avatar";
  avatar.textContent = role === "user" ? "U" : "AI";

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = content;

  if (role === "user") {
    row.appendChild(bubble);
    row.appendChild(avatar);
  } else {
    row.appendChild(avatar);
    row.appendChild(bubble);
  }

  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showTyping() {
  const messagesEl = document.getElementById("chat-messages");
  const row = document.createElement("div");
  row.className = "chat-row assistant";
  row.id = "typing-indicator";
  row.innerHTML = `
    <div class="chat-avatar">AI</div>
    <div class="chat-typing"><div class="typing-dots"><span></span><span></span><span></span></div></div>
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
