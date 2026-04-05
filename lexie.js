// ============================================================
// KOHMZ LEXIE AI — FRONTEND V21.8.0 (MOBILE PERFECTED + BOA VOICE)
// FIXES: Mobile Click/Tap Double-Fire Bug, Mobile UI Sizing CSS,
//        Hardware Accelerated Touch Drag, Scroll Thrashing Fix,
//        On-Demand Premium Voice Fetcher, God-Mode Turnstile.
// ============================================================
const WORKER_URL = "https://kohmz-ai-vault.kohmzelectrical.workers.dev/";

// 🛡️ SECURED IN-MEMORY STATE
let isGodMode = false;
let godName = "";
let mySecretAdminToken = sessionStorage.getItem("kohmz_admin_token") || "";

// ✅ AbortController — cancel in-flight request when user sends new message
let currentAbortController = null;

// ── Smart Context Scraper ───────────────────────────────────
function getPageContext() {
  let context = document.title + " | ";
  const main = document.getElementById("main-content") || document.body;
  if (main) {
    context += main.textContent.replace(/\s+/g, ' ').trim().substring(0, 1500);
  }
  return context;
}

// ── Interaction Tracker & Mobile Audio Unlock ──
let hasUserInteracted = false;
function unlockAudioEngine() {
  if (hasUserInteracted) return;
  hasUserInteracted = true;
  if (window.speechSynthesis) {
    let silentUtterance = new SpeechSynthesisUtterance("");
    silentUtterance.volume = 0;
    window.speechSynthesis.speak(silentUtterance);
  }
  ['click', 'touchstart', 'keydown'].forEach(evt => {
    document.removeEventListener(evt, unlockAudioEngine);
  });
}
['click', 'touchstart', 'keydown'].forEach(evt => {
  document.addEventListener(evt, unlockAudioEngine, { once: true });
});

// ── Mute & Turnstile Logic ──────────────────────────────────
let isMuted = localStorage.getItem("lexie_muted") === "true";
let currentTurnstileToken = "";
let messageCount = parseInt(sessionStorage.getItem("msg_count")) || 0;

function applyMuteUI() {
  const btn = document.getElementById("muteBtn");
  if (btn) btn.innerText = isMuted ? "🔇" : "🔊";
}

window.toggleMute = function () {
  isMuted = !isMuted;
  localStorage.setItem("lexie_muted", isMuted);
  applyMuteUI();
  if (isMuted && window.speechSynthesis) window.speechSynthesis.cancel();
};
applyMuteUI();

window.onTurnstileSuccess = function (token) {
  currentTurnstileToken = token;
  const btn = document.getElementById("mainSendBtn");
  if (btn) {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.innerHTML = '<i class="fas fa-paper-plane"></i>';
  }
};

window.resetTurnstile = function () {
  if (isGodMode) return; 
  if (typeof turnstile !== "undefined" && turnstile.reset) {
    currentTurnstileToken = "";
    turnstile.reset();
    const btn = document.getElementById("mainSendBtn");
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = "0.5";
      btn.innerHTML = '<i class="fas fa-shield-alt"></i>';
    }
  }
};

// ── Memory & UUID Logic ─────────────────────────────────────
let userId = localStorage.getItem("kohmz_uuid");
if (!userId) {
  userId = "user-" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("kohmz_uuid", userId);
}

let lexieMemory = [];
try { lexieMemory = JSON.parse(sessionStorage.getItem("lexie_memory")) || []; } catch (e) { lexieMemory = []; }
let currentImageData = null;

// ── God Mode UI Handlers ────────────────────────────────────
function applyGodModeUI() {
  const hint = document.getElementById("dragHint");
  if (hint) {
    hint.innerText = "👑 IMMORTAL MODE";
    hint.classList.add("god-mode-tag");
  }
  const tsCont = document.getElementById("cf-turnstile-container");
  if (tsCont) tsCont.style.display = "none";
  const btn = document.getElementById("mainSendBtn");
  if (btn) {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.innerHTML = '<i class="fas fa-paper-plane"></i>';
  }
  const header = document.getElementById("chatHeader");
  if (header) header.firstElementChild.textContent = `LEXIE AI: IMMORTAL (${godName}) 👑`;
}

window.exitGodMode = function () {
  if (!isGodMode) return;
  isGodMode = false;
  godName = "";
  mySecretAdminToken = "";
  sessionStorage.removeItem("kohmz_admin_token");

  lexieMemory = [];
  sessionStorage.removeItem("lexie_memory");
  document.getElementById("chatBody").innerHTML = "";

  const hint = document.getElementById("dragHint");
  if (hint) {
    hint.innerText = "⚡ KOHMZ Lexie Pro";
    hint.classList.remove("god-mode-tag");
  }
  const tsCont = document.getElementById("cf-turnstile-container");
  if (tsCont) tsCont.style.display = "flex";
  const header = document.getElementById("chatHeader");
  if (header) header.firstElementChild.textContent = "LEXIE AI: SYSTEM ACTIVE";
  resetTurnstile();

  appendBubble("bot", "Immortal Mode deactivated. Session memory wiped. Returning to standard protocol.");
};

