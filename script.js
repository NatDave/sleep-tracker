/***************************************************
 * script.js
 * 
 * Contains all JavaScript logic for multi-user 
 * sleep tracking, including local storage, 
 * chart rendering, event handlers, AND enhanced
 * chart/stats (daily, weekly, monthly averages).
 **************************************************/

// =============================
//        GLOBAL STATE
// =============================
let sleepEntriesByUser = JSON.parse(localStorage.getItem("sleepEntriesByUser")) || {};
let currentUser = null;    // Set after login
let editingEntryId = null; // Track which entry is being edited
let chartInstance = null;

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

// We'll create new DOM elements to display stats
// (You could insert these in index.html if you prefer.)
let statsContainer; // Will be created dynamically in renderChart()

// =============================
//        LOGIN LOGIC
// =============================
loginBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();
  if (!username) {
    alert("Please enter a username.");
    return;
  }

  // Set current user
  currentUser = username;

  // If there's no entry for this user yet, create an empty array
  if (!sleepEntriesByUser[currentUser]) {
    sleepEntriesByUser[currentUser] = [];
  }

  // Save to localStorage
  saveAllUsersData();

  // Hide login form, show main app
  loginFormDiv.classList.add("hidden");
  appSectionDiv.classList.remove("hidden");
  welcomeMsg.textContent = `Welcome, ${currentUser}!`;

  // Render table & chart
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

  // Collect form data
  const startDate = document.getElementById("startDate").value;
  const startTime = document.getElementById("startTime").value;
  const endDate   = document.getElementById("endDate").value;
  const endTime   = document.getElementById("endTime").value;
  const comments  = document.getElementById("comments").value;

  // Calculate duration
  let durationHours = calculateDuration(startDate, startTime, endDate, endTime);

  // Build entry object
  const newEntry = {
    id: Date.now(),
    startDate,
    startTime,
    endDate,
    endTime,
    duration: durationHours,
    comments
  };

  // Add to user's array
  sleepEntriesByUser[currentUser].push(newEntry);
  saveAllUsersData();

  // Clear form
  addForm.reset();

  // Re-render
  renderTable();
});

// =============================
//     EDIT ENTRY LOGIC
// =============================
function editEntry(id) {
  const entry = sleepEntriesByUser[currentUser].find(e => e.id === id);
  if (!entry) return;

  editingEntryId = id;

  // Populate edit form
  document.getElementById("editStartDate").value = entry.startDate;
  document.getElementById("editStartTime").value = entry.startTime;
  document.getElementById("editEndDate").value   = entry.endDate;
  document.getElementById("editEndTime").value   = entry.endTime;
  document.getElementById("editComments").value  = entry.comments;

  // Show edit section
  editSection.style.display = "block";
}

editForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!currentUser) {
    alert("Please log in first.");
    return;
  }
  if (editingEntryId == null) return;

  // Gather updated data
  const startDate = document.getElementById("editStartDate").value;
  const startTime = document.getElementById("editStartTime").value;
  const endDate   = document.getElementById("editEndDate").value;
  const endTime   = document.getElementById("editEndTime").value;
  const comments  = document.getElementById("editComments").value;

  // Recalculate duration
  let durationHours = calculateDuration(startDate, startTime, endDate, endTime);

  // Find the entry in the array and update
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

  // Hide edit section
  editSection.style.display = "none";
  editingEntryId = null;

  // Re-render
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

  // Clear table
  sleepTableBody.innerHTML = "";

  // Sort by start date/time ascending
  const entries = sleepEntriesByUser[currentUser];
  entries.sort((a, b) => {
    const aDate = new Date(`${a.startDate}T${a.startTime}`);
    const bDate = new Date(`${b.startDate}T${b.startTime}`);
    return aDate - bDate;
  });

  // Populate rows
  entries.forEach(entry => {
    const row = document.createElement("tr");

    // Sleep Start
    const startCell = document.createElement("td");
    startCell.textContent = `${entry.startDate} ${entry.startTime}`;
    row.appendChild(startCell);

    // Sleep End
    const endCell = document.createElement("td");
    endCell.textContent = `${entry.endDate} ${entry.endTime}`;
    row.appendChild(endCell);

    // Duration
    const durationCell = document.createElement("td");
    durationCell.textContent = entry.duration;
    row.appendChild(durationCell);

    // Comments
    const commentsCell = document.createElement("td");
    commentsCell.textContent = entry.comments || "";
    row.appendChild(commentsCell);

    // Actions
    const actionsCell = document.createElement("td");
    // Edit button
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.classList.add("btn");
    editBtn.style.backgroundColor = "#ffc107";
    editBtn.style.marginRight = "5px";
    editBtn.onclick = () => editEntry(entry.id);
    actionsCell.appendChild(editBtn);

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.classList.add("btn");
    deleteBtn.style.backgroundColor = "#dc3545";
    deleteBtn.onclick = () => deleteEntry(entry.id);
    actionsCell.appendChild(deleteBtn);

    row.appendChild(actionsCell);
    sleepTableBody.appendChild(row);
  });

  // Update chart
  renderChart();
}

