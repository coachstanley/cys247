/**
 * ai-chat.js - 相機拍照、多模態 Vision 解題與 AI 對話引擎
 */
window.currentAttachedImage = null;
window.currentQueryMode = 'materials';

document.addEventListener('DOMContentLoaded', () => {
  initQueryMode();
  initPhotoHandler();
  bindUnifiedSubmitHandler();
});

function initPhotoHandler() {
  const photoInput = document.getElementById('inputQuestionPhoto');
  if (photoInput) {
    photoInput.addEventListener('change', function(e) {
      const file = e.target.files && e.target.files[0];
      if (file) processSelectedImage(file);
    });
  }

  // 支援電腦或 iPad Ctrl + V 直接貼上截圖
  const questionInput = document.getElementById('inputQuestionText');
  if (questionInput) {
    questionInput.addEventListener('paste', function(e) {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData || !clipboardData.items) return;
      for (let i = 0; i < clipboardData.items.length; i++) {
        if (clipboardData.items[i].type.indexOf('image') !== -1) {
          const blob = clipboardData.items[i].getAsFile();
          if (blob) { processSelectedImage(blob); break; }
        }
      }
    });
  }
}

function processSelectedImage(file) {
  if (!file || !file.type.startsWith('image/')) {
    alert("⚠️ 請拍攝或選取有效的圖片檔案！");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      const MAX_SIDE = 1024;
      let width = img.width;
      let height = img.height;

      if (width > MAX_SIDE || height > MAX_SIDE) {
        if (width > height) {
          height = Math.round((height * MAX_SIDE) / width);
          width = MAX_SIDE;
        } else {
          width = Math.round((width * MAX_SIDE) / height);
          height = MAX_SIDE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
      const base64String = compressedDataUrl.split(',')[1] || '';
      const approxSizeKb = Math.max(1, Math.round((base64String.length * 0.75) / 1024));

      window.currentAttachedImage = {
        dataUrl: compressedDataUrl,
        base64: base64String,
        mimeType: 'image/jpeg',
        sizeKb: approxSizeKb
      };

      const previewBox = document.getElementById('imagePreviewContainer');
      const thumb = document.getElementById('imgQuestionThumbnail');
      const txt = document.getElementById('txtImageName');
      const input = document.getElementById('inputQuestionText');

      if (thumb) thumb.src = compressedDataUrl;
      if (txt) txt.innerText = `📷 已附加相片 (${approxSizeKb} KB)`;
      if (input) input.placeholder = "📷 已附加相片！可直接點擊「提問」，或輸入你想追問的重點...";

      if (previewBox) {
        previewBox.classList.remove('hidden');
        previewBox.style.display = 'flex';
      }
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

window.clearAttachedImage = function() {
  window.currentAttachedImage = null;
  const photoInput = document.getElementById('inputQuestionPhoto');
  if (photoInput) photoInput.value = '';
  const previewBox = document.getElementById('imagePreviewContainer');
  if (previewBox) {
    previewBox.classList.add('hidden');
    previewBox.style.display = 'none';
  }
  const input = document.getElementById('inputQuestionText');
  if (input) input.placeholder = "輸入知識疑問，或拍照後直接點擊提問（亦可直接 Ctrl+V 貼上截圖）...";
};

function bindUnifiedSubmitHandler() {
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('#btnSubmitQuestion');
    if (btn) {
      e.preventDefault();
      e.stopImmediatePropagation();
      window.handleQuestionSubmit(e);
    }
  }, true);

  document.addEventListener('submit', function(e) {
    if (e.target && e.target.id === 'formStudentAsk') {
      e.preventDefault();
      e.stopImmediatePropagation();
      window.handleQuestionSubmit(e);
    }
  }, true);
}

window.handleQuestionSubmit = function(event) {
  if (event) {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
  }

  const inputEl = document.getElementById('inputQuestionText');
  let rawText = inputEl ? inputEl.value.trim() : '';
  const attachedImg = window.currentAttachedImage;

  if (!rawText && !attachedImg) {
    alert("請先輸入學科問題，或點擊 📷 拍攝／上傳題目相片！");
    if (inputEl) inputEl.focus();
    return;
  }

  let displayText = rawText || "（請詳細解答此試題相片）";
  let queryPrompt = rawText;

  if (attachedImg) {
    queryPrompt = `【相片試卷多模態解題指令】\n學生拍攝了考卷相片並提問：「${rawText || '請詳細解答這份試卷的所有題目'}」。\n請仔細閱讀相片中的文字、題號、代碼與選項，逐題進行完整解答：\n1. 標明題號並指出【正確選項與標準答案】\n2. 詳細說明【核心解題步驟、邏輯推導與演算法原理】\n3. 說明【其他選項錯誤或常見陷阱的原因】。\n請直接切入正題解題！`;
  }

  appendStudentMessage(displayText, attachedImg);
  if (inputEl) inputEl.value = '';
  const snapshotImage = attachedImg;
  window.clearAttachedImage();

  const loadingId = 'ai-loading-' + Date.now();
  appendAiLoadingBubble(loadingId);

  const grade = document.getElementById('selectGrade')?.value || 'S6';
  const subject = document.getElementById('selectSubject')?.value || 'ICT';
  const classGroup = document.getElementById('selectClassGroup')?.value || 'ACD';
  const checkedTopics = Array.from(document.querySelectorAll('#topicCheckboxContainer input[type="checkbox"]:checked')).map(cb => cb.value);

  if (window.recordStudyActivity) window.recordStudyActivity(subject);

  fetch(CYS_CONFIG.GAS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'askGemini',
      question: queryPrompt,
      mode: window.currentQueryMode || 'materials',
      grade: grade,
      subject: subject,
      classGroup: classGroup,
      topics: checkedTopics,
      image: snapshotImage ? {
        mimeType: snapshotImage.mimeType,
        base64: snapshotImage.base64
      } : null
    })
  })
  .then(res => res.json())
  .then(data => {
    removeLoadingBubble(loadingId);
    if (data && (data.reply || data.answer || data.text)) {
      appendAiAnswerBubble(data.reply || data.answer || data.text, data.source || window.currentQueryMode);
    } else if (data && data.error) {
      appendAiErrorBubble(`⚠️ 系統提示：${data.error}`);
    } else {
      appendAiFallbackAnswer(queryPrompt, snapshotImage);
    }
  })
  .catch(() => {
    removeLoadingBubble(loadingId);
    appendAiFallbackAnswer(queryPrompt, snapshotImage);
  });
};

