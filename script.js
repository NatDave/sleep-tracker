/***************************************************
 * script.js
 *
 * Multi-user Sleep Tracker with:
 * - Add/Edit/Delete entries (Local Storage)
 * - Daily chart + 7-day rolling average (Chart.js)
 * - Only an Overall Daily Average displayed below chart
 * - Separate weekly/monthly tables listing each week's or month's avg
 **************************************************/

// =============================
//        GLOBAL STATE
// =============================
let sleepEntriesByUser = JSON.parse(localStorage.getItem("sleepEntriesByUser")) || {};
let currentUser = null;    // Set after login
let editingEntryId = null; // Track which entry is being edited
let chartInstance = null;

// We'll create a reference to a container for summary stats
let statsContainer = null;

// =============================
//       DOM ELEMENTS
// =============================
const loginFormDiv   = document.getElementById("loginForm");
const appSectionDiv  = document.getElementById("appSection");
const welcomeMsg     = document.getElementById("welcomeMsg");
const loginBtn       = document.getElementById("loginBtn");
const usernameInput  = document.getElementById("usernameInput");

const addForm        = document.getElementById("addForm");
const editSection    = document.getElementById("editSection");
const editForm       = document.getElementById("editForm");
const sleepTableBody = document.querySelector("#sleepTable tbody");

// Weekly/Monthly tables (from index.html)
const weeklyTbody    = document.querySelector("#weeklyTable tbody");
const monthlyTbody   = document.querySelector("#monthlyTable tbody");

// =============================
//        LOGIN LOGIC
// =============================
loginBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  if (!username) {
    alert("Please enter a username.");
    return;
  }

  currentUser = username;

  if (!sleepEntriesByUser[currentUser]) {
    sleepEntriesByUser[currentUser] = [];
  }

  saveAllUsersData();

  // Hide login form, show main app
  loginFormDiv.classList.add("hidden");
  appSectionDiv.classList.remove("hidden");
  welcomeMsg.textContent = `Welcome, ${currentUser}!`;

  renderTable();
});

// =============================
//     ADD ENTRY LOGIC
// =============================
addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentUser) {
    alert("Please log in first.");
    return;
  }

  const startDate = document.getElementById("startDate").value;
  const startTime = document.getElementById("startTime").value;
  const endDate   = document.getElementById("endDate").value;
  const endTime   = document.getElementById("endTime").value;
  const comments  = document.getElementById("comments").value;

  let durationHours = calculateDuration(startDate, startTime, endDate, endTime);

  const newEntry = {
    id: Date.now(),
    startDate,
    startTime,
    endDate,
    endTime,
    duration: durationHours,
    comments
  };

  sleepEntriesByUser[currentUser].push(newEntry);
  saveAllUsersData();

  addForm.reset();
  renderTable();
});

// =============================
//     EDIT ENTRY LOGIC
// =============================
function editEntry(id) {
  const entry = sleepEntriesByUser[currentUser].find(e => e.id === id);
  if (!entry) return;

  editingEntryId = id;
  document.getElementById("editStartDate").value = entry.startDate;
  document.getElementById("editStartTime").value = entry.startTime;
  document.getElementById("editEndDate").value   = entry.endDate;
  document.getElementById("editEndTime").value   = entry.endTime;
  document.getElementById("editComments").value  = entry.comments;

  editSection.style.display = "block";
}

editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!currentUser || editingEntryId == null) return;

  const startDate = document.getElementById("editStartDate").value;
  const startTime = document.getElementById("editStartTime").value;
  const endDate   = document.getElementById("editEndDate").value;
  const endTime   = document.getElementById("editEndTime").value;
  const comments  = document.getElementById("editComments").value;

  let durationHours = calculateDuration(startDate, startTime, endDate, endTime);

  const arr = sleepEntriesByUser[currentUser];
  const idx = arr.findIndex(e => e.id === editingEntryId);
  if (idx > -1) {
    arr[idx].startDate = startDate;
    arr[idx].startTime = startTime;
    arr[idx].endDate   = endDate;
    arr[idx].endTime   = endTime;
    arr[idx].comments  = comments;
    arr[idx].duration  = durationHours;
  }

  saveAllUsersData();

  editSection.style.display = "none";
  editingEntryId = null;

  renderTable();
});

function cancelEdit() {
  editSection.style.display = "none";
  editingEntryId = null;
}

// =============================
//    DELETE ENTRY LOGIC
// =============================
function deleteEntry(id) {
  const arr = sleepEntriesByUser[currentUser];
  sleepEntriesByUser[currentUser] = arr.filter(e => e.id !== id);
  saveAllUsersData();
  renderTable();
}

