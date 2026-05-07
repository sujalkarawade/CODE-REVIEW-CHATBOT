import "./home.css";

export function renderHome(container, navigate) {
  container.innerHTML = `
    <div class="home-split" id="home-split">

      <!-- LEFT: Upload -->
      <div class="split-panel split-left" id="panel-left" data-side="left">
        <div class="split-idle" id="idle-left">
          <div class="split-label">01</div>
          <div class="split-big-icon">↑</div>
          <h2 class="split-title">Upload<br>File</h2>
          <p class="split-desc">Drag & drop or browse<br>your code file</p>
          <span class="split-hint">Click to open →</span>
        </div>
        <div class="split-active hidden" id="active-left">
          <button class="split-back" id="back-left">← Back</button>
          <div class="split-active-inner">
            <h3 class="split-active-title">Upload File</h3>
            <div class="upload-zone" id="upload-zone">
              <input type="file" id="file-input" accept=".py,.js,.ts,.tsx,.jsx,.java,.cpp,.c,.cs,.rb,.go,.rs,.php,.swift,.kt,.sh,.sql,.html,.css,.json,.xml,.yaml,.yml,.txt" />
              <div class="upload-zone-icon">↑</div>
              <p class="upload-zone-main">Drop your file here</p>
              <p class="upload-zone-sub">or <span class="upload-browse">browse files</span></p>
              <p class="upload-zone-langs">Python · JS · TS · Java · C++ · Go · Rust · more</p>
            </div>
            <div class="upload-selected hidden" id="upload-selected">
              <div class="upload-selected-row">
                <span class="upload-selected-icon">◈</span>
                <div class="upload-selected-info">
                  <span class="upload-selected-name" id="sel-name"></span>
                  <span class="upload-selected-size" id="sel-size"></span>
                </div>
                <button class="upload-selected-remove" id="remove-file">✕</button>
              </div>
              <button class="home-submit-btn" id="analyze-upload">Analyze Code →</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div class="split-divider" id="split-divider"></div>

      <!-- RIGHT: Paste -->
      <div class="split-panel split-right" id="panel-right" data-side="right">
        <div class="split-idle" id="idle-right">
          <div class="split-label">02</div>
          <div class="split-big-icon">✎</div>
          <h2 class="split-title">Paste<br>Code</h2>
          <p class="split-desc">Type or paste your<br>code directly</p>
          <span class="split-hint">Click to open →</span>
        </div>
        <div class="split-active hidden" id="active-right">
          <button class="split-back" id="back-right">← Back</button>
          <div class="split-active-inner">
            <h3 class="split-active-title">Paste Code</h3>
            <input class="paste-fname" id="paste-fname" type="text" placeholder="filename.py" />
            <textarea class="paste-code" id="paste-code" placeholder="Paste your code here..."></textarea>
            <div class="paste-bottom">
              <span class="paste-count" id="paste-count">0 chars</span>
              <button class="home-submit-btn" id="analyze-paste">Analyze Code →</button>
            </div>
          </div>
        </div>
      </div>

    </div>

    <div class="home-analyzing hidden" id="home-analyzing">
      <div class="spinner"></div>
      <p>Analyzing your code...</p>
    </div>

    <div class="home-error hidden" id="home-error"></div>
  `;

  const split = document.getElementById("home-split");
  const panelLeft = document.getElementById("panel-left");
  const panelRight = document.getElementById("panel-right");
  const idleLeft = document.getElementById("idle-left");
  const idleRight = document.getElementById("idle-right");
  const activeLeft = document.getElementById("active-left");
  const activeRight = document.getElementById("active-right");
  const analyzing = document.getElementById("home-analyzing");
  const errorEl = document.getElementById("home-error");

  // Hover expand
  panelLeft.addEventListener("mouseenter", () => {
    if (!split.classList.contains("expanded")) split.classList.add("hover-left");
  });
  panelLeft.addEventListener("mouseleave", () => split.classList.remove("hover-left"));
  panelRight.addEventListener("mouseenter", () => {
    if (!split.classList.contains("expanded")) split.classList.add("hover-right");
  });
  panelRight.addEventListener("mouseleave", () => split.classList.remove("hover-right"));

  // Click to expand
  idleLeft.addEventListener("click", () => openPanel("left"));
  idleRight.addEventListener("click", () => openPanel("right"));

  document.getElementById("back-left").addEventListener("click", () => closePanel());
  document.getElementById("back-right").addEventListener("click", () => closePanel());

  function openPanel(side) {
    split.classList.remove("hover-left", "hover-right");
    split.classList.add("expanded", `expand-${side}`);
    if (side === "left") {
      idleLeft.classList.add("hidden");
      activeLeft.classList.remove("hidden");
    } else {
      idleRight.classList.add("hidden");
      activeRight.classList.remove("hidden");
      setTimeout(() => document.getElementById("paste-code").focus(), 200);
    }
  }

  function closePanel() {
    split.classList.remove("expanded", "expand-left", "expand-right");
    idleLeft.classList.remove("hidden");
    idleRight.classList.remove("hidden");
    activeLeft.classList.add("hidden");
    activeRight.classList.add("hidden");
    errorEl.classList.add("hidden");
  }

  // Upload logic
  const uploadZone = document.getElementById("upload-zone");
  const fileInput = document.getElementById("file-input");
  const uploadSelected = document.getElementById("upload-selected");
  let selectedFile = null;

  uploadZone.addEventListener("click", () => fileInput.click());
  uploadZone.addEventListener("dragover", e => { e.preventDefault(); uploadZone.classList.add("drag-over"); });
  uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("drag-over"));
  uploadZone.addEventListener("drop", e => {
    e.preventDefault();
    uploadZone.classList.remove("drag-over");
    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener("change", () => { if (fileInput.files[0]) setFile(fileInput.files[0]); });

  document.getElementById("remove-file").addEventListener("click", e => {
    e.stopPropagation();
    selectedFile = null;
    fileInput.value = "";
    uploadZone.classList.remove("hidden");
    uploadSelected.classList.add("hidden");
  });

  document.getElementById("analyze-upload").addEventListener("click", () => {
    if (!selectedFile) return showError("Please select a file.");
    const reader = new FileReader();
    reader.onload = e => submit(selectedFile.name, e.target.result);
    reader.readAsText(selectedFile);
  });

  function setFile(file) {
    selectedFile = file;
    document.getElementById("sel-name").textContent = file.name;
    document.getElementById("sel-size").textContent = formatSize(file.size);
    uploadZone.classList.add("hidden");
    uploadSelected.classList.remove("hidden");
  }

  // Paste logic
  const pasteCode = document.getElementById("paste-code");
  const pasteCount = document.getElementById("paste-count");
  pasteCode.addEventListener("input", () => {
    const l = pasteCode.value.length;
    pasteCount.textContent = `${l.toLocaleString()} char${l !== 1 ? "s" : ""}`;
  });

  document.getElementById("analyze-paste").addEventListener("click", () => {
    const code = pasteCode.value.trim();
    const name = document.getElementById("paste-fname").value.trim() || "code.txt";
    if (!code) return showError("Please paste some code first.");
    submit(name, code);
  });

  // Submit
  function showError(msg) {
    errorEl.textContent = "⚠ " + msg;
    errorEl.classList.remove("hidden");
  }

  async function submit(fileName, fileContent) {
    errorEl.classList.add("hidden");
    split.classList.add("hidden");
    analyzing.classList.remove("hidden");
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
      split.classList.remove("hidden");
      showError(err.message);
    }
  }

  function formatSize(b) {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
    return `${(b/1048576).toFixed(1)} MB`;
  }
}