// SAFARI SYNTAX CRASH FIX
function formatNumbers(text) {
  if (!text) return "";
  return text.replace(/\b\d{4,}\b/g, function (match, offset, fullString) {
    const prevChar = fullString[offset - 1];
    if (prevChar === '+' || prevChar === '-') return match;
    if (match.startsWith("09") || match.startsWith("639")) return match;
    const n = parseInt(match, 10);
    if (n >= 1900 && n <= 2099) return match;
    return n.toLocaleString("en-US");
  });
}

// ── Bubble Helper ────────────────────────────────────────────
function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, tag => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[tag]));
}

function appendBubble(role, htmlContent, rawTextForTTS, audioUrl) {
  const t = document.getElementById("chatBody");
  const b = document.createElement("div");
  b.className = "chat-bubble";

  if (role === "user") {
    b.style.cssText = "background:rgba(0,229,255,0.1);align-self:flex-end;border-right:3px solid var(--neon-gold);border-left:none;color:#fff;padding:12px;border-radius:12px 0 12px 12px;margin-bottom:5px;text-align:right;white-space:pre-wrap;";
    b.textContent = "YOU: " + htmlContent;
  } else {
    b.style.cssText = "border-left:3px solid var(--cyber-blue);white-space:pre-wrap;";
    b.innerHTML = "Lexie: " + htmlContent;

    if (audioUrl) {
      const audioSection = document.createElement("div");
      audioSection.style.cssText = "margin-top:10px;border-top:1px dashed rgba(0,229,255,0.3);padding-top:8px;";
      audioSection.innerHTML = `
        <div style="font-size:11px;color:var(--cyber-blue);margin-bottom:6px;font-family:'Share Tech Mono'">🎙️ Premium Voice</div>
        <audio controls autoplay playsinline style="width:100%;height:32px;filter:invert(0.85) hue-rotate(180deg);" src="${escapeHTML(audioUrl)}">Your browser does not support audio.</audio>
      `;
      b.appendChild(audioSection);
    } else if (rawTextForTTS) {
      const audioDiv = document.createElement("div");
      audioDiv.style.cssText = "margin-top:10px;border-top:1px dashed rgba(0,229,255,0.3);padding-top:8px;";
      const audioBtn = document.createElement("button");
      audioBtn.style.cssText = "background:none;border:none;color:var(--neon-gold);cursor:pointer;font-family:'Share Tech Mono';font-size:11px;padding:0;";
      audioBtn.innerHTML = '<i class="fas fa-volume-up"></i> Play Audio';
      const capturedText = rawTextForTTS;
      audioBtn.onclick = () => { if (isMuted) toggleMute(); window.speakText(capturedText); };
      audioDiv.appendChild(audioBtn);
      b.appendChild(audioDiv);
    }
  }
  t.appendChild(b);
  
  // Throttle initial scroll
  requestAnimationFrame(() => { t.scrollTop = t.scrollHeight; });
  return b;
}

// ── On-Demand Premium Voice Fetcher (Mobile Optimized) ──
window.requestLexieVoice = async function(btnElement, text) {
  if (btnElement.disabled) return;
  btnElement.disabled = true;
  btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Voice... (Approx 3-8s)';
  
  try {
    const res = await fetch(WORKER_URL + "voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text })
    });
    
    if (!res.ok) throw new Error("API Error");
    const data = await res.json();
    
    if (data.audio_url) {
      // ✅ FIX: Inalis ang "Boa Hancock", nagdagdag ng playsinline para sa iOS Safari
      btnElement.outerHTML = `
        <div style="font-size:11px;color:var(--cyber-blue);margin-bottom:6px;font-family:'Share Tech Mono';margin-top:10px;border-top:1px dashed rgba(0,229,255,0.3);padding-top:8px;">🎙️ Premium Voice</div>
        <audio controls autoplay playsinline style="width:100%;height:32px;filter:invert(0.85) hue-rotate(180deg);" src="${escapeHTML(data.audio_url)}">Browser not supported.</audio>
      `;
    } else {
      throw new Error("No URL returned");
    }
  } catch(e) {
    btnElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Voice failed. Try again.';
    btnElement.disabled = false;
  }
};