// =============================
//   DURATION CALCULATION
// =============================
function calculateDuration(startDate, startTime, endDate, endTime) {
  const startDateTime = new Date(`${startDate}T${startTime}`);
  let endDateTime     = new Date(`${endDate}T${endTime}`);

  let durationHours = (endDateTime - startDateTime) / (1000 * 3600);

  // If negative, user likely didn't adjust the date for an overnight sleep
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
//    STATS CALCULATION
// =============================
function computeStats(dailyTotals) {
  // dailyTotals = [ { date: '2025-01-01', total: 7.5 }, { date: '2025-01-02', total: 8 }, ... ]

  if (!dailyTotals.length) {
    return {
      overallAverage: 0,
      weeklyAverage: 0,
      monthlyAverage: 0
    };
  }

  // Overall average (sum of daily totals / number of days)
  const totalSum = dailyTotals.reduce((sum, day) => sum + day.total, 0);
  const overallAverage = totalSum / dailyTotals.length;

  // Weekly average
  // 1) Group days by calendar week (e.g. using ISOWeek or Sunday-based).
  //    For simplicity, we'll assume Monday-based weeks using getISOWeek or a hacky approach.
  // 2) Then compute the average for each week, and finally the average across all weeks.

  const weeklyMap = {}; // key: 'YYYY-Wxx', value: sum of daily totals in that week
  const weeklyCount = {}; // to track how many days in each week

  dailyTotals.forEach(d => {
    const dateObj = new Date(d.date);
    const y = dateObj.getFullYear();
    // getWeekNumber function below
    const w = getWeekNumber(dateObj);

    const weekKey = `${y}-W${w}`;
    if (!weeklyMap[weekKey]) {
      weeklyMap[weekKey] = 0;
      weeklyCount[weekKey] = 0;
    }
    weeklyMap[weekKey] += d.total;
    weeklyCount[weekKey] += 1;
  });

  const weeklyAverages = Object.keys(weeklyMap).map(weekKey => {
    return weeklyMap[weekKey] / weeklyCount[weekKey];
  });
  // Now get the average of these weekly averages
  const weeklyAverage = weeklyAverages.reduce((sum, val) => sum + val, 0) / weeklyAverages.length;

  // Monthly average
  // Group by 'YYYY-MM'
  const monthlyMap = {};
  const monthlyCount = {};

  dailyTotals.forEach(d => {
    const dateObj = new Date(d.date);
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth() + 1; // 0-based => +1
    const monthKey = `${y}-${String(m).padStart(2, '0')}`;

    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = 0;
      monthlyCount[monthKey] = 0;
    }
    monthlyMap[monthKey] += d.total;
    monthlyCount[monthKey] += 1;
  });

  const monthlyAverages = Object.keys(monthlyMap).map(monthKey => {
    return monthlyMap[monthKey] / monthlyCount[monthKey];
  });
  const monthlyAverage = monthlyAverages.reduce((sum, val) => sum + val, 0) / monthlyAverages.length;

  return {
    overallAverage,
    weeklyAverage,
    monthlyAverage
  };
}

// A quick function to get the ISO week number
function getWeekNumber(dateObj) {
  // Copy date so don't modify original
  const d = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  const dayNum = d.getUTCDay() === 0 ? 7 : d.getUTCDay(); // Sunday => 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  // year is the year of the Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
}

// Compute a 7-day rolling average array
function computeRollingAvg(dailyTotals, windowSize = 7) {
  // dailyTotals is sorted by date. We'll produce an array of rolling avg values, same length.
  const result = [];
  let windowSum = 0;
  let queue = []; // keep track of last <windowSize> totals

  for (let i = 0; i < dailyTotals.length; i++) {
    const dayVal = dailyTotals[i].total;
    queue.push(dayVal);
    windowSum += dayVal;

    if (queue.length > windowSize) {
      windowSum -= queue.shift(); // remove the oldest
    }

    const avg = windowSum / queue.length;
    result.push(Number(avg.toFixed(2)));
  }
  return result;
}

// =============================
//   RENDER CHART (Chart.js)
// =============================
function renderChart() {
  if (!currentUser) return;

  const entries = sleepEntriesByUser[currentUser];
  // Group total daily sleep by date
  const dateMap = {};
  entries.forEach(e => {
    const dateStr = e.startDate; // "YYYY-MM-DD"
    if (!dateMap[dateStr]) {
      dateMap[dateStr] = 0;
    }
    dateMap[dateStr] += e.duration;
  });

  // Sort dates ascending
  const sortedDates = Object.keys(dateMap).sort((a, b) => new Date(a) - new Date(b));
  const dailyTotals = sortedDates.map(d => {
    return {
      date: d,
      total: dateMap[d]
    };
  });

  const dailyDurations = dailyTotals.map(obj => obj.total);

  // ---- Compute Stats & Rolling Average ----
  const { overallAverage, weeklyAverage, monthlyAverage } = computeStats(dailyTotals);
  const rollingAverages = computeRollingAvg(dailyTotals, 7); // 7-day window

  // ---- Display Stats (in a new or existing container) ----
  // If we've never created statsContainer, create it below the chart
  if (!statsContainer) {
    const chartContainer = document.getElementById("chartContainer");
    statsContainer = document.createElement("div");
    statsContainer.style.textAlign = "center";
    statsContainer.style.marginTop = "20px";
    chartContainer.appendChild(statsContainer);
  }
  statsContainer.innerHTML = `
    <p><strong>Overall Avg (Daily):</strong> ${overallAverage.toFixed(2)} hrs/day</p>
    <p><strong>Weekly Avg:</strong> ${weeklyAverage.toFixed(2)} hrs/day</p>
    <p><strong>Monthly Avg:</strong> ${monthlyAverage.toFixed(2)} hrs/day</p>
  `;

  // ---- Render Chart.js with 2 datasets: daily totals (bars) and 7-day rolling avg (line) ----
  const ctx = document.getElementById("sleepChart").getContext("2d");

  // Destroy previous instance if exists
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
        // For example, you can enable tooltip mode, legend config, etc.
        tooltip: {
          mode: "index",
          intersect: false
        }
      }
    }
  });
}

// =============================
//   EXPORT / IMPORT LOGIC
// =============================
function exportData() {
  if (!currentUser) {
    alert("Please log in first.");
    return;
  }
  // Export only current user's data
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

  // Reset input so user can import again if needed
  event.target.value = "";
}
