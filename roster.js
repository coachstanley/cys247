/**
 * roster.js - 全校師生名冊、批次管理與權限維護
 */
window.g_rosterList = [];
window.selectedRosterUserIds = new Set();

document.addEventListener('DOMContentLoaded', () => {
  initRosterData();
  renderRosterTable();
});

function initRosterData() {
  try {
    const localData = localStorage.getItem(CYS_CONFIG.STORAGE_KEYS.ROSTER);
    if (localData) window.g_rosterList = JSON.parse(localData);
  } catch (e) {
    window.g_rosterList = [];
  }

  // 核心管理員防誤刪自愈保護 (密碼強制遮蔽)
  const hasCyc = window.g_rosterList.some(u => u.email === 'cyc@cys.edu.hk');
  if (!hasCyc) {
    window.g_rosterList.unshift({
      id: 'USR_CYC_001',
      name: '張耀宗 副校長',
      username: 'cyc',
      email: 'cyc@cys.edu.hk',
      role: 'teacher_admin',
      roleLabel: '教師及管理員',
      password: '••••••••',
      rawPassword: '', // 保持隱蔽，由 auth.js 核心雜湊校驗
      isProtected: true
    });
  }
  saveRosterToStorage();
}

function saveRosterToStorage() {
  try {
    localStorage.setItem(CYS_CONFIG.STORAGE_KEYS.ROSTER, JSON.stringify(window.g_rosterList));
  } catch (err) {
    console.error("無法將名冊寫入 localStorage", err);
  }
}

// 批次選取與操作
function updateBatchToolbarUI() {
  const badge = document.getElementById('batchSelectedCountBadge');
  const chkAll = document.getElementById('chkSelectAllRoster');
  const count = window.selectedRosterUserIds.size;

  if (badge) {
    badge.innerText = `已選取 ${count} 筆`;
    badge.className = count > 0 
      ? "bg-red-800 text-white font-bold px-2 py-0.5 rounded-full transition shadow-xs" 
      : "bg-white text-red-900 border border-red-300 font-bold px-2 py-0.5 rounded-full transition";
  }

  const nonProtected = window.g_rosterList.filter(u => !u.isProtected && u.email !== 'cyc@cys.edu.hk');
  if (chkAll && nonProtected.length > 0) {
    chkAll.checked = nonProtected.every(u => window.selectedRosterUserIds.has(u.id));
  }
}

window.toggleSelectAllRoster = function(checked) {
  if (checked) {
    window.g_rosterList.forEach(u => {
      if (!u.isProtected && u.email !== 'cyc@cys.edu.hk') {
        window.selectedRosterUserIds.add(u.id);
      }
    });
  } else {
    window.selectedRosterUserIds.clear();
  }
  updateBatchToolbarUI();
  renderRosterTable();
};

window.toggleSelectUser = function(userId, checked) {
  if (checked) {
    window.selectedRosterUserIds.add(userId);
  } else {
    window.selectedRosterUserIds.delete(userId);
  }
  updateBatchToolbarUI();
};

window.handleBatchChangeRole = function(targetRole) {
  if (window.selectedRosterUserIds.size === 0) {
    alert("⚠️ 請先在名冊表格中勾選要修改的帳號！");
    return;
  }

  const roleMeta = {
    teacher: { role: 'teacher', label: '教師' },
    student: { role: 'student', label: '學生' },
    admin: { role: 'admin', label: '管理員' }
  };
  const meta = roleMeta[targetRole] || roleMeta.teacher;
  const count = window.selectedRosterUserIds.size;

  if (!confirm(`您確定要將已選取的 ${count} 個帳號身分一鍵修改為【${meta.label}】嗎？`)) return;

  let modifiedCount = 0;
  window.g_rosterList.forEach(u => {
    if (window.selectedRosterUserIds.has(u.id) && !u.isProtected && u.email !== 'cyc@cys.edu.hk') {
      u.role = meta.role;
      u.roleLabel = meta.label;
      modifiedCount++;
    }
  });

  saveRosterToStorage();
  window.selectedRosterUserIds.clear();
  updateBatchToolbarUI();
  renderRosterTable();
  alert(`✅ 成功將 ${modifiedCount} 個帳號身分更新為【${meta.label}】！`);
};

window.handleBatchDeleteUsers = function() {
  if (window.selectedRosterUserIds.size === 0) {
    alert("⚠️ 請先在名冊表格中勾選要刪除的帳號！");
    return;
  }

  const count = window.selectedRosterUserIds.size;
  if (!confirm(`🚨【警告】您確定要批次永久刪除已選取的 ${count} 個帳號嗎？\n\n（核心管理員帳號受到保護，不會被刪除）`)) return;

  const prevLen = window.g_rosterList.length;
  window.g_rosterList = window.g_rosterList.filter(u => {
    if (u.isProtected || u.email === 'cyc@cys.edu.hk') return true;
    return !window.selectedRosterUserIds.has(u.id);
  });
  const deletedCount = prevLen - window.g_rosterList.length;

  window.selectedRosterUserIds.clear();
  saveRosterToStorage();
  updateBatchToolbarUI();
  renderRosterTable();
  alert(`✅ 已成功批次刪除 ${deletedCount} 個帳號！`);
};