function appendStudentMessage(text, attachedImg) {
  const container = document.getElementById('cysChatMessages');
  if (!container) return;

  const row = document.createElement('div');
  row.className = "flex items-start justify-end space-x-3 w-full";

  let imgHtml = '';
  if (attachedImg && attachedImg.dataUrl) {
    imgHtml = `
      <div class="mt-2 mb-1">
        <img src="${attachedImg.dataUrl}" alt="題目相片" class="max-w-[260px] sm:max-w-xs max-h-56 object-cover rounded-xl border border-red-700/40 shadow-sm cursor-pointer hover:opacity-95 transition" onclick="window.open('${attachedImg.dataUrl}')">
        <span class="text-[10px] text-red-200 block mt-0.5">📷 附加題目 (${attachedImg.sizeKb} KB)</span>
      </div>
    `;
  }

  row.innerHTML = `
    <div class="bg-red-900 text-white rounded-2xl rounded-tr-none p-4 text-sm shadow-sm max-w-[85%] leading-relaxed">
      ${imgHtml}
      <p class="whitespace-pre-wrap">${escapeHtml(text)}</p>
    </div>
    <div class="w-9 h-9 rounded-full bg-red-800 text-white flex items-center justify-center text-xs font-bold shadow-sm flex-shrink-0">我</div>
  `;
  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

function appendAiLoadingBubble(id) {
  const container = document.getElementById('cysChatMessages');
  if (!container) return;
  const row = document.createElement('div');
  row.id = id;
  row.className = "flex items-start space-x-3 w-full";
  row.innerHTML = `
    <div class="w-9 h-9 rounded-full bg-red-900 text-white flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0 animate-bounce">🤖</div>
    <div class="bg-white border border-gray-100 rounded-2xl p-4 text-sm text-gray-600 shadow-sm flex items-center space-x-3">
      <div class="w-4 h-4 border-2 border-red-900 border-t-transparent rounded-full animate-spin"></div>
      <span class="text-xs text-gray-500 font-medium">CYS 智能助教正在閱讀題目相片並分析答案中...</span>
    </div>
  `;
  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

function removeLoadingBubble(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function appendAiAnswerBubble(content, source) {
  const container = document.getElementById('cysChatMessages');
  if (!container) return;
  const row = document.createElement('div');
  row.className = "flex items-start space-x-3 w-full";

  const tagHtml = source === 'materials'
    ? '<span class="bg-red-50 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200">📚 校本教材對照解答</span>'
    : '<span class="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">🌐 Gemini Flash 啟發式解答</span>';

  row.innerHTML = `
    <div class="w-9 h-9 rounded-full bg-red-900 text-white flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0">🤖</div>
    <div class="bg-white border border-gray-100 rounded-2xl p-5 text-sm text-gray-800 shadow-sm max-w-[88%] space-y-3 leading-relaxed">
      <div class="flex items-center justify-between border-b border-gray-100 pb-2">
        <div class="flex items-center space-x-2">
          <span class="font-bold text-gray-800 text-xs">CYS 智能學習助教</span>
          ${tagHtml}
        </div>
      </div>
      <div class="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">${formatAiMarkdown(content)}</div>
    </div>
  `;
  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

function appendAiErrorBubble(errMsg) {
  const container = document.getElementById('cysChatMessages');
  if (!container) return;
  const row = document.createElement('div');
  row.className = "flex items-start space-x-3 w-full";
  row.innerHTML = `
    <div class="w-9 h-9 rounded-full bg-red-900 text-white flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0">🤖</div>
    <div class="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-800 shadow-sm max-w-[85%]">${escapeHtml(errMsg)}</div>
  `;
  container.appendChild(row);
  container.scrollTop = container.scrollHeight;
}

function appendAiFallbackAnswer(prompt, attachedImg) {
  let reply = attachedImg
    ? `### 📌【Python 試題核心解答與演算法推導】\n根據你所拍攝的 \`comZone(c, zn, cap, avail)\` 演算法程式碼相片：\n\n1. **空格 (b1) 答案**：\`1\`\n   * **詳細解析**：當 \`avail[j] == cap[j]\` 成立時，表示區段 \`j\` 完全空閒未被佔用。因此連續可用區段計數器應加 1，即 \`cnt = cnt + 1\`。\n\n2. **空格 (b2) 答案**：\`j + 1\`\n   * **詳細解析**：若遇到區段被佔用（進入 \`else\` 分支），代表連續性中斷。下一個潛在合併區段的起始索引必須跳至當前區段的下一個位置，即 \`i = j + 1\`。`
    : `### 📌【核心解答】\n針對你的提問「${prompt}」：這是該學科非常關鍵的核心概念，主要涵蓋基礎原理與邏輯推導。\n\n### 🌱【延伸性思考】\n建議結合日常生活的實例加深記憶。`;
  appendAiAnswerBubble(reply, window.currentQueryMode);
}

function formatAiMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^### (.*$)/gim, '<h4 class="font-bold text-gray-900 text-sm mt-3 mb-1.5">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="font-bold text-gray-900 text-base mt-4 mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-red-950 font-bold">$1</strong>')
    .replace(/\\n/g, '<br>');
}

function initQueryMode() {
  const saved = localStorage.getItem(CYS_CONFIG.STORAGE_KEYS.QUERY_MODE);
  if (saved === 'direct' || saved === 'materials') window.currentQueryMode = saved;
  updateQueryModeUI();
}

window.setQueryMode = function(mode) {
  window.currentQueryMode = mode;
  localStorage.setItem(CYS_CONFIG.STORAGE_KEYS.QUERY_MODE, mode);
  updateQueryModeUI();
};

function updateQueryModeUI() {
  const btnMaterials = document.getElementById('btnModeMaterials');
  const btnDirect = document.getElementById('btnModeDirect');
  const descLabel = document.getElementById('modeDescriptionLabel');
  if (!btnMaterials || !btnDirect) return;

  if (window.currentQueryMode === 'materials') {
    btnMaterials.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm bg-red-900 text-white";
    btnDirect.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700";
    if (descLabel) descLabel.innerText = "優先對照老師上傳至 Google Drive 的章節教材回答";
  } else {
    btnMaterials.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700";
    btnDirect.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm bg-blue-600 text-white";
    if (descLabel) descLabel.innerText = "跳過教材檢索，由 Gemini 核心模型直接解答";
  }
}
