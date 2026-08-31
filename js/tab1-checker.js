// ==========================================
// Tab 1 Global State
// ==========================================
var activeType = 'Regular'; // 'Regular', 'M', or 'N'
var hasFly = false; 
var hasRide = false;
var chartInstance = null;
var selectedPetName = "";

// ==========================================
// 1. Button Toggles & UI Styling
// ==========================================
function toggleVariant(v) { 
  activeType = (activeType === v) ? 'Regular' : v; 
  updateToggleUI(); 
}

function togglePotion(p) { 
  if (p === 'F') hasFly = !hasFly; 
  if (p === 'R') hasRide = !hasRide; 
  updateToggleUI(); 
}

function updateToggleUI() {
  const btnM = document.getElementById("toggle-M");
  const btnN = document.getElementById("toggle-N");
  const btnF = document.getElementById("toggle-F");
  const btnR = document.getElementById("toggle-R");

  function styleButton(btn, isActive, activeBgColor, activeBorderColor) {
    if (!btn) return;
    if (isActive) {
      btn.style.backgroundColor = activeBgColor;
      btn.style.borderColor = activeBorderColor;
      btn.style.color = "#ffffff";
      btn.style.fontWeight = "bold";
    } else {
      btn.style.backgroundColor = "#1e293b";
      btn.style.borderColor = "#334155";
      btn.style.color = "#94a3b8";
      btn.style.fontWeight = "normal";
    }
  }

  styleButton(btnM, activeType === 'M', '#a855f7', '#c084fc'); // Purple
  styleButton(btnN, activeType === 'N', '#22c55e', '#4ade80'); // Green
  styleButton(btnF, hasFly,          '#3b82f6', '#60a5fa'); // Blue
  styleButton(btnR, hasRide,         '#ec4899', '#f472b6'); // Pink

  // Update combo tag display label if present
  const tagDisplay = document.getElementById('activeComboTag');
  if (tagDisplay && typeof getComboTag === 'function') {
    tagDisplay.innerText = getComboTag(activeType, hasFly, hasRide);
  }
}

// ==========================================
// 2. Search & Dropdown Filter Handlers
// ==========================================
function filterPetList() {
  const input = document.getElementById("searchInput");
  if (!input) return;

  const query = input.value.trim().toLowerCase();
  const container = document.getElementById("petSelectContainer");
  const select = document.getElementById("petSelect");

  // Keep search target updated as user types
  selectedPetName = input.value.trim();

  if (!query) { 
    if (container) container.classList.add("hidden"); 
    return; 
  }

  if (typeof uniqueBasePets !== 'undefined' && Array.isArray(uniqueBasePets) && select) {
    const filtered = uniqueBasePets.filter(p => p.toLowerCase().includes(query));
    select.innerHTML = "";
    
    filtered.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p; 
      opt.textContent = p;
      select.appendChild(opt);
    });

    if (container) {
      if (filtered.length > 0) {
        container.classList.remove("hidden");
      } else {
        container.classList.add("hidden");
      }
    }
  }
}

function onPetSelectClick() {
  const select = document.getElementById("petSelect");
  if (!select || !select.value) return;

  selectedPetName = select.value;
  
  const input = document.getElementById("searchInput");
  if (input) input.value = selectedPetName;
  
  const container = document.getElementById("petSelectContainer");
  if (container) container.classList.add("hidden");
}

function executeSearch() {
  const input = document.getElementById("searchInput");
  if (input && input.value.trim() !== "") {
    selectedPetName = input.value.trim();
  }
  
  if (!selectedPetName) {
    alert("Please type or select a pet name first!");
    return;
  }

  // Fallback helper if app.js isn't providing getComboTag
  let combo = "";
  if (typeof getComboTag === 'function') {
    combo = getComboTag(activeType, hasFly, hasRide);
  } else {
    let potionTag = "NP";
    if (hasFly && hasRide) potionTag = "FR";
    else if (hasFly) potionTag = "F";
    else if (hasRide) potionTag = "R";
    combo = `${activeType}_${potionTag}`;
  }

  renderDashboard(selectedPetName, combo);
}

// ==========================================
// 3. Dashboard & Chart Rendering
// ==========================================
function renderDashboard(petName, comboTag) {
  const titleElem = document.getElementById('chartTitle');
  if (titleElem) titleElem.innerText = `${petName} (${comboTag})`;

  if (typeof rawRecords === 'undefined' || !Array.isArray(rawRecords)) {
    alert("Data not loaded yet. Please wait or check your CSV file.");
    return;
  }

  const records = rawRecords.filter(r => 
    r.name && r.name.toLowerCase() === petName.toLowerCase() && r.combo === comboTag
  );

  records.sort((a, b) => new Date(a.date) - new Date(b.date));

  const dates = records.map(r => r.date);
  const values = records.map(r => r.val);

  if (values.length > 0) {
    // Populate Stat Counter Elements
    const statCurr = document.getElementById('statCurrent');
    const statAth = document.getElementById('statATH');
    const statSnaps = document.getElementById('statSnapshots');

    if (statCurr) statCurr.innerText = values[values.length - 1];
    if (statAth) statAth.innerText = Math.max(...values);
    if (statSnaps) statSnaps.innerText = records.length;
    
    // Calculate Trend
    if (typeof calculatePetTrend === 'function') {
      const trend = calculatePetTrend(petName, comboTag);
      const trendElem = document.getElementById('statTrend');
      if (trendElem) {
        trendElem.innerText = trend.text;
        trendElem.style.cssText = `font-size: 1.25rem; font-weight: 700; margin-top: 0.25rem; ${trend.color}`;
      }
    }

    // Chart.js Graph Rendering
    const chartCanvas = document.getElementById('valueChart');
    if (chartCanvas && window.Chart) {
      const ctx = chartCanvas.getContext('2d');
      if (chartInstance) chartInstance.destroy();

      chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: dates,
          datasets: [{
            label: 'Value',
            data: values,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
          }
        }
      });
    }
  } else {
    alert(`No price history found for "${petName}" [${comboTag}]`);
  }
}

// ==========================================
// 4. Backpack Integration Route (Tab 2/3 Link)
// ==========================================
function inspectPetFromBackpack(petName, comboTag) {
  selectedPetName = petName;
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = petName;

  const parts = comboTag.split('_');
  activeType = parts[0] || 'Regular';
  const potions = parts[1] || 'NP';
  hasFly = potions.includes('F');
  hasRide = potions.includes('R');

  updateToggleUI();
  if (typeof switchTab === 'function') switchTab(1);
  renderDashboard(petName, comboTag);
}

// Ensure Button Styling on Page Load
document.addEventListener("DOMContentLoaded", function() {
  updateToggleUI();
});
