/**
 * config.js - 全域環境常數與基礎數據配置
 */
const CYS_CONFIG = {
  // 正式生產環境 GAS 後端網址
  GAS_API_URL: "https://script.google.com/macros/s/AKfycbzsOhKYiBwWQnL_p6VAbobVFYdvBcEN1PMVWgtqrYqk_QY-teGEa9i0EduYufod0i6E/exec",

  // 學校 Google Drive 根目錄 ID
  DRIVE_ROOT_FOLDER_ID: "1yaG5yqGmnNjIjh7wPQytD1IDwdXhuOEe",

  // 預設學年度與核心管理員
  DEFAULT_ACADEMIC_YEAR: "2026-2027",
  ADMIN_EMAIL: "cyc@cys.edu.hk",

  // 本地快取鍵名
  STORAGE_KEYS: {
    ROSTER: 'cys_roster_data_v2',
    STATS: 'cys_subject_stats_2026',
    LOGGED_USER: 'cys_logged_in_user',
    RADAR_SCORES: 'cys_student_radar_scores_v1',
    QUERY_MODE: 'cys_student_query_mode_v1',
    CURRENT_YEAR: 'cys_active_academic_year'
  },

  // 全校 24 個標準學科定義（兼作離線保底與統計依據）
  FULL_SUBJECTS: [
    { code: 'CHI', name: '中國語文', defaultCount: 45, kla: 'chi' },
    { code: 'ENG', name: '英國語文', defaultCount: 52, kla: 'eng' },
    { code: 'MATH', name: '數學科', defaultCount: 48, kla: 'math' },
    { code: 'M1', name: '數學延伸單元一 (M1)', defaultCount: 16, kla: 'math' },
    { code: 'M2', name: '數學延伸單元二 (M2)', defaultCount: 14, kla: 'math' },
    { code: 'IS', name: '綜合科學', defaultCount: 38, kla: 'sci' },
    { code: 'PHY', name: '物理科', defaultCount: 29, kla: 'sci' },
    { code: 'CHEM', name: '化學科', defaultCount: 31, kla: 'sci' },
    { code: 'BIO', name: '生物科', defaultCount: 34, kla: 'sci' },
    { code: 'HIST', name: '歷史科', defaultCount: 22, kla: 'pshe' },
    { code: 'CHIST', name: '中國歷史科', defaultCount: 19, kla: 'pshe' },
    { code: 'GEOG', name: '地理科', defaultCount: 27, kla: 'pshe' },
    { code: 'LS', name: '生活與社會科', defaultCount: 41, kla: 'pshe' },
    { code: 'CSD', name: '公民與社會發展科', defaultCount: 36, kla: 'pshe' },
    { code: 'THS', name: '旅遊與款待科', defaultCount: 25, kla: 'pshe' },
    { code: 'VA', name: '視覺藝術科', defaultCount: 18, kla: 'arts' },
    { code: 'MUS', name: '音樂科', defaultCount: 15, kla: 'arts' },
    { code: 'PE', name: '體育科', defaultCount: 43, kla: 'pe' },
    { code: 'CIT', name: '電腦與資訊科技', defaultCount: 28, kla: 'tech' },
    { code: 'ICT', name: '資訊及通訊科技 (ICT)', defaultCount: 39, kla: 'tech' },
    { code: 'CT', name: '創新科技 (CT)', defaultCount: 35, kla: 'tech' },
    { code: 'DNT', name: '設計與科技 (D&T)', defaultCount: 24, kla: 'tech' },
    { code: 'DAT', name: '設計與應用科技 (DAT)', defaultCount: 20, kla: 'tech' },
    { code: 'HE', name: '家政科 (HE)', defaultCount: 22, kla: 'tech' },
    { code: 'ECON', name: '經濟科', defaultCount: 30, kla: 'pshe' },
    { code: 'BAFS', name: '企業、會計與財務概論 (BAFS)', defaultCount: 33, kla: 'pshe' }
  ]
};

// 工具函式：HTML 跳脫防護
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
