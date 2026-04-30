export function renderHome(container, navigate) {
  container.innerHTML = `
    <div class="container">
      <div class="home-hero">
        <h2>Upload Your Code</h2>
        <p>Get instant AI-powered analysis. Identify bugs, discover improvements, understand your code.</p>
      </div>

      <div class="upload-section">
        <!-- File Upload -->
        <div class="upload-area" id="upload-area">
          <input type="file" id="file-input" accept=".py,.js,.ts,.tsx,.jsx,.java,.cpp,.c,.cs,.rb,.go,.rs,.php,.swift,.kt,.sh,.sql,.html,.css,.json,.xml,.yaml,.yml,.txt" />
          <div class="upload-icon">⬆</div>
          <h3>Click to Upload</h3>
          <p>or drag and drop your code file</p>
          <p class="langs">Python · JavaScript · TypeScript · Java · C++ · Go · Rust · and more</p>
        </div>

        <div class="divider"><span>or paste code</span></div>

        <!-- Paste Area -->
        <div class="paste-area">
          <textarea id="paste-input" placeholder="Paste your code here..."></textarea>
          <div class="paste-controls">
            <input type="text" id="paste-filename" placeholder="filename.js (e.g. app.py)" />
            <button class="btn btn-primary" id="analyze-btn">Analyze Code</button>
          </div>
        </div>

        <!-- Analyzing State -->
        <div class="analyzing-overlay hidden" id="analyzing">
          <div class="spinner"></div>
          <p>Analyzing your code...</p>
        </div>

        <div id="error-msg" class="hidden" style="margin-top:16px;padding:14px;border:3px solid #c0392b;background:#fdf0ef;font-weight:700;color:#c0392b;font-size:0.9rem;"></div>
      </div>
    </div>
  `;

  const uploadArea = document.getElementById("upload-area");
  const fileInput = document.getElementById("file-input");
  const pasteInput = document.getElementById("paste-input");
  const pasteFilename = document.getElementById("paste-filename");
  const analyzeBtn = document.getElementById("analyze-btn");
  const analyzing = document.getElementById("analyzing");
  const errorMsg = document.getElementById("error-msg");

  // Click to upload
  uploadArea.addEventListener("click", () => fileInput.click());

  // Drag & drop
  uploadArea.addEventListener("dragover", (e) => { e.preventDefault(); uploadArea.classList.add("drag-over"); });
  uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("drag-over"));
  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  analyzeBtn.addEventListener("click", () => {
    const code = pasteInput.value.trim();
    const name = pasteFilename.value.trim() || "code.txt";
    if (!code) return showError("Please paste some code first.");
    submitCode(name, code);
  });

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      pasteInput.value = e.target.result;
      pasteFilename.value = file.name;
    };
    reader.readAsText(file);
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove("hidden");
  }

  async function submitCode(fileName, fileContent) {
    errorMsg.classList.add("hidden");
    analyzing.classList.remove("hidden");
    analyzeBtn.disabled = true;

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName, fileContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      navigate(`/review/${data.reviewId}`);
    } catch (err) {
      analyzing.classList.add("hidden");
      analyzeBtn.disabled = false;
      showError(err.message);
    }
  }
}
