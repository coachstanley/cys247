/**
 * materials.js - Google Drive 動態教材讀取與宏觀自學統計 (含層級防錯過濾)
 */
window.activeAcademicYear = localStorage.getItem(CYS_CONFIG.STORAGE_KEYS.CURRENT_YEAR) || CYS_CONFIG.DEFAULT_ACADEMIC_YEAR;

// 年級識別標籤 (用於前端防禦，避免下拉選單誤載入年級代碼)
const CYS_GRADE_KEYS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', '中一', '中二', '中三', '中四', '中五', '中六'];

document.addEventListener('DOMContentLoaded', () => {
  initSubjectStats();
  renderSubjectStats();
  loadSubjectsFromDrive();
});

window.loadSubjectsFromDrive = function() {
  const gradeEl = document.getElementById('selectGrade');
  const subjectEl = document.getElementById('selectSubject');
  const syncBadge = document.getElementById('driveSyncIndicator');
  if (!gradeEl || !subjectEl) return;

  const currentGrade = gradeEl.value || 'S6';

  if (syncBadge) {
    syncBadge.className = "text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-medium border border-amber-200 animate-pulse";
    syncBadge.innerText = "⏳ 正在讀取 Drive 學科...";
  }

  fetch(CYS_CONFIG.GAS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'getSubjects',
      academicYear: window.activeAcademicYear,
      grade: currentGrade
    })
  })
  .then(res => res.json())
  .then(data => {
    // 嚴格過濾：徹底排除因後端目錄穿透錯位而回傳的「年級代碼 (如 S1~S6)」
    const rawList = (data && data.status === 'success' && Array.isArray(data.subjects)) ? data.subjects : [];
    const validSubjects = rawList.filter(sub => {
      const code = (sub.code || '').trim().toUpperCase();
      const name = (sub.name || '').trim().toUpperCase();
      return !CYS_GRADE_KEYS.includes(code) && !CYS_GRADE_KEYS.includes(name);
    });

    if (validSubjects.length > 0) {
      renderSubjectOptions(validSubjects);
      if (syncBadge) {
        syncBadge.className = "text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium border border-emerald-200";
        syncBadge.innerText = `⚡ Drive 同步成功 (${validSubjects.length} 科)`;
      }
    } else {
      renderDefaultSubjectOptions(currentGrade);
      if (syncBadge) {
        syncBadge.className = "text-[11px] text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md font-medium border border-gray-200";
        syncBadge.innerText = "📁 使用校本備援選單";
      }
    }
    loadTopicsFromDrive();
  })
  .catch(err => {
    renderDefaultSubjectOptions(currentGrade);
    if (syncBadge) {
      syncBadge.className = "text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md font-medium border border-gray-200";
      syncBadge.innerText = "📁 離線備援選單";
    }
    loadTopicsFromDrive();
  });
};

function renderSubjectOptions(subjects) {
  const select = document.getElementById('selectSubject');
  if (!select) return;
  const prevValue = select.value;
  select.innerHTML = '';

  subjects.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub.code;
    opt.innerText = sub.name.includes('-') ? sub.name : `${sub.code} - ${sub.name}`;
    select.appendChild(opt);
  });

  if (Array.from(select.options).some(o => o.value === prevValue)) {
    select.value = prevValue;
  } else if (Array.from(select.options).some(o => o.value === 'ICT')) {
    select.value = 'ICT';
  }
}

function renderDefaultSubjectOptions(grade) {
  const select = document.getElementById('selectSubject');
  if (!select) return;
  const prevValue = select.value;
  select.innerHTML = '';

  let list = CYS_CONFIG.FULL_SUBJECTS;
  if (grade === 'S1' || grade === 'S2') list = CYS_CONFIG.FULL_SUBJECTS.slice(0, 15);
  else if (grade === 'S3') list = CYS_CONFIG.FULL_SUBJECTS.slice(0, 19);

  list.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub.code;
    opt.innerText = `${sub.code} - ${sub.name}`;
    select.appendChild(opt);
  });

  if (Array.from(select.options).some(o => o.value === prevValue)) select.value = prevValue;
  else select.value = 'ICT';
}