// ==========================================
// ── Main Chat Engine (Ask Lexie STREAMING)
// ==========================================
window.askLexie = async function (retryMessage = null) {
  const inputEl = document.getElementById("userQuery");
  const t = document.getElementById("chatBody");
  const sendBtn = document.getElementById("mainSendBtn");
  const n = retryMessage !== null ? retryMessage : inputEl.value.trim();

  if (!n && !currentImageData) return;

  if (!isGodMode) {
    if (messageCount >= 2 && !currentTurnstileToken) {
      appendBubble("bot", "⚠️ Boss, paki-check muna yung security box (I am not a robot) sa ibaba para makapag-tuloy tayo.");
      return;
    }
  }

  // Abort any in-flight request
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();
  const { signal } = currentAbortController;

  // Lock UI
  if (sendBtn) sendBtn.disabled = true;
  if (inputEl) inputEl.disabled = true;

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    speechQueue = [];
    isSpeaking = false;
  }

  if (retryMessage === null) {
    appendBubble("user", n || "[Image Attached]");
    inputEl.value = "";

    lexieMemory.push({ role: "user", content: n || "[Image Sent]" });
    if (lexieMemory.length > 15) lexieMemory = lexieMemory.slice(-15);
    sessionStorage.setItem("lexie_memory", JSON.stringify(lexieMemory));

    if (!isGodMode) {
      messageCount++;
      sessionStorage.setItem("msg_count", messageCount);
    }
  }

  const loadId = "load-" + Date.now();
  const botBubble = appendBubble("bot", 'Lexie is analyzing<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>');
  botBubble.id = loadId;

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: n,
        image: currentImageData,
        name: godName || "Web Client",
        userId: userId,
        pageData: getPageContext(),
        history: lexieMemory.slice(-8),
        turnstileToken: currentTurnstileToken,
        vipName: godName,
        adminToken: mySecretAdminToken
      })
    });

    const contentType = response.headers.get("content-type") || "";

    // ⚡ 1. JSON FALLBACK (For Auth, Bans, Errors)
    if (contentType.includes("application/json")) {
      const result = await response.json();

      if (result.auth_challenge) {
        const enteredToken = prompt("🔒 VIP SYSTEM DETECTED.\nPlease enter Master Key to proceed:");
        if (!enteredToken) {
          botBubble.innerHTML = "Lexie: ⚠️ Auth canceled. Proceeding as standard client.";
          return;
        }
        mySecretAdminToken = enteredToken;
        sessionStorage.setItem("kohmz_admin_token", enteredToken);
        botBubble.remove();
        return window.askLexie(n);
      }

      if (result.god_mode_activated) {
        isGodMode = true;
        godName = result.god_name || "Admin";
        lexieMemory = [];
        sessionStorage.removeItem("lexie_memory");
        applyGodModeUI();
      }

      botBubble.innerHTML = "Lexie: " + escapeHTML(result.ai_answer || "System error.");
      if (hasUserInteracted) window.speakText(result.ai_answer || "");
      return;
    }

    // ⚡ 2. STREAMING MODE (MOBILE OPTIMIZED)
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";
    let streamBuffer = "";
    botBubble.innerHTML = "Lexie: ";

    let isRendering = false; // Anti-lag trigger

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      streamBuffer += decoder.decode(value, { stream: true });
      const lines = streamBuffer.split('\n');
      streamBuffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.response) {
              fullText += data.response;

              let displayHtml = fullText
                .replace(/ESTIMATE_JSON_START[\s\S]*?(ESTIMATE_JSON_END)?/gi, "")
                .replace(/\[AGREEMENT_START\][\s\S]*?(\[AGREEMENT_END\])?/gi, "")
                .replace(/\[UI_ACTION:.*?\]/g, "")
                .replace(/\*\*/g, "")
                .trim();

              // ✅ BATCH UI UPDATES: Smooth scroll sa mobile!
              if (!isRendering) {
                isRendering = true;
                requestAnimationFrame(() => {
                  botBubble.innerHTML = "Lexie: " + escapeHTML(formatNumbers(displayHtml));
                  t.scrollTop = t.scrollHeight;
                  isRendering = false;
                });
              }
            }
          } catch (e) {
            // Silently ignore incomplete JSON chunks
          }
        }
      }
    }

    // ⚡ 3. POST-STREAM PROCESSING
    let cleanText = fullText
      .replace(/ESTIMATE_JSON_START[\s\S]*?ESTIMATE_JSON_END/gi, "")
      .replace(/\[AGREEMENT_START\][\s\S]*?\[AGREEMENT_END\]/gi, "")
      .replace(/\[.*?\]/g, "")
      .replace(/\*\*/g, "")
      .trim();

    botBubble.innerHTML = "Lexie: " + escapeHTML(formatNumbers(cleanText));
    let textToSpeak = cleanText;

    // Code Red
    if (fullText.includes("[UI_ACTION:CODE_RED]")) {
      document.body.classList.add("mode-red");
      setTimeout(() => document.body.classList.remove("mode-red"), 6000);
      document.getElementById("chatWindow").classList.add("code-red-active");
      const header = document.getElementById("chatHeader");
      if (header) {
        header.style.color = "#e11d48";
        header.firstElementChild.textContent = "⚠️ CODE RED DETECTED";
      }
      const callLink = document.createElement("a");
      callLink.href = "tel:09266174131";
      callLink.className = "btn-pdf";
      callLink.style.cssText = "background:#e11d48;color:#fff;display:block;margin-top:12px;text-align:center;";
      callLink.innerHTML = '<i class="fas fa-phone"></i> CALL KOHMZ NOW';
      botBubble.appendChild(callLink);
    } else {
      const chatWin = document.getElementById("chatWindow");
      if (chatWin) chatWin.classList.remove("code-red-active");
      const header = document.getElementById("chatHeader");
      if (header) {
        header.style.color = "var(--cyber-blue)";
        header.firstElementChild.textContent = isGodMode ? `LEXIE AI: IMMORTAL (${godName}) 👑` : "LEXIE AI: SYSTEM ACTIVE";
      }
    }

    // Extract Strict JSON Estimate
    const jsonMatch = fullText.match(/ESTIMATE_JSON_START\s*([\s\S]*?)\s*ESTIMATE_JSON_END/i);
    if (jsonMatch) {
      try {
        const estimateJSON = JSON.parse(jsonMatch[1].trim());
        let pdfLines = estimateJSON.items.map(it => `ITEM: ${it.item}\nQTY: ${it.qty}\nLABOR COST: ${it.labor}\nMATERIALS COST: ${it.materials}`).join("\n|||\n");
        pdfLines += `\n-----------------------------------\nRESTORATION COST: ${estimateJSON.restoration}\n-----------------------------------\nGRAND TOTAL ESTIMATE: ${estimateJSON.grand_total}`;

        const cleanDataForPDF = pdfLines.replace(/\*\*/g, "").replace(/\*/g, "").replace(/₱/g, "PHP ").trim();
        sessionStorage.setItem("lastEst", cleanDataForPDF);

        document.body.classList.add("mode-gold");
        setTimeout(() => document.body.classList.remove("mode-gold"), 6000);

        const dlBtn = document.createElement("button");
        dlBtn.id = "dlPdfBtn";
        dlBtn.className = "btn-pdf";
        dlBtn.style.cssText = "width:100%;text-align:center;margin-top:12px;";
        dlBtn.innerHTML = '<i class="fas fa-file-invoice-dollar"></i> Download Official Estimate';
        dlBtn.onclick = () => window.downloadPDF();
        botBubble.appendChild(dlBtn);

        textToSpeak += " Naihanda ko na po ang estimate natin boss, i-click niyo na lang po ang download button sa ibaba. ";
      } catch (e) {
        console.error("Failed to parse estimate JSON", e);
      }
    }

    // Service Agreement
    const agreeMatch = fullText.match(/\[AGREEMENT_START\]([\s\S]*?)\[AGREEMENT_END\]/i);
    if (agreeMatch) {
      const cleanDataForAgreement = agreeMatch[1].replace(/\*\*/g, "").replace(/\*/g, "").replace(/₱/g, "PHP ").trim();
      sessionStorage.setItem("lastAgreement", cleanDataForAgreement);

      document.body.classList.add("mode-gold");
      setTimeout(() => document.body.classList.remove("mode-gold"), 6000);

      const agreeBtn = document.createElement("button");
      agreeBtn.id = "dlAgreeBtn"; agreeBtn.className = "btn-pdf";
      agreeBtn.style.cssText = "width:100%;text-align:center;margin-top:12px;background:var(--cyber-blue);color:#000;";
      agreeBtn.innerHTML = '<i class="fas fa-file-signature"></i> Download Service Agreement';
      agreeBtn.onclick = () => window.downloadAgreement();
      botBubble.appendChild(agreeBtn);

      textToSpeak += " Handa na rin po ang Service Agreement natin boss, i-download niyo na lang po. ";
    }

   // 🎙️ ADD PREMIUM VOICE BUTTON
    const voiceBtn = document.createElement("button");
    voiceBtn.style.cssText = "background:none;border:none;color:var(--neon-gold);cursor:pointer;font-family:'Share Tech Mono';font-size:11px;padding:0;margin-top:10px;display:block;border-top:1px dashed rgba(0,229,255,0.3);padding-top:8px;width:100%;text-align:left;";
    voiceBtn.innerHTML = '<i class="fas fa-play-circle"></i> Play Premium Voice';
    let safeTextForVoice = textToSpeak.substring(0, 250); 
    // ✅ FIX: Pinalitan ng requestLexieVoice
    voiceBtn.onclick = function() { window.requestLexieVoice(this, safeTextForVoice); };
    botBubble.appendChild(voiceBtn);

    // Default Browser TTS Trigger
    if (hasUserInteracted) window.speakText(textToSpeak);

    lexieMemory.push({ role: "assistant", content: fullText.replace(/ESTIMATE_JSON_START[\s\S]*?ESTIMATE_JSON_END/gi, "[Provided Estimate]").replace(/\[AGREEMENT_START\][\s\S]*?\[AGREEMENT_END\]/gi, "[Provided Agreement]") });
    if (lexieMemory.length > 15) lexieMemory = lexieMemory.slice(-15);
    sessionStorage.setItem("lexie_memory", JSON.stringify(lexieMemory));

  } catch (err) {
    if (err.name === "AbortError") {
      const lb = document.getElementById(loadId);
      if (lb) lb.remove();
      return;
    }
    const lb = document.getElementById(loadId);
    if (lb) lb.textContent = "Lexie: Connection interrupted due to network limits. Please try again.";
    resetTurnstile();
  } finally {
    clearImage();

    if (!isGodMode && messageCount >= 2 && currentTurnstileToken) {
      resetTurnstile(); 
    } else if (isGodMode) {
      if (sendBtn) { sendBtn.disabled = false; sendBtn.style.opacity = "1"; }
    } else {
      if (sendBtn) {
        if (currentTurnstileToken || messageCount < 2) {
          sendBtn.disabled = false;
          sendBtn.style.opacity = "1";
        }
      }
    }

    currentAbortController = null;

    if (inputEl) {
      inputEl.disabled = false;
      inputEl.focus();
    }
  }
};

