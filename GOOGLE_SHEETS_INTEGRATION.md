# 運動心率恢復紀錄系統 - Google 試算表整合指南

## 📋 概述

本指南將協助您整合 Google Sheets 與運動心率恢復紀錄系統，實現自動記錄統計資料。

**功能特色：**
- ✅ 自動將運動數據寫入 Google 試算表
- ✅ 自動計算恢復值並存儲
- ✅ 預設數據結構便於製作圖表
- ✅ 支援遠端數據同步

---

## 🚀 完整步驟

### 步驟 1：建立 Google 試算表

1. 前往 [Google Sheets](https://sheets.google.com)
2. 點擊「+ 新建」創建新試算表
3. 將試算表重命名為「**運動心率恢復紀錄**」（或自訂名稱）
4. **記錄試算表 ID**（從 URL 中複製）
   - 格式：`https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
   - 複製 `{SHEET_ID}` 部分

---

### 步驟 2：建立試算表數據結構

#### 工作表 1：原始數據（命名為 `原始數據`）

| 日期時間 | 運動名稱 | 安靜心率 | 即刻心率 | 45s心率 | 90s心率 | 135s心率 | 180s心率 | 225s心率 | 45s恢復 | 90s恢復 | 135s恢復 | 180s恢復 | 225s恢復 |
|---------|--------|--------|--------|--------|--------|---------|---------|---------|--------|--------|---------|---------|---------|
| 2024-01-15 10:30 | 間歇跑步 | 60 | 160 | 140 | 120 | 100 | 85 | 75 | 100 | 80 | 60 | 45 | 35 |

**欄位說明：**
- **A列**：日期時間（格式：YYYY-MM-DD HH:MM）
- **B列**：運動名稱
- **C列**：安靜心率（baseline）
- **D列**：運動結束即刻心率（0秒）
- **E-I列**：運動結束後 45、90、135、180、225 秒的心率
- **J-N列**：對應的恢復值（各時刻心率 - 安靜心率）

#### 工作表 2：圖表數據（命名為 `圖表數據`）

此工作表用於製作圖表，結構如下：

| 時間(秒) | 心率(bpm) | 日期 |
|---------|----------|------|
| 0 | 160 | 2024-01-15 |
| 45 | 140 | 2024-01-15 |
| 90 | 120 | 2024-01-15 |
| 135 | 100 | 2024-01-15 |
| 180 | 85 | 2024-01-15 |
| 225 | 75 | 2024-01-15 |

---

### 步驟 3：建立 Google Apps Script

1. 在 Google Sheet 中，點擊「**擴充功能**」 → 「**Apps Script**」
2. 刪除預設代碼，複製以下 Google Apps Script 代碼

#### Google Apps Script 代碼

```javascript
// 設定常數
const SHEET_ID = 'YOUR_SHEET_ID'; // 替換為您的試算表 ID
const RAW_DATA_SHEET = '原始數據';
const CHART_DATA_SHEET = '圖表數據';

/**
 * 處理來自前端的 POST 請求
 * 將運動數據寫入 Google Sheet
 */
function doPost(e) {
  try {
    // 解析前端傳送的 JSON 數據
    const data = JSON.parse(e.postData.contents);
    
    // 驗證必要欄位
    if (!validateData(data)) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: '數據驗證失敗'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 開啟試算表和工作表
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const rawSheet = ss.getSheetByName(RAW_DATA_SHEET);
    const chartSheet = ss.getSheetByName(CHART_DATA_SHEET);

    // 寫入原始數據
    writeRawData(rawSheet, data);

    // 更新圖表數據
    updateChartData(chartSheet, data);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: '數據已成功寫入'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 驗證前端傳送的數據
 */
function validateData(data) {
  const requiredFields = [
    'activityName', 'restHr', 'immediateHr',
    'hr45', 'hr90', 'hr135', 'hr180', 'hr225', 'recordTime'
  ];

  return requiredFields.every(field => field in data);
}

/**
 * 將原始數據寫入「原始數據」工作表
 */
function writeRawData(sheet, data) {
  // 計算恢復值
  const rest = parseInt(data.restHr);
  const recoveries = {
    recovery45: parseInt(data.hr45) - rest,
    recovery90: parseInt(data.hr90) - rest,
    recovery135: parseInt(data.hr135) - rest,
    recovery180: parseInt(data.hr180) - rest,
    recovery225: parseInt(data.hr225) - rest
  };

  // 準備新行數據
  const newRow = [
    data.recordTime,                    // A: 日期時間
    data.activityName,                  // B: 運動名稱
    parseInt(data.restHr),              // C: 安靜心率
    parseInt(data.immediateHr),         // D: 即刻心率
    parseInt(data.hr45),                // E: 45s心率
    parseInt(data.hr90),                // F: 90s心率
    parseInt(data.hr135),               // G: 135s心率
    parseInt(data.hr180),               // H: 180s心率
    parseInt(data.hr225),               // I: 225s心率
    recoveries.recovery45,              // J: 45s恢復
    recoveries.recovery90,              // K: 90s恢復
    recoveries.recovery135,             // L: 135s恢復
    recoveries.recovery180,             // M: 180s恢復
    recoveries.recovery225              // N: 225s恢復
  ];

  // 找到下一個空行並插入數據
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);
}

/**
 * 更新圖表數據工作表
 * 將每筆新紀錄拆分為 6 筆行列（0、45、90、135、180、225秒）
 */
function updateChartData(sheet, data) {
  const recordDate = new Date(data.recordTime).toISOString().split('T')[0]; // 取日期部分
  
  // 定義各時間點數據
  const chartDataPoints = [
    [0, parseInt(data.immediateHr), recordDate],     // 0秒：即刻心率
    [45, parseInt(data.hr45), recordDate],           // 45秒
    [90, parseInt(data.hr90), recordDate],           // 90秒
    [135, parseInt(data.hr135), recordDate],         // 135秒
    [180, parseInt(data.hr180), recordDate],         // 180秒
    [225, parseInt(data.hr225), recordDate]          // 225秒
  ];

  // 將所有數據點添加到圖表工作表
  const lastRow = sheet.getLastRow();
  chartDataPoints.forEach((point, index) => {
    sheet.getRange(lastRow + 1 + index, 1, 1, 3).setValues([point]);
  });
}

/**
 * 部署後測試使用
 */
function testDoPost() {
  const testData = {
    activityName: '間歇跑步',
    restHr: '60',
    immediateHr: '160',
    hr45: '140',
    hr90: '120',
    hr135: '100',
    hr180: '85',
    hr225: '75',
    recordTime: '2024-01-15 10:30'
  };

  const payload = JSON.stringify(testData);
  const options = {
    method: 'post',
    payload: payload,
    contentType: 'application/json'
  };

  // 替換為您的部署 URL
  const deploymentUrl = 'YOUR_DEPLOYMENT_URL';
  const response = UrlFetchApp.fetch(deploymentUrl, options);
  Logger.log(response.getContentText());
}
```

---

### 步驟 4：部署 Google Apps Script

1. 在 Apps Script 編輯器中，點擊「**部署**」按鈕
2. 選擇「**新增部署**」
3. 在「**選擇類型**」中選擇「**網路應用程式**」
4. 設定如下：
   - **Execute as**: 您的 Google 帳戶
   - **Who has access**: 「Everyone」（所有人）
5. 點擊「**部署**」
6. **複製部署 URL**（格式：`https://script.google.com/macros/d/{DEPLOYMENT_ID}/userweb`）

> **重要**：保存此 URL，您將在後續步驟中使用

---

### 步驟 5：更新試算表 ID 和部署 URL

回到 Google Apps Script 編輯器：

1. 編輯第 2-3 行的常數
2. 將 `'YOUR_SHEET_ID'` 替換為您的試算表 ID
3. 保存

---

### 步驟 6：修改前端代碼

#### 更新 `index.html`

在 HTML 的 `<head>` 部分，添加以下隱藏輸入框以儲存部署 URL：

```html
<input type="hidden" id="deploymentUrl" value="YOUR_DEPLOYMENT_URL">
```

#### 更新 `script.js`

在表單提交事件處理器中添加發送數據到 Google Sheets 的邏輯：

```javascript
// 在 script.js 中找到 form.addEventListener('submit', ...) 函數
// 在保存本地紀錄後（localStorage.setItem 後），添加以下代碼：

/**
 * 發送數據到 Google Apps Script
 */
async function sendToGoogleSheets(recordData) {
  const deploymentUrl = document.getElementById('deploymentUrl').value;
  
  if (!deploymentUrl || deploymentUrl === 'YOUR_DEPLOYMENT_URL') {
    console.warn('未設定 Google Sheets 部署 URL，跳過遠端同步');
    return;
  }

  try {
    const response = await fetch(deploymentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(recordData)
    });

    const result = await response.json();
    
    if (result.status === 'success') {
      console.log('✓ 數據已成功同步至 Google Sheets');
      // 可選：顯示成功提示給用戶
      showNotification('數據已上傳至 Google Sheets', 'success');
    } else {
      console.error('Google Sheets 同步失敗:', result.message);
      showNotification('Google Sheets 同步失敗', 'error');
    }
  } catch (error) {
    console.error('發送到 Google Sheets 時出錯:', error);
    showNotification('網絡錯誤，無法同步至 Google Sheets', 'error');
  }
}

/**
 * 顯示用戶通知（可選）
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

// 在表單提交處理中調用
form.addEventListener('submit', function(event) {
  event.preventDefault();

  const formData = new FormData(form);
  const record = {
    activityName: formData.get('activityName'),
    restHr: formData.get('restHr'),
    immediateHr: formData.get('immediateHr'),
    hr45: formData.get('hr45'),
    hr90: formData.get('hr90'),
    hr135: formData.get('hr135'),
    hr180: formData.get('hr180'),
    hr225: formData.get('hr225'),
    recordTime: formData.get('recordTime')
  };

  // 保存至本地存儲（既有邏輯）
  records.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));

  // 發送至 Google Sheets（新增邏輯）
  sendToGoogleSheets(record);

  // 更新 UI...（既有邏輯）
});
```

---

### 步驟 7：配置部署 URL

在 `index.html` 中更新部署 URL：

```html
<input type="hidden" id="deploymentUrl" value="https://script.google.com/macros/d/{YOUR_DEPLOYMENT_ID}/userweb">
```

將 `{YOUR_DEPLOYMENT_ID}` 替換為步驟 4 中複製的部署 URL 中的 ID 部分。

---

### 步驟 8：使用和測試

1. **本地測試**
   - 在網頁中輸入測試數據
   - 點擊「儲存紀錄」按鈕
   - 檢查瀏覽器控制台（F12 → Console）的日誌
   - 檢查 Google Sheet 是否收到數據

2. **驗證數據**
   - 前往 Google Sheet 的「原始數據」工作表
   - 確認新行已添加
   - 檢查「圖表數據」工作表中的圖表數據

3. **建立圖表**
   - 在「圖表數據」工作表中選擇「時間(秒)」和「心率(bpm)」欄位
   - 插入→圖表
   - 選擇「折線圖」或「散點圖」
   - 自訂圖表標題和軸標籤

---

## 📊 Google Sheets 中建立圖表的步驟

### 方法 1：使用圖表數據工作表

1. 打開「圖表數據」工作表
2. 選擇 A:C 欄（時間、心率、日期）
3. 點擊「插入」→「圖表」
4. 在圖表編輯器中：
   - 選擇「折線圖」或「散點圖」
   - 設定 X 軸為「時間(秒)」
   - 設定 Y 軸為「心率(bpm)」
   - 添加圖表標題：「運動心率恢復曲線」

### 方法 2：使用樞紐分析表（進階）

1. 在「原始數據」工作表中，選擇所有數據
2. 點擊「插入」→「樞紐分析表」
3. 設定：
   - 行：日期時間
   - 列：運動名稱
   - 值：各時刻心率
4. 建立對應圖表

---

## 🔧 故障排除

### 問題 1：數據未寫入 Google Sheets

**解決方案：**
1. 檢查部署 URL 是否正確
2. 查看瀏覽器控制台（F12）的錯誤信息
3. 確認 Google Apps Script 部署正確（Everyone 權限）
4. 檢查試算表 ID 是否正確

### 問題 2：部署 URL 返回 404 或 403 錯誤

**解決方案：**
1. 重新部署 Google Apps Script
2. 確保已授予「Everyone」訪問權限
3. 等待部署完成（可能需要 1-2 分鐘）

### 問題 3：Google Sheet 中出現 #REF! 或公式錯誤

**解決方案：**
1. 檢查工作表名稱是否與代碼中的名稱匹配
2. 確認欄標題行已正確設置
3. 檢查數據類型是否符合預期

### 問題 4：CORS 錯誤

**解決方案：**
- Google Apps Script 部署的網頁應用程式支援 CORS
- 確保使用正確的 `Content-Type: application/json`

---

## 🔐 安全建議

1. **共享試算表時限制訪問**
   - 使用「查看權限」而非「編輯權限」
   - 考慮設定過期日期

2. **驗證數據**
   - Google Apps Script 中已包含基本驗證
   - 可增加額外的數據範圍檢查

3. **保護部署 URL**
   - 不要在公開 GitHub 倉庫中暴露實際 URL
   - 考慮使用環境變數

---

## 📝 後續改進

- [ ] 添加數據導出功能（CSV/Excel）
- [ ] 建立自動統計儀表板
- [ ] 實現多用戶支援
- [ ] 添加數據刪除功能
- [ ] 建立即時同步（WebSocket）
- [ ] 實現數據備份和恢復

---

## 📞 常見問題 (FAQ)

**Q1：如何更新現有紀錄？**  
A1：當前系統設計為追加新紀錄。若需更新，可手動在 Google Sheet 中編輯。

**Q2：如何處理離線情況？**  
A2：系統會先保存至本地存儲，當網路連接恢復時需手動同步。

**Q3：試算表中的數據會自動刪除嗎？**  
A3：不會。使用「清除全部紀錄」按鈕只會清除本地存儲，Google Sheet 數據保留供查詢。

---

**祝您使用愉快！** 🎉