// 個別帳號修改 (Modal)
window.openEditUserModal = function(userId) {
  const user = window.g_rosterList.find(u => u.id === userId);
  if (!user) return;

  const modal = document.getElementById('modalEditUser');
  if (!modal) return;

  document.getElementById('editUserId').value = user.id;
  document.getElementById('editUserName').value = user.name || '';
  document.getElementById('editUserEmail').value = user.email || user.username || '';
  document.getElementById('editUserRole').value = user.role === 'admin' ? 'admin' : (user.role === 'teacher' ? 'teacher' : 'student');
  document.getElementById('editUserPassword').value = user.isProtected ? '' : (user.rawPassword || 'cys123456');

  const isProtected = user.isProtected || user.email === 'cyc@cys.edu.hk';
  document.getElementById('editUserEmail').disabled = isProtected;
  document.getElementById('editUserRole').disabled = isProtected;
  
  if (isProtected) {
    document.getElementById('editUserPassword').placeholder = "保留原安全密碼 (留空不修改)";
  } else {
    document.getElementById('editUserPassword').placeholder = "請輸入密碼";
  }

  modal.classList.remove('hidden');
};

window.closeEditUserModal = function() {
  const modal = document.getElementById('modalEditUser');
  if (modal) modal.classList.add('hidden');
};

window.saveUserEdit = function(event) {
  if (event) event.preventDefault();

  const id = document.getElementById('editUserId')?.value;
  const name = document.getElementById('editUserName')?.value.trim();
  const email = document.getElementById('editUserEmail')?.value.trim();
  const role = document.getElementById('editUserRole')?.value;
  const pwd = document.getElementById('editUserPassword')?.value.trim();

  const user = window.g_rosterList.find(u => u.id === id);
  if (!user) return;

  user.name = name;
  if (!user.isProtected && user.email !== 'cyc@cys.edu.hk') {
    user.email = email;
    user.role = role;
    user.roleLabel = role === 'teacher' ? '教師' : (role === 'admin' ? '管理員' : '學生');
    if (pwd) user.rawPassword = pwd;
  } else if (user.isProtected && pwd) {
    // 管理員自訂修改密碼
    user.rawPassword = pwd;
  }

  saveRosterToStorage();
  closeEditUserModal();
  renderRosterTable();
  alert(`✅ 帳號【${name}】資料已成功更新！`);
};

// 表格渲染 (含勾選、編輯與刪除)
window.renderRosterTable = function() {
  const tbody = document.getElementById('rosterTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  window.g_rosterList.forEach((user, idx) => {
    const tr = document.createElement('tr');
    tr.className = "hover:bg-gray-50/80 transition";

    const isProtected = user.isProtected || user.email === 'cyc@cys.edu.hk';
    const isSelected = window.selectedRosterUserIds.has(user.id);

    let roleBadgeClass = "bg-blue-100 text-blue-900 border border-blue-200";
    if (user.role.includes('admin') || user.role === 'teacher_admin') {
      roleBadgeClass = "bg-purple-100 text-purple-900 border border-purple-200";
    } else if (user.role === 'teacher') {
      roleBadgeClass = "bg-red-100 text-red-900 border border-red-200";
    }

    tr.innerHTML = `
      <td class="px-3 py-3 w-10 text-center">
        ${
          isProtected
            ? '<span class="text-gray-300 text-xs">🔒</span>'
            : `<input type="checkbox" onchange="toggleSelectUser('${user.id}', this.checked)" ${isSelected ? 'checked' : ''} class="rounded text-red-900 focus:ring-red-800 cursor-pointer">`
        }
      </td>
      <td class="px-4 py-3 font-semibold text-gray-800 flex items-center gap-1.5">
        ${isProtected ? '<span title="核心保護帳號">⭐</span>' : '👤'}
        <span>${escapeHtml(user.name)}</span>
      </td>
      <td class="px-4 py-3 font-mono text-gray-600">${escapeHtml(user.email || user.username)}</td>
      <td class="px-4 py-3">
        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold ${roleBadgeClass}">
          ${escapeHtml(user.roleLabel || user.role)}
        </span>
      </td>
      <td class="px-4 py-3">
        <div class="flex items-center space-x-2">
          <span id="pwdDisplay_${idx}" class="font-mono text-gray-500">••••••••</span>
          ${
            isProtected
              ? '<span class="text-[11px] text-gray-400 font-mono italic">受保護</span>'
              : `<button type="button" onclick="toggleRosterPassword(${idx})" class="text-gray-400 hover:text-gray-700 text-xs" title="顯示/隱藏密碼">👁️</button>`
          }
        </div>
      </td>
      <td class="px-4 py-3 text-right space-x-1.5">
        <button onclick="openEditUserModal('${user.id}')" class="text-gray-600 hover:text-red-900 font-semibold text-xs px-2 py-1 rounded-lg hover:bg-gray-100 transition">✏️ 編輯</button>
        ${
          isProtected
            ? '<span class="text-xs text-gray-400 italic">核心保護</span>'
            : `<button onclick="deleteRosterUser('${user.id}')" class="text-red-600 hover:text-red-800 font-semibold text-xs px-2 py-1 rounded-lg hover:bg-red-50 transition">🗑️ 刪除</button>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });

  updateBatchToolbarUI();
};