// ── PDF Generators ─────────────
window.downloadPDF = async function () {
  const data = sessionStorage.getItem("lastEst");
  if (!data) { alert("System Error: No estimate data found."); return; }
  const btn = document.getElementById("dlPdfBtn");
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...'; btn.style.opacity = "0.6"; }

  try {
    if (!window.jspdf) {
      alert("System Error: PDF Generator library did not load correctly. Please refresh the page.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ format: "letter", unit: "mm" });
    const margin = 15, pageWidth = doc.internal.pageSize.getWidth(), rightAlign = pageWidth - margin;
    const contentWidth = pageWidth - (margin * 2);

    try {
      const imgData = await new Promise((resolve) => {
        const img = new Image(); img.crossOrigin = "Anonymous";
        img.onload = () => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; c.getContext("2d").drawImage(img, 0, 0); resolve(c.toDataURL("image/jpeg")); };
        img.onerror = () => resolve(null);
        img.src = "logo.jpg";
      });
      if (imgData) doc.addImage(imgData, "JPEG", margin, 15, 20, 20);
    } catch (e) {}

    const textStartX = margin + 25;
    doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.setTextColor(13, 27, 42);
    doc.text("KOHMZ", textStartX, 23);
    doc.setTextColor(255, 183, 3); doc.text("Electrical", textStartX + doc.getTextWidth("KOHMZ "), 23);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text("TECHNICAL GOVERNANCE & POWER ARCHITECTURE", textStartX, 30);

    doc.setFontSize(8); doc.setTextColor(50, 50, 50);
    doc.text("Website: kohmzelectrical.com", rightAlign, 18, { align: "right" });
    doc.text("FB Page: KOHMZ Electrical Design and Build", rightAlign, 23, { align: "right" });
    doc.text("Viber / WhatsApp: 0926-617-4131", rightAlign, 28, { align: "right" });

    doc.setDrawColor(255, 183, 3); doc.setLineWidth(1.2); doc.line(margin, 40, rightAlign, 40);

    doc.setFillColor(13, 27, 42); doc.rect(margin, 45, contentWidth, 10, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(10);
    doc.text(`TRACKING REF ID: ${userId}`, margin + 5, 51.5);
    doc.text(`DATE PREPARED: ${new Date().toLocaleDateString()}`, rightAlign - 5, 51.5, { align: "right" });

    doc.setTextColor(13, 27, 42); doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("OFFICIAL SERVICE ESTIMATE", pageWidth / 2, 65, { align: "center" });

    const formattedData = formatNumbers(data);
    let parts = formattedData.split(/[-=]{10,}/);
    let itemsStr = parts[0] || "";
    let restorationStr = (parts[1] || "").trim();
    let totalStr = (parts[2] || "").trim();

    if (!totalStr && restorationStr && restorationStr.toUpperCase().includes("GRAND TOTAL")) {
      totalStr = restorationStr;
      restorationStr = "RESTORATION COST: TO FOLLOW (Requires On-Site Inspection).";
    }

    let rawItems = itemsStr.split("|||");
    let tableBody = [];

    rawItems.forEach(itemBlock => {
      if (!itemBlock.trim()) return;
      let lines = itemBlock.split("\n").map(l => l.trim()).filter(l => l);
      let itemName = "-", qty = "-", labor = "-", mat = "-";
      lines.forEach(line => {
        let upperLine = line.toUpperCase();
        if (upperLine.startsWith("ITEM:")) itemName = line.substring(5).trim();
        else if (upperLine.startsWith("QTY:")) qty = line.substring(4).trim();
        else if (upperLine.startsWith("LABOR COST:")) labor = line.substring(11).trim();
        else if (upperLine.startsWith("MATERIALS COST:")) mat = line.substring(15).trim();
      });
      if (itemName !== "-") tableBody.push([itemName, qty, labor, mat]);
    });

    if (tableBody.length === 0 && itemsStr.trim().length > 0) {
      tableBody.push([itemsStr.substring(0, 100) + "...", "1", "TBD", "TBD"]);
    }

    if (doc.autoTable) {
      doc.autoTable({
        startY: 70,
        head: [["ITEM / SERVICE DESCRIPTION", "QTY", "LABOR COST", "MATERIALS COST"]],
        body: tableBody,
        theme: "grid",
        headStyles: { fillColor: [13, 27, 42], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
        bodyStyles: { textColor: [40, 40, 40], fontSize: 9 },
        columnStyles: {
          0: { cellWidth: "auto" },
          1: { cellWidth: 20, halign: "center" },
          2: { cellWidth: 35, halign: "right" },
          3: { cellWidth: 35, halign: "right" }
        },
        margin: { left: margin, right: margin }
      });
    }

    let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 80;

    if (finalY > 230) { doc.addPage(); finalY = 20; }

    doc.setFillColor(245, 245, 245);
    doc.rect(margin, finalY, contentWidth, 12, "F");
    doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(100, 100, 100);
    doc.text(restorationStr || "RESTORATION COST: TO FOLLOW (Requires On-Site Inspection).", margin + 5, finalY + 7.5);

    finalY += 18;
    if (finalY > 230) { doc.addPage(); finalY = 20; }

    doc.setFillColor(255, 183, 3);
    doc.rect(margin, finalY, contentWidth, 14, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(13, 27, 42);
    doc.text(totalStr || "GRAND TOTAL ESTIMATE: TBD", rightAlign - 5, finalY + 9, { align: "right" });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(200, 200, 200); doc.line(margin, 260, rightAlign, 260);
      doc.setFontSize(7); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "italic");
      doc.text("DISCLAIMER: This document is a rough AI estimate. Final pricing is subject to a formal Technical Audit.", pageWidth / 2, 265, { align: "center" });
      doc.text("Any cancellation, abrupt changes, or additional work requested by the client will incur additional charges.", pageWidth / 2, 268, { align: "center" });
      doc.text("Restoration (masonry/painting) is strictly separate from the electrical labor fee.", pageWidth / 2, 271, { align: "center" });
    }

    doc.save(`KOHMZ_Estimate_${userId.substring(0, 5)}.pdf`);
  } catch (err) {
    console.error(err);
    alert("Error generating PDF. Please ensure all data is loaded properly.");
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-file-invoice-dollar"></i> Download Official Estimate'; btn.style.opacity = "1"; }
  }
};

window.downloadAgreement = async function () {
  const data = sessionStorage.getItem("lastAgreement");
  if (!data) { alert("System Error: No agreement data found."); return; }
  const btn = document.getElementById("dlAgreeBtn");
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...'; btn.style.opacity = "0.6"; }

  try {
    if (!window.jspdf) {
      alert("System Error: PDF Generator library did not load correctly. Please refresh the page.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ format: "letter", unit: "mm" });
    const margin = 15, pageWidth = doc.internal.pageSize.getWidth(), rightAlign = pageWidth - margin;
    const contentWidth = pageWidth - (margin * 2);

    try {
      const imgData = await new Promise((resolve) => {
        const img = new Image(); img.crossOrigin = "Anonymous";
        img.onload = () => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; c.getContext("2d").drawImage(img, 0, 0); resolve(c.toDataURL("image/jpeg")); };
        img.onerror = () => resolve(null);
        img.src = "logo.jpg";
      });
      if (imgData) doc.addImage(imgData, "JPEG", margin, 15, 20, 20);
    } catch (e) {}

    const textStartX = margin + 25;
    doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.setTextColor(13, 27, 42);
    doc.text("KOHMZ", textStartX, 23);
    doc.setTextColor(255, 183, 3); doc.text("Electrical", textStartX + doc.getTextWidth("KOHMZ "), 23);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
    doc.text("TECHNICAL GOVERNANCE & POWER ARCHITECTURE", textStartX, 30);

    doc.setFontSize(8); doc.setTextColor(50, 50, 50);
    doc.text("Website: kohmzelectrical.com", rightAlign, 18, { align: "right" });
    doc.text("FB Page: KOHMZ Electrical Design and Build", rightAlign, 23, { align: "right" });
    doc.text("Viber / WhatsApp: 0926-617-4131", rightAlign, 28, { align: "right" });

    doc.setDrawColor(255, 183, 3); doc.setLineWidth(1.2); doc.line(margin, 40, rightAlign, 40);

    doc.setFillColor(13, 27, 42); doc.rect(margin, 45, contentWidth, 10, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(10);
    doc.text(`TRACKING REF ID: ${userId}`, margin + 5, 51.5);
    doc.text(`DATE PREPARED: ${new Date().toLocaleDateString()}`, rightAlign - 5, 51.5, { align: "right" });

    doc.setTextColor(13, 27, 42); doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("OFFICIAL SERVICE AGREEMENT", pageWidth / 2, 65, { align: "center" });

    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(40, 40, 40);

    const formattedData = formatNumbers(data);
    let lines = [];
    if (formattedData && typeof formattedData === "string") {
      lines = doc.splitTextToSize(formattedData, contentWidth - 10);
    } else {
      lines = ["Data format error occurred."];
    }

    let cursorY = 75;
    let boxStartY = 55;
    const lineHeight = 6;
    const pageMaxY = 250;

    for (let i = 0; i < lines.length; i++) {
      if (cursorY + lineHeight > pageMaxY) {
        doc.setDrawColor(13, 27, 42); doc.setLineWidth(0.3);
        doc.rect(margin, boxStartY, contentWidth, cursorY - boxStartY + 2, "S");

        doc.setDrawColor(200, 200, 200); doc.line(margin, 260, rightAlign, 260);
        doc.setFontSize(7); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "italic");
        doc.text("DISCLAIMER: This document is an AI-generated Service Agreement. Final approval required upon site visit.", pageWidth / 2, 265, { align: "center" });

        doc.addPage();
        boxStartY = 20;
        cursorY = 30;
        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(13, 27, 42);
        doc.text("KOHMZ ELECTRICAL - AGREEMENT CONTINUATION", margin, boxStartY - 5);
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(40, 40, 40);
      }
      doc.text(lines[i], margin + 5, cursorY);
      cursorY += lineHeight;
    }

    doc.setDrawColor(13, 27, 42); doc.setLineWidth(0.3);
    doc.rect(margin, boxStartY, contentWidth, cursorY - boxStartY + 5, "S");

    doc.setDrawColor(200, 200, 200); doc.line(margin, 260, rightAlign, 260);
    doc.setFontSize(7); doc.setTextColor(100, 100, 100); doc.setFont("helvetica", "italic");
    doc.text("DISCLAIMER: This document is an AI-generated Service Agreement. Final approval required upon site visit.", pageWidth / 2, 265, { align: "center" });
    doc.text("Any cancellation, abrupt changes, or additional work requested by the client will incur additional charges.", pageWidth / 2, 268, { align: "center" });

    doc.save(`KOHMZ_Agreement_${userId.substring(0, 5)}.pdf`);
  } catch (err) {
    console.error(err);
    alert("Error generating Agreement PDF. Please check your data.");
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-file-signature"></i> Download Service Agreement'; btn.style.opacity = "1"; }
  }
};

// ── Multimedia & Integrations ───────────────────────────────
window.handleImage = function (input) {
  if (input.files && input.files[0]) {
    if (input.files[0].size > 5 * 1024 * 1024) {
      const chat = document.getElementById("chatWindow");
      if (chat.style.display !== "flex") chat.style.display = "flex";
      appendBubble("bot", "⚠️ Boss, masyadong malaki yung image! Hanggang 5MB lang po sana.");
      input.value = null;
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image(); img.onload = () => {
        const canvas = document.createElement("canvas"); let width = img.width, height = img.height;
        if (width > 500) { height = Math.round((height * 500) / width); width = 500; }
        canvas.width = width; canvas.height = height; canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        currentImageData = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
        document.getElementById("prev-img").src = canvas.toDataURL("image/jpeg", 0.6);
        document.getElementById("vision-preview").style.display = "flex";
      }; img.src = e.target.result;
    }; reader.readAsDataURL(input.files[0]);
  }
};

window.clearImage = function () {
  currentImageData = null;
  document.getElementById("vision-preview").style.display = "none";
  document.getElementById("imgInput").value = null;
  document.getElementById("cameraInput").value = null;
};

window.startDictation = function () {
  if (window.hasOwnProperty("webkitSpeechRecognition") || window.hasOwnProperty("SpeechRecognition")) {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-PH";
    recognition.onstart = () => document.getElementById("micBtn").classList.add("mic-active");
    recognition.onresult = (e) => { document.getElementById("userQuery").value = e.results[0][0].transcript; window.askLexie(); };
    recognition.onend = () => document.getElementById("micBtn").classList.remove("mic-active");
    recognition.start();
  } else { appendBubble("bot", "Sorry boss, Voice Input is not supported sa browser mo."); }
};

window.sendQuickReply = function (text) {
  document.getElementById("userQuery").value = text;
  window.askLexie();
};

let speechQueue = [], isSpeaking = false;
const MAX_SPEECH_QUEUE = 10;

window.speakText = function (text) {
  if (!window.speechSynthesis || isMuted || !hasUserInteracted) return;
  let cleanText = text
    .replace(/\[CALENDAR:.*?\]/g, "")
    .replace(/\*/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
  let sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];

  speechQueue.push(...sentences);
  if (speechQueue.length > MAX_SPEECH_QUEUE) {
    speechQueue = speechQueue.slice(-MAX_SPEECH_QUEUE);
  }

  if (!isSpeaking) processSpeechQueue();
};

function processSpeechQueue() {
  if (speechQueue.length === 0 || isMuted) { isSpeaking = false; return; }
  isSpeaking = true;
  let sentence = speechQueue.shift().trim();
  if (!sentence) { processSpeechQueue(); return; }

  let utterance = new SpeechSynthesisUtterance(sentence);
  let voices = window.speechSynthesis.getVoices();
  let voice = voices.find(v => v.name.includes("Samantha") || v.name.includes("Aria") || v.name.includes("Google US English") || v.name.includes("Female") || v.name.includes("Enhanced")) || voices[0];

  if (voice) utterance.voice = voice;
  utterance.lang = "en-US"; utterance.pitch = 1.15; utterance.rate = 0.85;
  utterance.onend = () => processSpeechQueue();
  utterance.onerror = () => { console.warn("TTS Error"); processSpeechQueue(); };

  try { window.speechSynthesis.speak(utterance); } catch (e) { processSpeechQueue(); }
}

window.addEventListener("load", () => {
  const t = document.getElementById("chatBody");
  if (t) {
    if (lexieMemory.length === 0) {
      appendBubble("bot", "Good day! I'm your sweet companion and expert assistant for KOHMZ Electrical. Lexie at your service! I can read images and save your quotes. Paano kita matutulungan boss?");
    } else {
      lexieMemory.forEach(m => {
        if (m.role === "system") return;
        const isUser = m.role === "user";
        const safeContent = escapeHTML(m.content).replace(/\[SYSTEM NOTE.*?\]/g, "[Image Attached]");
        if (isUser) {
          appendBubble("user", safeContent);
        } else {
          const b = document.createElement("div");
          b.className = "chat-bubble";
          b.style.cssText = "border-left:3px solid var(--cyber-blue);white-space:pre-wrap;";
          b.textContent = "Lexie: " + m.content;
          t.appendChild(b);
        }
      });
      t.scrollTop = t.scrollHeight;
    }
  }

  let currentPageName = document.title.split("|")[0].trim() || "kabilang page";
  let lastPage = sessionStorage.getItem("kohmz_last_page");
  if (lastPage && lastPage !== currentPageName && lexieMemory.length > 0) {
    setTimeout(() => { appendBubble("bot", `Uy boss, napadaan ka pala dito sa ${escapeHTML(currentPageName)}! May napusuan ka bang service natin dito? I-chat mo lang ako ha!`); }, 1500);
  }
  sessionStorage.setItem("kohmz_last_page", currentPageName);
});

// ── UI Listeners (Bot Drag, Exit Intent) ─────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const inputEl = document.getElementById("userQuery");
  if (inputEl) {
    inputEl.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); window.askLexie(); } });
    inputEl.addEventListener("focus", () => { setTimeout(() => { const t = document.getElementById("chatBody"); t.scrollTop = t.scrollHeight; }, 300); });
  }

  // ✅ MOBILE CSS FIX: Forces chatbox to fit cleanly on mobile screens
  const mobileFixStyle = document.createElement('style');
  mobileFixStyle.innerHTML = `
    @media (max-width: 768px) {
      #chatWindow {
        width: 92vw !important;
        height: 75vh !important;
        max-height: 600px !important;
        bottom: 85px !important;
        right: 4vw !important;
        left: 4vw !important;
        border-radius: 16px !important;
        margin: auto !important;
      }
    }
  `;
  document.head.appendChild(mobileFixStyle);

  const wrap = document.getElementById("draggableBot"), toggle = document.getElementById("botToggle");
  if (wrap && toggle) {
    let isDragging = false;
    let didActuallyMove = false;
    let startX, startY, xOff = 0, yOff = 0;
    const DRAG_THRESHOLD = 10;

    // --- MOUSE (DESKTOP) ---
    toggle.addEventListener("mousedown", e => {
      isDragging = true; didActuallyMove = false;
      startX = e.clientX - xOff; startY = e.clientY - yOff;
    });

    window.addEventListener("mousemove", e => {
      if (!isDragging) return;
      const dx = e.clientX - (startX + xOff), dy = e.clientY - (startY + yOff);
      if (!didActuallyMove && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) didActuallyMove = true;
      xOff = e.clientX - startX; yOff = e.clientY - startY;
      wrap.style.transform = `translate3d(${xOff}px, ${yOff}px, 0)`;
    });

    window.addEventListener("mouseup", () => { isDragging = false; });

    // --- TOUCH (MOBILE) ---
    let touchTicking = false;
    toggle.addEventListener("touchstart", e => {
      isDragging = true; didActuallyMove = false;
      startX = e.touches[0].clientX - xOff; startY = e.touches[0].clientY - yOff;
    }, { passive: true });

    window.addEventListener("touchmove", e => {
      if (!isDragging) return;
      const tx = e.touches[0].clientX - (startX + xOff), ty = e.touches[0].clientY - (startY + yOff);
      if (!didActuallyMove && Math.sqrt(tx * tx + ty * ty) > DRAG_THRESHOLD) didActuallyMove = true;
      xOff = e.touches[0].clientX - startX; yOff = e.touches[0].clientY - startY;
      
      if (!touchTicking) {
        requestAnimationFrame(() => {
          wrap.style.transform = `translate3d(${xOff}px, ${yOff}px, 0)`;
          touchTicking = false;
        });
        touchTicking = true;
      }
      if (didActuallyMove) e.preventDefault(); // Prevent scroll while dragging
    }, { passive: false });

    window.addEventListener("touchend", () => { isDragging = false; });

    // ✅ CLICK LISTENER: Single point of entry for toggling to prevent mobile double-firing
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      if (!didActuallyMove) {
        window.toggleBotWindow();
      }
      didActuallyMove = false; // Reset for next tap/click
    });
  }
});

