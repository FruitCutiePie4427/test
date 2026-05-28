# Google 試算表整合指南

本文檔詳細說明如何將運動心率恢復紀錄系統與 Google 試算表整合，並使用 Google Apps Script 自動寫入數據。

---

## 📋 目錄
1. [第一步：建立 Google 試算表](#第一步建立-google-試算表)
2. [第二步：設定 Google Apps Script](#第二步設定-google-apps-script)
3. [第三步：修改網頁程式](#第三步修改網頁程式)
4. [第四步：測試和驗證](#第四步測試和驗證)
5. [數據格式參考](#數據格式參考)

---

## 第一步：建立 Google 試算表

### 1.1 建立新試算表
- 前往 [Google 試算表](https://sheets.google.com)
- 點擊「+」建立新試算表
- 重新命名為「運動心率恢復紀錄」

### 1.2 建立工作表結構

在試算表中建立以下工作表（Sheet）：

#### **Sheet1: 原始數據（Raw Data）**
存儲所有原始記錄，結構如下：

```
| 序號 | 日期時間 | 運動名稱 | 安靜心率 | 即時心率 | 45s心率 | 90s心率 | 135s心率 | 180s心率 | 225s心率 | 45s恢復 | 90s恢復 | 135s恢復 | 180s恢復 | 225s恢復 |
|------|---------|---------|---------|---------|---------|---------|---------|---------|---------|---------|---------|---------|---------|---------|
| 1    | 時間   | 名稱    | 值(bpm) | 值(bpm) | 值(bpm) | 值(bpm) | 值(bpm) | 值(bpm) | 值(bpm) | 值(bpm) | 值(bpm) | 值(bpm) | 值(bpm) | 值(bpm) |
```

**表頭範例（在第1行）：**
```
A1: 序號
B1: 日期時間
C1: 運動名稱
D1: 安靜心率(bpm)
E1: 即時心率(bpm)
F1: 45s心率(bpm)
G1: 90s心率(bpm)
H1: 135s心率(bpm)
I1: 180s心率(bpm)
J1: 225s心率(bpm)
K1: 45s恢復(bpm)
L1: 90s恢復(bpm)
M1: 135s恢復(bpm)
N1: 180s恢復(bpm)
O1: 225s恢復(bpm)
```

#### **Sheet2: 圖表數據（Chart Data）**
為製作圖表而準備的數據，結構如下：

```
時間軸(秒) | 序號1 | 序號2 | 序號3 | ...
-----------|-------|-------|-------|-----
0          | (即時心率) | (即時心率) | (即時心率) |
45         | (45s心率) | (45s心率) | (45s心率) |
90         | (90s心率) | (90s心率) | (90s心率) |
135        | (135s心率) | (135s心率) | (135s心率) |
180        | (180s心率) | (180s心率) | (180s心率) |
225        | (225s心率) | (225s心率) | (225s心率) |
```

**表頭範例（在第1行）：**
```
A1: 時間(秒)
B1: 序號1
C1: 序號2
D1: 序號3
...以此類推
```

### 1.3 設定試算表權限
- 點擊右上角「分享」按鈕
- 取得共享連結，複製試算表 ID（URL 中的一長串字母）
  - 試算表 URL 格式：`https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
  - 保存 `SPREADSHEET_ID`，稍後需要使用

---

## 第二步：設定 Google Apps Script

### 2.1 開啟 Google Apps Script 編輯器
- 在 Google 試算表中，點擊「擴充功能」→ 「Apps Script」
- 會開啟一個新的 Apps Script 項目

### 2.2 複製以下 Apps Script 程式碼

**重要：將 `YOUR_SPREADSHEET_ID` 替換為你的實際試算表 ID**

```javascript
// 配置
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // 替換為你的試算表 ID
const RAW_DATA_SHEET = '原始數據'; // 原始數據工作表名稱
const CHART_DATA_SHEET = '圖表數據'; // 圖表數據工作表名稱

/**
 * 接收來自網頁的運動心率數據
 * @param {Object} data - 包含運動記錄的對象
 * @returns {Object} 操作結果
 */
function doPost(e) {
  try {
    // 解析來自網頁的數據
    const payload = JSON.parse(e.postData.contents);
    
    // 驗證必需的欄位
    if (!payload.records || !Array.isArray(payload.records)) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: '無效的數據格式'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 寫入原始數據
    const result = appendRawData(payload.records);
    
    // 更新圖表數據
    updateChartData();

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: `成功寫入 ${result.count} 條記錄`,
      recordIds: result.ids
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: '伺服器錯誤: ' + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 添加原始數據到試算表
 */
function appendRawData(records) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(RAW_DATA_SHEET);
  const lastRow = sheet.getLastRow();
  const startRowForData = lastRow === 0 ? 2 : lastRow + 1; // 跳過表頭
  
  let recordIds = [];
  
  records.forEach((record, index) => {
    const rowNum = startRowForData + index;
    const sequenceNum = lastRow === 0 ? index + 1 : (lastRow - 1) + index + 1; // 序號從1開始
    
    const row = [
      sequenceNum, // A: 序號
      record.recordTime, // B: 日期時間
      record.activityName, // C: 運動名稱
      record.restHr, // D: 安靜心率
      record.immediateHr, // E: 即時心率
      record.hr45, // F: 45s心率
      record.hr90, // G: 90s心率
      record.hr135, // H: 135s心率
      record.hr180, // I: 180s心率
      record.hr225, // J: 225s心率
      record.recovery45, // K: 45s恢復
      record.recovery90, // L: 90s恢復
      record.recovery135, // M: 135s恢復
      record.recovery180, // N: 180s恢復
      record.recovery225 // O: 225s恢復
    ];
    
    sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
    recordIds.push(sequenceNum);
  });
  
  return { count: records.length, ids: recordIds };
}

/**
 * 更新圖表數據工作表
 * 將原始數據轉換為圖表所需的格式
 */
function updateChartData() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const rawSheet = spreadsheet.getSheetByName(RAW_DATA_SHEET);
  const chartSheet = spreadsheet.getSheetByName(CHART_DATA_SHEET);
  
  // 清空現有的圖表數據（保留表頭）
  const lastRow = chartSheet.getLastRow();
  if (lastRow > 1) {
    chartSheet.deleteRows(2, lastRow - 1);
  }
  
  // 獲取原始數據
  const rawData = rawSheet.getDataRange().getValues();
  if (rawData.length <= 1) return; // 只有表頭，沒有數據
  
  // 準備時間軸行
  const timePoints = [0, 45, 90, 135, 180, 225]; // 秒數
  const chartData = [];
  
  // 第一行為表頭：時間(秒) | 序號1 | 序號2 | ...
  const headers = ['時間(秒)'];
  for (let i = 2; i < rawData.length; i++) {
    const sequenceNum = rawData[i][0]; // 序號在 A 欄
    headers.push(`序號${sequenceNum}`);
  }
  chartData.push(headers);
  
  // 準備各時間點的數據
  timePoints.forEach((time, timeIndex) => {
    const row = [time]; // 第一欄為時間
    
    for (let i = 2; i < rawData.length; i++) {
      // 根據時間點選擇對應的心率數據
      // 0秒: immediateHr (E欄, 索引4)
      // 45秒: hr45 (F欄, 索引5)
      // 90秒: hr90 (G欄, 索引6)
      // 135秒: hr135 (H欄, 索引7)
      // 180秒: hr180 (I欄, 索引8)
      // 225秒: hr225 (J欄, 索引9)
      
      const hrColumnIndex = 4 + timeIndex;
      const heartRate = rawData[i][hrColumnIndex] || '';
      row.push(heartRate);
    }
    chartData.push(row);
  });
  
  // 寫入圖表數據工作表
  if (chartData.length > 1) {
    chartSheet.getRange(1, 1, chartData.length, chartData[0].length).setValues(chartData);
  }
}

/**
 * 刪除原始數據中的最後一條記錄
 * （如果網頁側需要同步刪除功能）
 */
function deleteLastRecord() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(RAW_DATA_SHEET);
  const lastRow = sheet.getLastRow();
  
  if (lastRow > 1) {
    sheet.deleteRow(lastRow);
    updateChartData();
    return true;
  }
  return false;
}

/**
 * 獲取試算表中的所有記錄
 * （用於網頁側同步或驗證）
 */
function getAllRecords() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(RAW_DATA_SHEET);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  const records = [];
  for (let i = 1; i < data.length; i++) {
    records.push({
      sequenceNum: data[i][0],
      recordTime: data[i][1],
      activityName: data[i][2],
      restHr: data[i][3],
      immediateHr: data[i][4],
      hr45: data[i][5],
      hr90: data[i][6],
      hr135: data[i][7],
      hr180: data[i][8],
      hr225: data[i][9],
      recovery45: data[i][10],
      recovery90: data[i][11],
      recovery135: data[i][12],
      recovery180: data[i][13],
      recovery225: data[i][14]
    });
  }
  
  return records;
}
```

### 2.3 部署 Google Apps Script

1. **設定指令碼屬性**
   - 在 Apps Script 編輯器中，更新 `SPREADSHEET_ID` 變數為你的試算表 ID

2. **部署為 Web 應用程式**
   - 點擊「部署」→「新的部署」
   - 選擇類型：「Web 應用程式」
   - 執行身份：選擇你的 Google 帳戶
   - 存取權限：「任何人」（允許你的網頁調用）
   - 點擊「部署」
   - 複製生成的 Web 應用程式 URL，格式為：
     ```
     https://script.google.com/macros/d/{SCRIPT_ID}/usercontent
     ```

3. **保存部署 URL**
   - 複製 Web 應用程式 URL，稍後在網頁中使用

---

## 第三步：修改網頁程式

### 3.1 建立 Google Sheets API 整合文件

在項目根目錄建立 `google-sheets-integration.js` 文件：

```javascript
/**
 * Google Sheets 整合模組
 * 負責將數據發送到 Google Apps Script
 */

// 配置：替換為你的 Google Apps Script Web 應用程式 URL
const GOOGLE_APPS_SCRIPT_URL = 'YOUR_WEB_APP_URL';

/**
 * 將記錄發送到 Google 試算表
 * @param {Array} records - 要發送的記錄陣列
 * @returns {Promise} 操作結果
 */
async function sendRecordsToGoogleSheets(records) {
  if (!GOOGLE_APPS_SCRIPT_URL || GOOGLE_APPS_SCRIPT_URL === 'YOUR_WEB_APP_URL') {
    console.warn('Google Apps Script URL 未設定，跳過上傳');
    return { success: false, message: 'Google Apps Script URL 未設定' };
  }

  try {
    const payload = {
      records: records
    };

    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // CORS 模式
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // 由於使用 no-cors 模式，無法直接讀取回應
    console.log('數據已發送到 Google Sheets');
    return { success: true, message: '數據已發送到 Google Sheets' };
  } catch (error) {
    console.error('發送到 Google Sheets 失敗:', error);
    return { success: false, message: '發送失敗: ' + error.message };
  }
}

/**
 * 發送單筆新增的記錄到 Google 試算表
 * @param {Object} record - 新增的記錄對象
 */
async function sendSingleRecordToGoogleSheets(record) {
  return sendRecordsToGoogleSheets([record]);
}

/**
 * 發送所有記錄到 Google 試算表
 * @param {Array} allRecords - 所有記錄
 */
async function syncAllRecordsToGoogleSheets(allRecords) {
  return sendRecordsToGoogleSheets(allRecords);
}
```

### 3.2 修改 script.js

在 `script.js` 中的表單提交事件處理器，添加調用 Google Sheets 的代碼：

**找到這段代碼（約在第 140 行左右）：**
```javascript
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
```

**替換為：**
```javascript
form.addEventListener('submit', async (event) => {
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
  const result = await sendSingleRecordToGoogleSheets(record);
  if (result.success) {
    console.log('記錄已同步到 Google Sheets');
  } else {
    console.warn('Google Sheets 同步失敗:', result.message);
  }
});
```

### 3.3 更新 HTML 文件

在 `index.html` 的 `<script>` 標籤中，在 `script.js` 之前引入新的模組：

**找到這段代碼：**
```html
  <script src="script.js"></script>
</body>
</html>
```

**替換為：**
```html
  <script src="google-sheets-integration.js"></script>
  <script src="script.js"></script>
</body>
</html>
```

### 3.4 設定 Google Apps Script URL

在 `google-sheets-integration.js` 中，將 `YOUR_WEB_APP_URL` 替換為你在第 2.3 步中獲得的 Web 應用程式 URL：

```javascript
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercontent';
```

---

## 第四步：測試和驗證

### 4.1 本地測試
1. 在瀏覽器中打開你的網頁
2. 填寫運動心率表單並提交
3. 打開瀏覽器的開發者工具（F12），檢查控制台是否有日誌輸出
4. 檢查是否看到「記錄已同步到 Google Sheets」

### 4.2 驗證 Google 試算表
1. 打開你的 Google 試算表
2. 查看「原始數據」工作表，確認新記錄已添加
3. 查看「圖表數據」工作表，確認數據已正確轉換為圖表格式

### 4.3 故障排除

**如果數據沒有出現在試算表中：**

1. **檢查 Google Apps Script 日誌**
   - 在 Apps Script 編輯器中，點擊「執行紀錄」查看錯誤信息
   
2. **驗證 URL 配置**
   - 確認 `GOOGLE_APPS_SCRIPT_URL` 完全正確
   - 確認試算表 ID 正確
   
3. **檢查工作表名稱**
   - 確保工作表名稱與 Apps Script 中的定義相同
   
4. **CORS 問題**
   - 如使用 `no-cors` 模式仍有問題，可考慮改用 JSONP 或其他替代方案

---

## 📊 數據格式參考

### 原始記錄格式（網頁端）
```javascript
{
  activityName: "間歇跑步",
  restHr: 65,
  immediateHr: 180,
  hr45: 150,
  hr90: 130,
  hr135: 110,
  hr180: 95,
  hr225: 85,
  recordTime: "2024-05-28T14:30",
  recovery45: 85,    // immediateHr - restHr
  recovery90: 65,
  recovery135: 45,
  recovery180: 30,
  recovery225: 20
}
```

### Google 試算表 - 原始數據格式
| 序號 | 日期時間 | 運動名稱 | 安靜心率 | 即時心率 | 45s心率 | 90s心率 | 135s心率 | 180s心率 | 225s心率 | 45s恢復 | 90s恢復 | 135s恢復 | 180s恢復 | 225s恢復 |
|------|---------|---------|---------|---------|---------|---------|---------|---------|---------|---------|---------|---------|---------|---------|
| 1 | 2024-05-28 14:30 | 間歇跑步 | 65 | 180 | 150 | 130 | 110 | 95 | 85 | 85 | 65 | 45 | 30 | 20 |
| 2 | 2024-05-29 15:00 | 快走 | 68 | 160 | 140 | 120 | 100 | 90 | 82 | 72 | 52 | 32 | 22 | 14 |

### Google 試算表 - 圖表數據格式
| 時間(秒) | 序號1 | 序號2 | 序號3 |
|---------|-------|-------|-------|
| 0 | 180 | 160 | 175 |
| 45 | 150 | 140 | 145 |
| 90 | 130 | 120 | 128 |
| 135 | 110 | 100 | 110 |
| 180 | 95 | 90 | 98 |
| 225 | 85 | 82 | 88 |

---

## 🎯 使用 Google Sheets 製作圖表

1. **在「圖表數據」工作表中選擇數據**
   - 選擇整個數據範圍（含表頭）

2. **插入圖表**
   - 點擊「插入」→「圖表」
   - 選擇「折線圖」或「曲線圖」

3. **配置圖表**
   - X 軸：「時間(秒)」
   - Y 軸：各序號的心率值
   - 標題：「運動心率恢復曲線」

4. **分析趨勢**
   - 比較不同運動或不同時間的心率恢復情況
   - 觀察恢復速度是否改善

---

## 🔐 安全性考慮

- 確保 Google 試算表的共享設置適當
- 不在代碼中硬編碼敏感信息
- 定期備份試算表數據
- 考慮使用 Google Form 作為額外的數據驗證層

---

## 🔄 進階功能（可選）

### 同步所有本地記錄到 Google Sheets
可添加一個按鈕，將本地儲存的所有記錄一次性上傳：

```javascript
async function syncAllRecords() {
  const result = await syncAllRecordsToGoogleSheets(records);
  alert(result.message);
}
```

### 定期自動同步
設置定時任務，每隔一段時間自動同步數據：

```javascript
setInterval(() => {
  if (records.length > 0) {
    syncAllRecordsToGoogleSheets(records);
  }
}, 5 * 60 * 1000); // 每 5 分鐘
```

---

## 📞 常見問題

**Q: 如何更新已存在的記錄？**
A: 目前設計為追加模式。若需要編輯，可在 Google Sheet 中直接修改，或在 Apps Script 中添加更新邏輯。

**Q: 可以刪除 Google Sheet 中的數據嗎？**
A: 可以。在 Google Sheet 中直接刪除行，或透過 Apps Script 添加刪除函數。

**Q: 有數據大小限制嗎？**
A: Google 試算表可存儲最多 1000 萬個儲存格。對於一般使用而言足夠。

**Q: 如何保持網頁和 Google Sheet 同步？**
A: 每次新增記錄時自動上傳（如上述實現），或定期同步所有數據。

---

## 更新日期
- 2024-05-28：初版文檔

---

**備註：** 所有 URL 和 ID 應根據實際情況替換。請妥善保管試算表 ID 和 Apps Script URL。
