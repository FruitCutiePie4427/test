const form = document.getElementById('recordForm');
const recovery45El = document.getElementById('recovery45');
const recovery90El = document.getElementById('recovery90');
const recovery135El = document.getElementById('recovery135');
const recovery180El = document.getElementById('recovery180');
const recovery225El = document.getElementById('recovery225');
const recordsTableBody = document.getElementById('recordsTableBody');
const clearBtn = document.getElementById('clearBtn');
const statsSummary = document.getElementById('statsSummary');
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
    recordsTableBody.innerHTML = `<tr><td colspan="15" class="empty-state">尚無紀錄，請先新增資料。</td></tr>`;
    renderStats();
    return;
  }

  recordsTableBody.innerHTML = records
    .slice()
    .reverse()
    .map((record, index) => {
      const sequenceNum = records.length - index; // 由舊至新編號
      const groupClass = index % 2 === 0 ? 'group-even' : 'group-odd';
      return `
      <tr class="record-row ${groupClass}">
        <td class="nowrap-col">${sequenceNum}</td>
        <td class="nowrap-col">${formatDatetime(record.recordTime)}</td>
        <td class="nowrap-col">${record.activityName}</td>
        <td class="nowrap-col">${record.restHr} bpm</td>
        <td class="nowrap-col">${record.immediateHr} bpm</td>
        <td>${record.hr45} bpm</td>
        <td>${record.hr90} bpm</td>
        <td>${record.hr135} bpm</td>
        <td>${record.hr180} bpm</td>
        <td>${record.hr225} bpm</td>
        <td colspan="5" class="empty-cell"></td>
      </tr>
      <tr class="recovery-row ${groupClass}">
        <td colspan="10" class="subrow-label">心率恢復值</td>
        <td>${record.recovery45} bpm</td>
        <td>${record.recovery90} bpm</td>
        <td>${record.recovery135} bpm</td>
        <td>${record.recovery180} bpm</td>
        <td>${record.recovery225} bpm</td>
      </tr>
    `;
    })
    .join('');
  renderStats();
}

function avg(values) {
  if (!values.length) return 0;
  const sum = values.reduce((s, v) => s + Number(v || 0), 0);
  return Math.round((sum / values.length) * 10) / 10;
}

function renderStats() {
  if (!statsSummary) return;
  if (!records.length) {
    statsSummary.innerHTML = `<div class="stat-item"><p>紀錄數量</p><strong>0</strong></div>`;
    return;
  }

  const total = records.length;
  const avgImmediate = avg(records.map((r) => r.immediateHr));
  const avgRecovery45 = avg(records.map((r) => r.recovery45));
  const latest = records[records.length - 1];

  statsSummary.innerHTML = `
    <div class="stat-item"><p>紀錄數量</p><strong>${total}</strong></div>
    <div class="stat-item"><p>平均即時心率</p><strong>${avgImmediate} bpm</strong></div>
    <div class="stat-item"><p>平均45s 恢復</p><strong>${avgRecovery45} bpm</strong></div>
    <div class="stat-item"><p>最新紀錄</p><strong>${formatDatetime(latest.recordTime)}</strong></div>
  `;
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
  
  // 發送數據到 Google Sheets
  sendToGoogleSheets(record);
});

clearBtn.addEventListener('click', () => {
  if (!records.length) return;
  if (confirm('確定要清除所有紀錄嗎？此操作無法復原。')) {
    records = [];
    saveRecords();
    renderTable();
  }
});

/**
 * 發送數據到 Google Apps Script
 */
async function sendToGoogleSheets(recordData) {
  const deploymentEl = document.getElementById('deploymentUrl');
  const deploymentUrl = deploymentEl ? deploymentEl.value : '';

  if (!deploymentUrl || deploymentUrl === 'YOUR_DEPLOYMENT_URL') {
    console.warn('未設定 Google Sheets 部署 URL，跳過遠端同步');
    return;
  }

  try {
    const response = await fetch(deploymentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recordData)
    });

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (err) {
      result = { status: response.ok ? 'success' : 'error', message: text };
    }

    if (response.ok && result.status === 'success') {
      console.log('✓ 數據已成功同步至 Google Sheets');
      showNotification('數據已上傳至 Google Sheets', 'success');
    } else {
      console.error('Google Sheets 同步失敗:', result && result.message ? result.message : text);
      showNotification('Google Sheets 同步失敗', 'error');
    }
  } catch (error) {
    console.error('發送到 Google Sheets 時出錯:', error);
    showNotification('網絡錯誤，無法同步至 Google Sheets', 'error');
  }
}

/**
 * 顯示用戶通知
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 20px;
    background: ${type === 'success' ? '#2de2a9' : '#ff6b6b'};
    color: ${type === 'success' ? '#0b1320' : '#fff'};
    border-radius: 8px;
    font-weight: 600;
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 3000);
}

window.addEventListener('DOMContentLoaded', () => {
  loadRecords();
  renderTable();
  updateRecoveryValues();
});