window.toggleBotWindow = function () {
  const win = document.getElementById("chatWindow"), hint = document.getElementById("dragHint");
  if (isSpeaking || window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel(); speechQueue = []; isSpeaking = false;
  }
  if (win.style.display === "flex") {
    win.style.display = "none";
    if (hint) hint.innerHTML = isGodMode ? "👑 IMMORTAL MODE" : "⚡ KOHMZ Lexie Pro";
  } else {
    win.style.display = "flex";
    if (hint) hint.innerHTML = isGodMode ? "👑 IMMORTAL MODE" : "🖐️ Drag to Move";
  }
};

function checkMouseLeave(e) { if (e.clientY < 0) triggerExitIntent(); }
function checkVisibility() { if (document.visibilityState === "hidden") triggerExitIntent(); }

let lastScrollTop = 0, lastScrollTime = Date.now();
function checkScroll() {
  let st = window.pageYOffset || document.documentElement.scrollTop;
  let now = Date.now(), timeDiff = now - lastScrollTime;
  if (st < lastScrollTop - 250 && timeDiff < 100) triggerExitIntent();
  lastScrollTop = st <= 0 ? 0 : st;
  lastScrollTime = now;
}

function triggerExitIntent() {
  if (isGodMode || sessionStorage.getItem("exit_offered")) return;
  const chat = document.getElementById("chatWindow");
  if (chat && chat.style.display !== "flex") {
    chat.style.display = "flex";
    const hint = document.getElementById("dragHint");
    if (hint) hint.innerHTML = "🖐️ Drag to Move";
  }
  appendBubble("bot", "Wait lang boss! Aalis ka na agad? Baka gusto mo munang magpa-schedule ng quick Technical Audit natin? Sayang ang oras, libre lang magtanong! 😊");
  sessionStorage.setItem("exit_offered", "true");

  if (hasUserInteracted && window.speechSynthesis && !isMuted) {
    window.speakText("Wait lang boss! Aalis ka na agad? Baka gusto mo munang magpa-schedule ng quick Technical Audit natin?");
  }

  document.removeEventListener("mouseleave", checkMouseLeave);
  document.removeEventListener("visibilitychange", checkVisibility);
  window.removeEventListener("scroll", checkScroll);
}

document.addEventListener("mouseleave", checkMouseLeave);
document.addEventListener("visibilitychange", checkVisibility);
window.addEventListener("scroll", checkScroll, { passive: true });
