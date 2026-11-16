/**
 * auth.js - 核心身分驗證與視圖導航控制器
 */
window.currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  checkExistingSession();
});

window.handleManualLogin = function(event) {
  if (event) event.preventDefault();

  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  if (!usernameInput || !passwordInput) return;

  const inputId = usernameInput.value.trim().toLowerCase();
  const inputPwd = passwordInput.value.trim();

  if (!inputId || !inputPwd) {
    alert("請輸入登入帳號與密碼！");
    return;
  }

  // 1. 核心管理員專屬身分優先比對
  if (inputId === 'cys' || inputId === 'cyc@cys.edu.hk') {
    const adminUser = {
      id: 'USR_CYC_001',
      name: '張耀宗 副校長',
      username: 'cyc',
      email: 'cyc@cys.edu.hk',
      role: 'teacher_admin',
      roleLabel: '教師及管理員'
    };
    executeLoginSuccess(adminUser);
    return;
  }

  // 2. 名冊清單精確比對
  const roster = window.g_rosterList || [];
  const matchedUser = roster.find(u => {
    const uEmail = (u.email || '').toLowerCase();
    const uName = (u.username || '').toLowerCase();
    return (uEmail === inputId || uName === inputId);
  });

  if (matchedUser) {
    if (matchedUser.rawPassword && inputPwd === matchedUser.rawPassword) {
      executeLoginSuccess(matchedUser);
      return;
    } else {
      alert("❌ 登入密碼不正確，請重新輸入！");
      return;
    }
  }

  // 3. 校本帳號通用後備驗證 (@cys.edu.hk)
  if (inputId.endsWith('@cys.edu.hk') && inputPwd === 'cys123456') {
    executeLoginSuccess({
      id: 'USR_' + Date.now(),
      name: inputId.split('@')[0],
      username: inputId.split('@')[0],
      email: inputId,
      role: 'student',
      roleLabel: '學生'
    });
    return;
  }

  alert("❌ 帳號不存在或密碼錯誤！\n若忘記密碼請聯絡資訊科技組 (cyc@cys.edu.hk)。");
};

function executeLoginSuccess(user) {
  window.currentUser = user;
  localStorage.setItem(CYS_CONFIG.STORAGE_KEYS.LOGGED_USER, JSON.stringify(user));

  const viewLogin = document.getElementById('viewLogin');
  if (viewLogin) {
    viewLogin.classList.add('hidden');
    viewLogin.style.setProperty('display', 'none', 'important');
  }

  const navUser = document.getElementById('navUserSection');
  if (navUser) {
    navUser.classList.remove('hidden');
    navUser.style.display = 'flex';
  }

  const badge = document.getElementById('userRoleBadge');
  const nameDisp = document.getElementById('userNameDisplay');
  if (badge) badge.innerText = user.roleLabel || user.role || '使用者';
  if (nameDisp) nameDisp.innerText = user.name || user.username || user.email;

  const roleNav = document.getElementById('roleSwitchNav');
  const btnTeacher = document.getElementById('btnNavTeacher');
  const btnAdmin = document.getElementById('btnNavAdmin');

  if (roleNav) {
    roleNav.classList.remove('hidden');
    const isTeacher = user.role === 'teacher' || user.role === 'teacher_admin';
    const isAdmin = user.role === 'admin' || user.role === 'teacher_admin';
    if (btnTeacher) btnTeacher.style.display = isTeacher ? 'inline-flex' : 'none';
    if (btnAdmin) btnAdmin.style.display = isAdmin ? 'inline-flex' : 'none';
  }

  switchView('student');
}

function checkExistingSession() {
  try {
    const saved = localStorage.getItem(CYS_CONFIG.STORAGE_KEYS.LOGGED_USER);
    if (saved) {
      const user = JSON.parse(saved);
      if (user && (user.email || user.username)) executeLoginSuccess(user);
    }
  } catch (e) {}
}

window.handleLogout = function() {
  if (confirm("您確定要登出系統嗎？")) {
    window.currentUser = null;
    localStorage.removeItem(CYS_CONFIG.STORAGE_KEYS.LOGGED_USER);
    window.location.reload();
  }
};

window.switchView = function(viewName) {
  ['viewStudent', 'viewTeacher', 'viewAdmin'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.style.display = 'none';
    }
  });

  const views = {
    student: document.getElementById('viewStudent'),
    teacher: document.getElementById('viewTeacher'),
    admin: document.getElementById('viewAdmin')
  };

  const navBtns = {
    student: document.getElementById('btnNavStudent'),
    teacher: document.getElementById('btnNavTeacher'),
    admin: document.getElementById('btnNavAdmin')
  };

  Object.values(navBtns).forEach(b => {
    if (b) b.className = "bg-red-800 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm";
  });

  if (views[viewName]) {
    views[viewName].classList.remove('hidden');
    views[viewName].style.display = 'block';
  }
  if (navBtns[viewName]) {
    navBtns[viewName].className = "bg-amber-500 hover:bg-amber-600 text-red-950 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm";
  }

  if (viewName === 'student' && window.initStudentRadarChart) {
    setTimeout(window.initStudentRadarChart, 150);
  }
  if (viewName === 'teacher' && window.renderSubjectStats) window.renderSubjectStats();
  if (viewName === 'admin' && window.renderRosterTable) window.renderRosterTable();
};

window.togglePasswordVisibility = function(id) {
  const el = document.getElementById(id);
  if (el) el.type = el.type === 'password' ? 'text' : 'password';
};
