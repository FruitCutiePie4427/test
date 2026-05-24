const form = document.getElementById('recordForm');
const recovery45El = document.getElementById('recovery45');
const recovery90El = document.getElementById('recovery90');
const recovery135El = document.getElementById('recovery135');
const recovery180El = document.getElementById('recovery180');
const recovery225El = document.getElementById('recovery225');
const recordsTableBody = document.getElementById('recordsTableBody');
const clearBtn = document.getElementById('clearBtn');
const STORAGE_KEY = 'heartRateRecords';
let records = [];

function parseNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function calculateRecoveries(data) {
  const rest = parseNumber(data.restHr);
  return {
    recovery45: parseNumber(data.hr45) - rest,
    recovery90: parseNumber(data.hr90) - rest,
    recovery135: parseNumber(data.hr135) - rest,
    recovery180: parseNumber(data.hr180) - rest,
    recovery225: parseNumber(data.hr225) - rest,
  };
}

function updateRecoveryValues() {
  const formData = new FormData(form);
  const values = {
    restHr: formData.get('restHr'),
    hr45: formData.get('hr45'),
    hr90: formData.get('hr90'),
    hr135: formData.get('hr135'),
    hr180: formData.get('hr180'),
    hr225: formData.get('hr225'),
  };
  const recovery = calculateRecoveries(values);

  recovery45El.textContent = Number.isNaN(recovery.recovery45) ? '-' : `${recovery.recovery45} bpm`;
  recovery90El.textContent = Number.isNaN(recovery.recovery90) ? '-' : `${recovery.recovery90} bpm`;
  recovery135El.textContent = Number.isNaN(recovery.recovery135) ? '-' : `${recovery.recovery135} bpm`;
  recovery180El.textContent = Number.isNaN(recovery.recovery180) ? '-' : `${recovery.recovery180} bpm`;
  recovery225El.textContent = Number.isNaN(recovery.recovery225) ? '-' : `${recovery.recovery225} bpm`;
}

function formatDatetime(value) {
  const date = new Date(value);
  return date.toLocaleString('zh-Hant', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderTable() {
  if (!records.length) {
    recordsTableBody.innerHTML = `<tr><td colspan="9" class="empty-state">尚無紀錄，請先新增資料。</td></tr>`;
    return;
  }

  recordsTableBody.innerHTML = records
    .slice()
    .reverse()
    .map((record) => {
      return `
      <tr>
        <td>${formatDatetime(record.recordTime)}</td>
        <td>${record.activityName}</td>
        <td>${record.restHr} bpm</td>
        <td>${record.immediateHr} bpm</td>
        <td>${record.recovery45} bpm</td>
        <td>${record.recovery90} bpm</td>
        <td>${record.recovery135} bpm</td>
        <td>${record.recovery180} bpm</td>
        <td>${record.recovery225} bpm</td>
      </tr>
    `;
    })
    .join('');
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function loadRecords() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      records = JSON.parse(saved);
    } catch (error) {
      records = [];
    }
  }
}

// 圖表功能已移除：保留資料處理與表格呈現

form.addEventListener('input', updateRecoveryValues);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(form);

  const record = {
    activityName: formData.get('activityName').trim(),
    restHr: parseNumber(formData.get('restHr')),
    immediateHr: parseNumber(formData.get('immediateHr')),
    hr45: parseNumber(formData.get('hr45')),
    hr90: parseNumber(formData.get('hr90')),
    hr135: parseNumber(formData.get('hr135')),
    hr180: parseNumber(formData.get('hr180')),
    hr225: parseNumber(formData.get('hr225')),
    recordTime: formData.get('recordTime'),
  };

  const recoveries = calculateRecoveries(record);
  record.recovery45 = recoveries.recovery45;
  record.recovery90 = recoveries.recovery90;
  record.recovery135 = recoveries.recovery135;
  record.recovery180 = recoveries.recovery180;
  record.recovery225 = recoveries.recovery225;

  records.push(record);
  saveRecords();
  renderTable();
  form.reset();
  updateRecoveryValues();
});

clearBtn.addEventListener('click', () => {
  if (!records.length) return;
  if (confirm('確定要清除所有紀錄嗎？此操作無法復原。')) {
    records = [];
    saveRecords();
    renderTable();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  loadRecords();
  renderTable();
  updateRecoveryValues();
});
