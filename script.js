/***************************************************
 * script.js
 * 
 * Contains all JavaScript logic for multi-user 
 * sleep tracking, including local storage, 
 * chart rendering, and event handlers.
 **************************************************/

// =============================
//        GLOBAL STATE
// =============================
// We store data in local storage with a structure like:
// sleepEntriesByUser = {
//   "alice": [ { id, startDate, startTime, endDate, endTime, duration, comments }, ... ],
//   "bob":   [ ... ],
//   ...
// }

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

  // Save to localStorage just to be safe
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
  const dailyDurations = sortedDates.map(d => dateMap[d]);

  const ctx = document.getElementById("sleepChart").getContext("2d");

  // Destroy previous instance if exists
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sortedDates,
      datasets: [{
        label: "Total Sleep (hrs)",
        data: dailyDurations,
        backgroundColor: "rgba(54, 162, 235, 0.5)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1
      }]
    },
    options: {
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

  // Reset the input so user can import again if needed
  event.target.value = "";
}