window.toggleRosterPassword = function(idx) {
  const el = document.getElementById(`pwdDisplay_${idx}`);
  if (!el || !window.g_rosterList[idx]) return;
  const user = window.g_rosterList[idx];
  if (user.isProtected || user.email === 'cyc@cys.edu.hk') return;

  const raw = user.rawPassword || 'cys123456';

  if (el.innerText === '••••••••') {
    el.innerText = raw;
    el.classList.add('text-red-800', 'font-bold');
    el.classList.remove('text-gray-500');
  } else {
    el.innerText = '••••••••';
    el.classList.remove('text-red-800', 'font-bold');
    el.classList.add('text-gray-500');
  }
};

window.deleteRosterUser = function(userId) {
  const target = window.g_rosterList.find(u => u.id === userId);
  if (!target) return;
  if (target.isProtected || target.email === 'cyc@cys.edu.hk') {
    alert("⛔ 核心管理員帳號已鎖定，無法刪除！");
    return;
  }
  if (confirm(`您確定要刪除帳號【${target.name} (${target.email})】嗎？`)) {
    window.g_rosterList = window.g_rosterList.filter(u => u.id !== userId);
    window.selectedRosterUserIds.delete(userId);
    saveRosterToStorage();
    renderRosterTable();
  }
};

// 智慧繁體中文 CSV 匯入與匯出
window.handleCsvImport = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
      let importedCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i].trim();
        if (i === 0 && (rawLine.includes('姓名') || rawLine.includes('電郵') || rawLine.includes('email'))) continue;

        const cols = rawLine.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length >= 2) {
          const name = cols[0];
          const email = cols[1];
          const detected = parseUserFromCsvRow(cols);

          const existing = window.g_rosterList.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
          if (existing) {
            existing.name = name;
            if (!existing.isProtected && existing.email !== 'cyc@cys.edu.hk') {
              existing.role = detected.role;
              existing.roleLabel = detected.roleLabel;
            }
            if (detected.password && !existing.isProtected) existing.rawPassword = detected.password;
          } else {
            window.g_rosterList.push({
              id: 'USR_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
              name: name,
              username: email.split('@')[0],
              email: email,
              role: detected.role,
              roleLabel: detected.roleLabel,
              password: '••••••••',
              rawPassword: detected.password || 'cys123456',
              isProtected: false
            });
          }
          importedCount++;
        }
      }

      saveRosterToStorage();
      renderRosterTable();
      alert(`✅ 成功智慧解析並匯入 ${importedCount} 筆師生帳戶！\n中文職銜已精準對齊為教師。`);
    } catch (err) {
      alert("❌ 解析 CSV 檔案失敗：" + err.message);
    }
  };
  reader.readAsText(file, "UTF-8");
};

function parseUserFromCsvRow(cols) {
  const rowContent = cols.join(' ').toLowerCase();
  let role = 'student';
  let roleLabel = '學生';

  if (
    rowContent.includes('校長') || rowContent.includes('副校長') ||
    rowContent.includes('助理校長') || rowContent.includes('老師') ||
    rowContent.includes('教師') || rowContent.includes('主任') ||
    rowContent.includes('teacher')
  ) {
    role = 'teacher';
    roleLabel = '教師';
  } else if (rowContent.includes('管理員') || rowContent.includes('admin')) {
    role = 'admin';
    roleLabel = '系統管理員';
  }

  let password = 'cys123456';
  for (let c = cols.length - 1; c >= 2; c--) {
    const val = cols[c].trim();
    const isRoleWord = ['老師', '教師', '校長', '副校長', '助理校長', '主任', '學生', '管理員', 'teacher', 'admin', 'student'].includes(val);
    if (val && !isRoleWord && val.length >= 4) {
      password = val;
      break;
    }
  }

  return { role, roleLabel, password };
}

window.exportRosterToCsv = function() {
  if (!window.g_rosterList || window.g_rosterList.length === 0) {
    alert("名冊中尚無資料可供匯出。");
    return;
  }
  let csvContent = "\uFEFF姓名,校本電郵,身分角色,登入密碼\n";
  window.g_rosterList.forEach(u => {
    // 核心管理員密碼強制遮蔽，不導出真實密碼
    const pwdOut = (u.isProtected || u.email === 'cyc@cys.edu.hk') ? "PROTECTED" : (u.rawPassword || 'cys123456');
    csvContent += `"${u.name}","${u.email}","${u.roleLabel || u.role}","${pwdOut}"\n`;
  });
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `CYS_Roster_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