// =============================
//   RENDER TABLE & CHART
// =============================
function renderTable() {
  if (!currentUser) return;
  sleepTableBody.innerHTML = "";

  // Sort by start date/time ascending
  const entries = sleepEntriesByUser[currentUser];
  entries.sort((a, b) => {
    const aDate = new Date(`${a.startDate}T${a.startTime}`);
    const bDate = new Date(`${b.startDate}T${b.startTime}`);
    return aDate - bDate;
  });

  entries.forEach(entry => {
    const row = document.createElement("tr");

    const startCell = document.createElement("td");
    startCell.textContent = `${entry.startDate} ${entry.startTime}`;
    row.appendChild(startCell);

    const endCell = document.createElement("td");
    endCell.textContent = `${entry.endDate} ${entry.endTime}`;
    row.appendChild(endCell);

    const durationCell = document.createElement("td");
    durationCell.textContent = entry.duration;
    row.appendChild(durationCell);

    const commentsCell = document.createElement("td");
    commentsCell.textContent = entry.comments || "";
    row.appendChild(commentsCell);

    const actionsCell = document.createElement("td");
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.classList.add("btn");
    editBtn.style.backgroundColor = "#ffc107";
    editBtn.style.marginRight = "5px";
    editBtn.onclick = () => editEntry(entry.id);
    actionsCell.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.classList.add("btn");
    deleteBtn.style.backgroundColor = "#dc3545";
    deleteBtn.onclick = () => deleteEntry(entry.id);
    actionsCell.appendChild(deleteBtn);

    row.appendChild(actionsCell);
    sleepTableBody.appendChild(row);
  });

  renderChart(); // Updates the chart, weekly & monthly tables
}

// =============================
//   DURATION CALCULATION
// =============================
function calculateDuration(startDate, startTime, endDate, endTime) {
  const startDateTime = new Date(`${startDate}T${startTime}`);
  let endDateTime     = new Date(`${endDate}T${endTime}`);

  let durationHours = (endDateTime - startDateTime) / (1000 * 3600);

  // If negative, user likely didn't set next day
  if (durationHours < 0) {
    endDateTime.setDate(endDateTime.getDate() + 1);
    durationHours = (endDateTime - startDateTime) / (1000 * 3600);
  }

  return Math.round(durationHours * 100) / 100;
}

// =============================
//   SAVE / LOAD ENTRIES
// =============================
function saveAllUsersData() {
  localStorage.setItem("sleepEntriesByUser", JSON.stringify(sleepEntriesByUser));
}

// =============================
//   RENDER CHART (Chart.js)
//   + Weekly/Monthly tables
// =============================
function renderChart() {
  if (!currentUser) return;

  const entries = sleepEntriesByUser[currentUser];

  // Build date -> total hours map
  const dateMap = {};
  entries.forEach(e => {
    const dateStr = e.startDate;
    if (!dateMap[dateStr]) {
      dateMap[dateStr] = 0;
    }
    dateMap[dateStr] += e.duration;
  });

  // Sort & create dailyTotals array
  const sortedDates = Object.keys(dateMap).sort((a, b) => new Date(a) - new Date(b));
  const dailyTotals = sortedDates.map(d => ({ date: d, total: dateMap[d] }));

  // Render daily bar chart + rolling average line
  renderDailyChart(dailyTotals);

  // Also render weekly/monthly tables
  renderWeeklyMonthlyTables(dailyTotals);
}

// ====================================================
//  Daily Chart + Rolling Average + Overall Daily Avg
// ====================================================
function renderDailyChart(dailyTotals) {
  const ctx = document.getElementById("sleepChart").getContext("2d");

  // If no data, clear & return
  if (!dailyTotals.length) {
    if (chartInstance) chartInstance.destroy();
    if (statsContainer) statsContainer.innerHTML = "";
    return;
  }

  // Data arrays
  const sortedDates = dailyTotals.map(obj => obj.date);
  const dailyDurations = dailyTotals.map(obj => obj.total);

  // 7-day rolling average
  const rollingAverages = computeRollingAvg(dailyTotals, 7);

  // Compute only the overall daily average across entire dataset
  const overallAvg = computeOverallDailyAvg(dailyTotals);

  // Create or update statsContainer
  if (!statsContainer) {
    const chartContainer = document.getElementById("chartContainer");
    statsContainer = document.createElement("div");
    statsContainer.style.textAlign = "center";
    statsContainer.style.marginTop = "20px";
    chartContainer.appendChild(statsContainer);
  }
  statsContainer.innerHTML = `
    <p><strong>Overall Avg (Daily):</strong> ${overallAvg.toFixed(2)} hrs/day</p>
  `;

  // Destroy existing chart if any
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    data: {
      labels: sortedDates,
      datasets: [
        {
          type: "bar",
          label: "Total Sleep (hrs)",
          data: dailyDurations,
          backgroundColor: "rgba(54, 162, 235, 0.5)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
          yAxisID: "y"
        },
        {
          type: "line",
          label: "7-Day Rolling Avg (hrs)",
          data: rollingAverages,
          borderColor: "#ff5733",
          backgroundColor: "rgba(255, 87, 51, 0.2)",
          fill: false,
          borderWidth: 2,
          yAxisID: "y"
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Hours Slept"
          }
        },
        x: {
          title: {
            display: true,
            text: "Date"
          }
        }
      },
      plugins: {
        tooltip: {
          mode: "index",
          intersect: false
        }
      }
    }
  });
}

