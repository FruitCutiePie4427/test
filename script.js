const form = document.getElementById("recordForm");
const recordBody = document.getElementById("recordBody");
const recordCount = document.getElementById("recordCount");
const clearAllButton = document.getElementById("clearAll");
const recovery45El = document.getElementById("recovery45");
const recovery90El = document.getElementById("recovery90");
const recovery135El = document.getElementById("recovery135");
const recovery180El = document.getElementById("recovery180");
const recovery225El = document.getElementById("recovery225");
const ctx = document.getElementById("trendChart").getContext("2d");

let records = [];
let chart;

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calculateRecovery(record) {
  return {
    recovery45: record.hr0 - record.hr45,
    recovery90: record.hr0 - record.hr90,
    recovery135: record.hr0 - record.hr135,
    recovery180: record.hr0 - record.hr180,
    recovery225: record.hr0 - record.hr225,
  };
}

function updateSummary(recovery) {
  recovery45El.textContent = recovery.recovery45;
  recovery90El.textContent = recovery.recovery90;
  recovery135El.textContent = recovery.recovery135;
  recovery180El.textContent = recovery.recovery180;
  recovery225El.textContent = recovery.recovery225;
}

function renderRecords() {
  recordBody.innerHTML = "";
  records.slice().reverse().forEach((record) => {
    const recovery = calculateRecovery(record);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDateTime(record.time)}</td>
      <td>${record.name}</td>
      <td>${record.hr0}</td>
      <td>${record.hr45}</td>
      <td>${record.hr90}</td>
      <td>${record.hr135}</td>
      <td>${record.hr180}</td>
      <td>${record.hr225}</td>
      <td>${recovery.recovery45} / ${recovery.recovery90} / ${recovery.recovery135} / ${recovery.recovery180} / ${recovery.recovery225}</td>
    `;
    recordBody.appendChild(row);
  });
  recordCount.textContent = records.length;
}

function getChartLabels() {
  return records.map((record) => `${formatDateTime(record.time)} ${record.name}`);
}

function getChartDatasets() {
  return [
    {
      label: "45秒恢復值",
      data: records.map((record) => record.hr0 - record.hr45),
      borderColor: "#39d98a",
      backgroundColor: "rgba(57, 217, 138, 0.24)",
      tension: 0.32,
      fill: true,
      pointRadius: 5,
      pointHoverRadius: 7,
    },
    {
      label: "90秒恢復值",
      data: records.map((record) => record.hr0 - record.hr90),
      borderColor: "#2aa8ff",
      backgroundColor: "rgba(42, 168, 255, 0.16)",
      tension: 0.32,
      fill: true,
      pointRadius: 5,
      pointHoverRadius: 7,
    },
    {
      label: "135秒恢復值",
      data: records.map((record) => record.hr0 - record.hr135),
      borderColor: "#9f6cff",
      backgroundColor: "rgba(159, 108, 255, 0.16)",
      tension: 0.32,
      fill: true,
      pointRadius: 5,
      pointHoverRadius: 7,
    },
    {
      label: "180秒恢復值",
      data: records.map((record) => record.hr0 - record.hr180),
      borderColor: "#ffd166",
      backgroundColor: "rgba(255, 209, 102, 0.16)",
      tension: 0.32,
      fill: true,
      pointRadius: 5,
      pointHoverRadius: 7,
    },
    {
      label: "225秒恢復值",
      data: records.map((record) => record.hr0 - record.hr225),
      borderColor: "#ff6b6b",
      backgroundColor: "rgba(255, 107, 107, 0.16)",
      tension: 0.32,
      fill: true,
      pointRadius: 5,
      pointHoverRadius: 7,
    },
  ];
}

function renderChart() {
  if (!chart) {
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: getChartLabels(),
        datasets: getChartDatasets(),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            labels: {
              color: "#eaf4ff",
              boxWidth: 14,
            },
          },
          tooltip: {
            backgroundColor: "rgba(17, 28, 46, 0.95)",
            titleColor: "#ffffff",
            bodyColor: "#eaf4ff",
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#a5b8db",
              maxRotation: 45,
              minRotation: 0,
            },
            grid: {
              color: "rgba(255,255,255,0.06)",
            },
          },
          y: {
            ticks: {
              color: "#a5b8db",
            },
            grid: {
              color: "rgba(255,255,255,0.08)",
            },
          },
        },
      },
    });
  } else {
    chart.data.labels = getChartLabels();
    chart.data.datasets = getChartDatasets();
    chart.update();
  }
}

function saveToLocalStorage() {
  localStorage.setItem("hrRecoveryRecords", JSON.stringify(records));
}

function loadFromLocalStorage() {
  const stored = localStorage.getItem("hrRecoveryRecords");
  if (!stored) {
    return;
  }
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      records = parsed;
    }
  } catch (error) {
    console.warn("載入資料失敗", error);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const newRecord = {
    name: document.getElementById("exerciseName").value.trim(),
    hr0: Number(document.getElementById("hr0").value),
    hr45: Number(document.getElementById("hr45").value),
    hr90: Number(document.getElementById("hr90").value),
    hr135: Number(document.getElementById("hr135").value),
    hr180: Number(document.getElementById("hr180").value),
    hr225: Number(document.getElementById("hr225").value),
    time: document.getElementById("recordTime").value,
  };

  records.push(newRecord);
  saveToLocalStorage();
  renderRecords();
  renderChart();
  updateSummary(calculateRecovery(newRecord));
  form.reset();
});

clearAllButton.addEventListener("click", () => {
  if (!confirm("是否確認清除所有紀錄？此動作無法復原。")) {
    return;
  }
  records = [];
  saveToLocalStorage();
  renderRecords();
  renderChart();
  updateSummary({ recovery45: 0, recovery90: 0, recovery135: 0, recovery180: 0, recovery225: 0 });
});

window.addEventListener("load", () => {
  loadFromLocalStorage();
  renderRecords();
  renderChart();
  if (records.length > 0) {
    const lastRecord = records[records.length - 1];
    updateSummary(calculateRecovery(lastRecord));
  }
});
