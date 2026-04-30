export async function renderHistory(container, navigate) {
  container.innerHTML = `<div class="analyzing-overlay"><div class="spinner"></div><p>Loading History...</p></div>`;

  let reviews = [];
  try {
    const res = await fetch("/api/reviews");
    reviews = await res.json();
  } catch {
    reviews = [];
  }

  container.innerHTML = `
    <div class="container history-page">
      <h2>Review History</h2>
      ${reviews.length === 0
        ? `<div class="history-empty">No reviews yet. Upload some code to get started.</div>`
        : `<div class="history-grid">
            ${reviews.map(r => `
              <div class="history-card" data-id="${r.id}">
                <div class="history-card-name">${escHtml(r.fileName)}</div>
                <div class="history-card-lang">${escHtml(r.language)}</div>
                <div class="history-card-stats">
                  <div class="stat">${Array.isArray(r.bugs) ? r.bugs.length : 0} <span>bugs</span></div>
                  <div class="stat">${Array.isArray(r.suggestions) ? r.suggestions.length : 0} <span>suggestions</span></div>
                </div>
                <div class="history-card-date">${new Date(r.createdAt).toLocaleString()}</div>
              </div>`).join("")}
          </div>`}
    </div>
  `;

  container.querySelectorAll(".history-card").forEach(card => {
    card.addEventListener("click", () => navigate(`/review/${card.dataset.id}`));
  });
}

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