// =============================
//    STATS CALCULATION
// =============================
function computeOverallDailyAvg(dailyTotals) {
  if (!dailyTotals.length) return 0;
  const totalSum = dailyTotals.reduce((sum, day) => sum + day.total, 0);
  return totalSum / dailyTotals.length;
}

function computeRollingAvg(dailyTotals, windowSize = 7) {
  const result = [];
  let windowSum = 0;
  const queue = [];

  for (let i = 0; i < dailyTotals.length; i++) {
    const dayVal = dailyTotals[i].total;
    queue.push(dayVal);
    windowSum += dayVal;

    if (queue.length > windowSize) {
      windowSum -= queue.shift();
    }

    const avg = windowSum / queue.length;
    result.push(Number(avg.toFixed(2)));
  }
  return result;
}

// =============================
//   WEEKLY / MONTHLY TABLES
//   (Each group separately)
// =============================
function renderWeeklyMonthlyTables(dailyTotals) {
  // Weekly
  const weeklyData = computeWeeklyAverages(dailyTotals);
  weeklyTbody.innerHTML = ""; // clear old rows

  weeklyData.forEach(item => {
    const row = document.createElement("tr");
    const weekTd = document.createElement("td");
    const avgTd = document.createElement("td");

    weekTd.textContent = item.weekKey; // e.g. "2025-W02"
    avgTd.textContent  = item.average.toFixed(2);

    row.appendChild(weekTd);
    row.appendChild(avgTd);
    weeklyTbody.appendChild(row);
  });

  // Monthly
  const monthlyData = computeMonthlyAverages(dailyTotals);
  monthlyTbody.innerHTML = "";

  monthlyData.forEach(item => {
    const row = document.createElement("tr");
    const monthTd = document.createElement("td");
    const avgTd   = document.createElement("td");

    monthTd.textContent = item.monthKey;  // e.g. "2025-01"
    avgTd.textContent   = item.average.toFixed(2);

    row.appendChild(monthTd);
    row.appendChild(avgTd);
    monthlyTbody.appendChild(row);
  });
}

// =============================
//   GROUP-BY-WEEK / MONTH LOGIC
// =============================
function computeWeeklyAverages(dailyTotals) {
  const weeklyMap = {};
  const weeklyCount = {};

  dailyTotals.forEach(d => {
    const dateObj = new Date(d.date);
    const year = dateObj.getUTCFullYear();
    const weekNum = getISOWeekNumber(dateObj);  
    const weekKey = `${year}-W${String(weekNum).padStart(2, '0')}`;

    if (!weeklyMap[weekKey]) {
      weeklyMap[weekKey] = 0;
      weeklyCount[weekKey] = 0;
    }
    weeklyMap[weekKey] += d.total;
    weeklyCount[weekKey] += 1;
  });

  const result = Object.keys(weeklyMap).map(weekKey => {
    const sum = weeklyMap[weekKey];
    const count = weeklyCount[weekKey];
    return {
      weekKey,
      average: sum / count // average daily hours that week
    };
  });

  // Sort by weekKey
  result.sort((a, b) => a.weekKey.localeCompare(b.weekKey));
  return result;
}

function computeMonthlyAverages(dailyTotals) {
  const monthlyMap = {};
  const monthlyCount = {};

  dailyTotals.forEach(d => {
    const dateObj = new Date(d.date);
    const y = dateObj.getUTCFullYear();
    const m = dateObj.getUTCMonth() + 1; 
    const monthKey = `${y}-${String(m).padStart(2, '0')}`;

    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = 0;
      monthlyCount[monthKey] = 0;
    }
    monthlyMap[monthKey] += d.total;
    monthlyCount[monthKey] += 1;
  });

  const result = Object.keys(monthlyMap).map(monthKey => {
    const sum = monthlyMap[monthKey];
    const count = monthlyCount[monthKey];
    return {
      monthKey,
      average: sum / count
    };
  });

  result.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  return result;
}

function getISOWeekNumber(dateObj) {
  const tmp = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
  const dayNum = tmp.getUTCDay() === 0 ? 7 : tmp.getUTCDay();
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
  return weekNo;
}

// =============================
//   EXPORT / IMPORT LOGIC
// =============================
function exportData() {
  if (!currentUser) {
    alert("Please log in first.");
    return;
  }
  const dataToExport = sleepEntriesByUser[currentUser];

  const dataStr = JSON.stringify(dataToExport, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = currentUser + "_sleep_data.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function importData(event) {
  if (!currentUser) {
    alert("Please log in first.");
    return;
  }
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      sleepEntriesByUser[currentUser] = imported;
      saveAllUsersData();
      renderTable();
      alert("Data imported successfully!");
    } catch (err) {
      alert("Invalid JSON file.");
    }
  };
  reader.readAsText(file);

  event.target.value = "";
}
