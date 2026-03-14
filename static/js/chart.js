(function () {
  const messagesEl = document.getElementById("messages");
  const welcomeEl = document.getElementById("welcome-state");
  const inputEl = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");
  const typingEl = document.getElementById("typing-indicator");
  const clearBtn = document.getElementById("clear-btn");
  const attachBtn = document.getElementById("attach-btn");
  const fileInput = document.getElementById("file-input");
  const fileChip = document.getElementById("file-chip");
  const fileChipName = document.getElementById("file-chip-name");
  const fileRemoveBtn = document.getElementById("file-remove-btn");
  const inputBox = document.getElementById("input-box");

  let selectedFile = null;
  let conversation = []; // {role, text, time}
  let isGenerating = false;

  /* ─── Helpers ─── */
  function now() {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function autoResize() {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 144) + "px";
    updateSendButtonState();
  }

  function updateSendButtonState() {
    sendBtn.disabled = isGenerating || (!inputEl.value.trim() && !selectedFile);
  }

  function scrollBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /* ─── Render a single message ─── */
  function renderMessage(role, text, time) {
    const isUser = role === "user";
    const row = document.createElement("div");
    row.className =
      "msg-row flex items-end gap-3 " + (isUser ? "flex-row-reverse" : "");

    const avatar = isUser
      ? `<div class="w-7 h-7 rounded-xl bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 mb-1 text-white text-xs font-bold">U</div>`
      : `<div class="w-7 h-7 rounded-xl bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0 mb-1">
           <svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
         </div>`;

    // Format text: newlines → <br>, **bold**
    const formatted = escapeHtml(text)
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    const bubble = `
      <div class="max-w-[75%] md:max-w-[60%]">
        <div class="${isUser ? "msg-bubble-user" : "msg-bubble-ai"} rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "text-white" : "text-slate-200"}">${formatted}</div>
        <p class="text-[10px] text-slate-600 mt-1.5 ${isUser ? "text-right" : ""}">${time}</p>
      </div>`;

    row.innerHTML = avatar + bubble;
    return row;
  }

  /* ─── Show / hide welcome state ─── */
  function setWelcome(show) {
    welcomeEl.style.display = show ? "flex" : "none";
  }

  /* ─── Append message to DOM ─── */
  function addMessage(role, text) {
    const t = now();
    conversation.push({ role, text, time: t });
    setWelcome(false);
    const row = renderMessage(role, text, t);
    if (typingEl.classList.contains("hidden")) {
      messagesEl.appendChild(row);
    } else {
      messagesEl.insertBefore(row, typingEl);
    }
    scrollBottom();
    return row;
  }

  /* ─── AI demo responses ─── */

  /* ─── Send message ─── */
  async function sendMessage() {
    if (isGenerating) return;
    let text = inputEl.value.trim();
    if (!text && !selectedFile) return;

    // Prepend file context if attached
    const fileLabel = selectedFile ? `📎 ${selectedFile.name}\n` : "";
    const fullText = fileLabel + (text || "(No additional notes)");

    addMessage("user", fullText);
    inputEl.value = "";
    inputEl.style.height = "auto";
    isGenerating = true;
    updateSendButtonState();

    // Show typing
    typingEl.classList.remove("hidden");
    scrollBottom();

    try {
      const formData = new FormData();
      formData.append("mode", activeMode || "");
      formData.append("text", text);
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      // Add advanced parameters if present
      const fmt = document.getElementById("param-format");
      if (fmt) formData.append("format", fmt.value);

      const len = document.getElementById("param-length");
      if (len) formData.append("length", len.value);

      const tone = document.getElementById("param-tone");
      if (tone) formData.append("tone", tone.value);

      const response = await fetch("/assistant/chat-api/", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      typingEl.classList.add("hidden");

      if (data.response) {
        addMessage("ai", data.response);
      } else if (data.error) {
        addMessage("ai", "⚠️ Sorry, I encountered an error: " + data.error);
      }
    } catch (err) {
      typingEl.classList.add("hidden");
      addMessage("ai", "⚠️ Network error. Please try again.");
    } finally {
      isGenerating = false;
      clearFile();
      updateSendButtonState();
    }
  }

  /* ─── Clear chat ─── */
  clearBtn.addEventListener("click", () => {
    conversation = [];
    // Remove all msg-row elements
    document.querySelectorAll(".msg-row").forEach((el) => el.remove());
    setWelcome(true);
    clearMode();
  });

  /* ─── Mode card selection ─── */
  const badgeEl = document.getElementById("mode-badge");
  let activeMode = null;

  const modeColors = {
    purple: { badge: "bg-purple-500/15 border-purple-500/30 text-purple-300" },
    blue: { badge: "bg-blue-500/15 border-blue-500/30 text-blue-300" },
    emerald: {
      badge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
    },
    indigo: { badge: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300" },
  };

  const modeSelectedStyle = {
    purple: { border: "rgba(168,85,247,0.6)", bg: "rgba(168,85,247,0.12)" },
    blue: { border: "rgba(59,130,246,0.6)", bg: "rgba(59,130,246,0.12)" },
    emerald: { border: "rgba(16,185,129,0.6)", bg: "rgba(16,185,129,0.12)" },
    indigo: { border: "rgba(99,102,241,0.6)", bg: "rgba(99,102,241,0.12)" },
  };

  function selectMode(card) {
    const mode = card.dataset.mode;
    const color = card.dataset.color;
    const ph = card.dataset.placeholder;

    if (activeMode === mode) {
      clearMode();
      return;
    }

    document.querySelectorAll(".mode-card").forEach((c) => {
      c.style.borderColor = "";
      c.style.backgroundColor = "";
      c.style.opacity = "0.5";
    });

    card.style.borderColor = modeSelectedStyle[color].border;
    card.style.backgroundColor = modeSelectedStyle[color].bg;
    card.style.opacity = "1";

    inputBox.style.borderColor = modeSelectedStyle[color].border;

    badgeEl.className = `flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border w-fit ${modeColors[color].badge}`;
    badgeEl.textContent = "⚡ " + mode;

    if (mode === "Meeting Assistant") {
      attachBtn.classList.remove("hidden");
      attachBtn.classList.add("flex");
    } else {
      attachBtn.classList.add("hidden");
      attachBtn.classList.remove("flex");
      clearFile();
    }

    updateAdvancedControls(mode);

    inputEl.disabled = false;
    inputEl.placeholder = ph;
    activeMode = mode;
    inputEl.focus();
  }

  function updateAdvancedControls(mode) {
    const container = document.getElementById("advanced-controls");
    container.innerHTML = "";

    if (mode === "Meeting Assistant") {
      container.classList.replace("hidden", "flex");
      container.innerHTML = `
            <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Format</label>
                <select id="param-format" class="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300 outline-none focus:border-purple-500/50">
                    <option value="bullets">Bullet Points</option>
                    <option value="paragraph">Paragraphs</option>
                    <option value="tldr">TL;DR + Bullets</option>
                </select>
            </div>
            <div class="flex flex-col gap-1.5">
                <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Length</label>
                <select id="param-length" class="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300 outline-none focus:border-purple-500/50">
                    <option value="short">Short</option>
                    <option value="medium" selected>Medium</option>
                    <option value="long">Long & Detailed</option>
                </select>
            </div>
        `;
    } else if (mode === "Email Draft") {
      container.classList.replace("hidden", "flex");
      container.innerHTML = `
            <div class="flex flex-col gap-1.5 w-full">
                <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tone</label>
                <select id="param-tone" class="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300 outline-none focus:border-emerald-500/50">
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="formal">Highly Formal</option>
                    <option value="assertive">Assertive</option>
                </select>
            </div>
        `;
    } else {
      container.classList.replace("flex", "hidden");
    }
  }

  function clearFile() {
    selectedFile = null;
    fileInput.value = "";
    fileChip.classList.add("hidden");
    fileChip.classList.remove("flex");
    fileChipName.textContent = "";
    updateSendButtonState();
  }

  function clearMode() {
    document.querySelectorAll(".mode-card").forEach((c) => {
      c.style.borderColor = "";
      c.style.backgroundColor = "";
      c.style.opacity = "1";
    });
    inputBox.style.borderColor = "";
    badgeEl.className = "hidden";
    document
      .getElementById("advanced-controls")
      .classList.replace("flex", "hidden");
    inputEl.placeholder = "Ask anything, or select a mode for specialized help…";
    inputEl.disabled = false;
    inputEl.value = "";
    autoResize();
    activeMode = null;
    attachBtn.classList.add("hidden");
    attachBtn.classList.remove("flex");
    clearFile();
  }

  document.querySelectorAll(".mode-card").forEach((card) => {
    card.addEventListener("click", () => selectMode(card));
  });

  /* ─── File upload events ─── */
  attachBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    selectedFile = file;
    fileChipName.textContent = file.name;
    fileChip.classList.remove("hidden");
    fileChip.classList.add("flex");
    updateSendButtonState(); // allow send with just a file
  });

  fileRemoveBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearFile();
  });

  /* ─── Input events ─── */
  inputEl.addEventListener("input", autoResize);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) sendMessage();
    }
  });
  sendBtn.addEventListener("click", sendMessage);

  /* ─── History item click ─── */
  document.querySelectorAll(".history-item").forEach((item) => {
    item.addEventListener("click", () => {
      // Clear current chat display and set welcome to hidden
      clearBtn.click();
      setWelcome(false);

      const idx = parseInt(item.getAttribute("data-index"), 10);
      const uText = window.chatHistory[idx].request;
      const aText = window.chatHistory[idx].response;

      // inject past context directly
      const row1 = renderMessage("user", uText, "Past");
      messagesEl.appendChild(row1);
      const row2 = renderMessage("ai", aText, "Past");
      messagesEl.appendChild(row2);

      scrollBottom();
    });
  });

  /* ─── History Sidebar Toggle ─── */
  const historySidebar = document.getElementById("chat-history-sidebar");
  const historyToggleBtn = document.getElementById("history-toggle-btn");
  const historyOverlay = document.getElementById("history-overlay");

  function toggleHistory() {
    const isClosed = historySidebar.classList.contains("-translate-x-full");
    if (isClosed) {
      historySidebar.classList.remove("-translate-x-full");
      historyOverlay.classList.remove("hidden");
      // small delay to allow display:block to apply before animating opacity
      setTimeout(() => historyOverlay.classList.remove("opacity-0"), 10);
    } else {
      historySidebar.classList.add("-translate-x-full");
      historyOverlay.classList.add("opacity-0");
      setTimeout(() => historyOverlay.classList.add("hidden"), 300);
    }
  }

  historyToggleBtn.addEventListener("click", toggleHistory);
  historyOverlay.addEventListener("click", toggleHistory);
})();
