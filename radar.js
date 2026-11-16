/**
 * radar.js - 八大學習領域 (KLA) 個人學力雷達圖引擎
 */
window.cysRadarChartInstance = null;

const KLA_LABELS = [
  '中國語文',
  '英國語文',
  '數學教育',
  '科學教育',
  '科技教育',
  '個人、社會與人文',
  '藝術教育',
  '體育'
];

function getStudentRadarScores() {
  try {
    const saved = localStorage.getItem(CYS_CONFIG.STORAGE_KEYS.RADAR_SCORES);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  const defaultScores = [75, 70, 82, 68, 88, 72, 60, 65];
  localStorage.setItem(CYS_CONFIG.STORAGE_KEYS.RADAR_SCORES, JSON.stringify(defaultScores));
  return defaultScores;
}

function saveStudentRadarScores(scores) {
  try {
    localStorage.setItem(CYS_CONFIG.STORAGE_KEYS.RADAR_SCORES, JSON.stringify(scores));
  } catch (e) {}
}

window.initStudentRadarChart = function() {
  const canvas = document.getElementById('studentRadarChart');
  if (!canvas) return;

  if (typeof Chart === 'undefined') {
    setTimeout(window.initStudentRadarChart, 500);
    return;
  }

  const scores = getStudentRadarScores();

  if (window.cysRadarChartInstance) {
    window.cysRadarChartInstance.data.datasets[0].data = scores;
    window.cysRadarChartInstance.update();
    return;
  }

  const ctx = canvas.getContext('2d');
  window.cysRadarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: KLA_LABELS,
      datasets: [{
        label: '個人自學能力指標',
        data: scores,
        backgroundColor: 'rgba(153, 27, 27, 0.2)',
        borderColor: 'rgba(153, 27, 27, 0.9)',
        borderWidth: 2.5,
        pointBackgroundColor: '#b91c1c',
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20, display: false },
          angleLines: { color: 'rgba(0, 0, 0, 0.08)' },
          grid: { color: 'rgba(0, 0, 0, 0.08)' },
          pointLabels: {
            font: { size: 11, weight: 'bold', family: 'sans-serif' },
            color: '#374151'
          }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
};

window.recordStudyActivity = function(subjectCode) {
  const sub = CYS_CONFIG.FULL_SUBJECTS.find(s => s.code.toUpperCase() === (subjectCode || '').toUpperCase());
  if (!sub) return;

  const klaIndexMap = {
    'chi': 0, 'eng': 1, 'math': 2, 'sci': 3,
    'tech': 4, 'pshe': 5, 'arts': 6, 'pe': 7
  };

  const targetIdx = klaIndexMap[sub.kla];
  if (targetIdx !== undefined) {
    const scores = getStudentRadarScores();
    scores[targetIdx] = Math.min(100, scores[targetIdx] + 2);
    saveStudentRadarScores(scores);

    if (window.cysRadarChartInstance) {
      window.cysRadarChartInstance.data.datasets[0].data = scores;
      window.cysRadarChartInstance.update();
    }
  }
};