window.loadTopicsFromDrive = function() {
  const grade = document.getElementById('selectGrade')?.value || 'S6';
  const subject = document.getElementById('selectSubject')?.value || 'ICT';
  const classGroup = document.getElementById('selectClassGroup')?.value || 'ACD';
  const container = document.getElementById('topicCheckboxContainer');
  if (!container) return;

  container.innerHTML = '<div class="p-2 text-gray-400 italic text-center">⏳ 正在自雲端讀取課題章節...</div>';

  fetch(CYS_CONFIG.GAS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'getTopics',
      academicYear: window.activeAcademicYear,
      grade: grade,
      subject: subject,
      classGroup: classGroup
    })
  })
  .then(res => res.json())
  .then(data => {
    const rawTopics = (data && data.status === 'success' && Array.isArray(data.topics)) ? data.topics : [];

    // 嚴格過濾：徹底排除因錯位回傳的「學科代碼 (如 CHI, ICT)」或「班別群組 (如 ACD, BE)」
    const KNOWN_CODES = CYS_CONFIG.FULL_SUBJECTS.map(s => s.code.toUpperCase());
    const validTopics = rawTopics.filter(t => {
      const clean = String(t).trim().toUpperCase();
      return !KNOWN_CODES.includes(clean) && !CYS_GRADE_KEYS.includes(clean) && clean !== 'ACD' && clean !== 'BE';
    });

    if (validTopics.length > 0) {
      renderTopicCheckboxes(validTopics);
    } else {
      renderDefaultTopics(subject);
    }
  })
  .catch(() => renderDefaultTopics(subject));
};

function renderTopicCheckboxes(topics) {
  const container = document.getElementById('topicCheckboxContainer');
  if (!container) return;
  container.innerHTML = '';
  topics.forEach((topic, idx) => {
    const label = document.createElement('label');
    label.className = "flex items-center space-x-2 p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer";
    label.innerHTML = `
      <input type="checkbox" name="topic" value="${escapeHtml(topic)}" ${idx === 0 ? 'checked' : ''} class="rounded text-red-900 focus:ring-red-800">
      <span class="text-gray-700">${escapeHtml(topic)}</span>
    `;
    container.appendChild(label);
  });
}

function renderDefaultTopics(subject) {
  const defaults = [
    `單元一：${subject} 核心基礎原理與核心概念`,
    `單元二：${subject} 香港中學文憑試 (DSE) 歷屆實戰題目探究`,
    `單元三：日常生活情境分析與跨學科 STEAM 應用`
  ];
  renderTopicCheckboxes(defaults);
}

// 宏觀自學統計
function initSubjectStats() {
  const existing = localStorage.getItem(CYS_CONFIG.STORAGE_KEYS.STATS);
  if (!existing) {
    const stats = {};
    CYS_CONFIG.FULL_SUBJECTS.forEach(sub => stats[sub.code] = sub.defaultCount);
    localStorage.setItem(CYS_CONFIG.STORAGE_KEYS.STATS, JSON.stringify(stats));
  }
}

window.renderSubjectStats = function() {
  const grid = document.getElementById('teacherSubjectStatsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  let statsMap = {};
  try {
    statsMap = JSON.parse(localStorage.getItem(CYS_CONFIG.STORAGE_KEYS.STATS) || '{}');
  } catch (e) {}

  CYS_CONFIG.FULL_SUBJECTS.forEach(sub => {
    const count = statsMap[sub.code] !== undefined ? statsMap[sub.code] : 0;
    const card = document.createElement('div');
    card.className = "p-4 bg-gray-50/70 rounded-xl border border-gray-100 flex items-center justify-between";
    card.innerHTML = `
      <div>
        <p class="font-bold text-gray-800 text-sm">${escapeHtml(sub.name)}</p>
        <span class="text-[11px] font-mono text-gray-400">${sub.code}</span>
      </div>
      <div class="text-right">
        <span class="text-lg font-bold text-red-900">${count}</span>
        <span class="text-xs text-gray-500 ml-0.5">人次</span>
      </div>
    `;
    grid.appendChild(card);
  });
};

window.handleAdminResetStats = function() {
  const cur = window.currentUser || {};
  if (cur.role !== 'admin' && cur.role !== 'teacher_admin' && cur.email !== 'cyc@cys.edu.hk') {
    alert("⛔ 權限不足：只有管理員可以執行全校數據重設！");
    return;
  }
  if (!confirm("⚠️ 您確定要將全校所有學科的「自學人次」全數歸零嗎？")) return;
  if (prompt("請輸入「RESET」確認重設：") !== "RESET") return;

  const zeroStats = {};
  CYS_CONFIG.FULL_SUBJECTS.forEach(sub => zeroStats[sub.code] = 0);
  localStorage.setItem(CYS_CONFIG.STORAGE_KEYS.STATS, JSON.stringify(zeroStats));
  window.renderSubjectStats();
  alert("✅ 全校 24 個學科自學人次已成功歸零！");
};
