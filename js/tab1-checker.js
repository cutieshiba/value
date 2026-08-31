// ==========================================
// Tab 1 Global State
// ==========================================
window.activeType = window.activeType || 'Regular'; // 'Regular', 'M', or 'N'
window.hasFly = window.hasFly || false; 
window.hasRide = window.hasRide || false;
window.chartInstance = window.chartInstance || null;
window.selectedPetName = window.selectedPetName || "";

// ==========================================
// 1. Button Toggles & UI Styling
// ==========================================
function toggleVariant(v) { 
  window.activeType = (window.activeType === v) ? 'Regular' : v; 
  updateToggleUI(); 
}

function togglePotion(p) { 
  if (p === 'F') window.hasFly = !window.hasFly; 
  if (p === 'R') window.hasRide = !window.hasRide; 
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

  styleButton(btnM, window.activeType === 'M', '#a855f7', '#c084fc'); // Purple
  styleButton(btnN, window.activeType === 'N', '#22c55e', '#4ade80'); // Green
  styleButton(btnF, window.hasFly,          '#3b82f6', '#60a5fa'); // Blue
  styleButton(btnR, window.hasRide,         '#ec4899', '#f472b6'); // Pink

  // Update combo tag display label
  const tagDisplay = document.getElementById('activeComboTag');
  if (tagDisplay) {
    if (typeof getComboTag === 'function') {
      tagDisplay.innerText = getComboTag(window.activeType, window.hasFly, window.hasRide);
    } else {
      let pTag = "NP";
      if (window.hasFly && window.hasRide) pTag = "FR";
      else if (window.hasFly) pTag = "F";
      else if (window.hasRide) pTag = "R";
      tagDisplay.innerText = `${window.activeType}_${pTag}`;
    }
  }
}

// ==========================================
// 2. Search & Dropdown Handlers
// ==========================================
function filterPetList() {
  const input = document.getElementById("searchInput");
  if (!input) return;

  const query = input.value.trim().toLowerCase();
  const container = document.getElementById("petSelectContainer");
  const select = document.getElementById("petSelect");

  window.selectedPetName = input.value.trim();

  if (!query) { 
    if (container) container.classList.add("hidden"); 
    return; 
  }

  // Fallback check for global pet list
  const petList = window.uniqueBasePets || (typeof uniqueBasePets !== 'undefined' ? uniqueBasePets : []);

  if (Array.isArray(petList) && petList.length > 0 && select) {
    const filtered = petList.filter(p => String(p).toLowerCase().includes(query));
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

// Called when user selects an item from the <select> list (handles onchange/onclick)
function onPetSelectClick() {
  const select = document.getElementById("petSelect");
  if (!select || !select.value) return;

  window.selectedPetName = select.value;
  
  const input = document.getElementById("searchInput");
  if (input) input.value = window.selectedPetName;
  
  const container = document.getElementById("petSelectContainer");
  if (container) container.classList.add("hidden");
}

function executeSearch() {
  const input = document.getElementById("searchInput");
  if (input && input.value.trim() !== "") {
    window.selectedPetName = input.value.trim();
  }
  
  if (!window.selectedPetName) {
    alert("Please type or select a pet name first!");
    return;
  }

  let combo = "";
  if (typeof getComboTag === 'function') {
    combo = getComboTag(window.activeType, window.hasFly, window.hasRide);
  } else {
    let potionTag = "NP";
    if (window.hasFly && window.hasRide) potionTag = "FR";
    else if (window.hasFly) potionTag = "F";
    else if (window.hasRide) potionTag = "R";
    combo = `${window.activeType}_${potionTag}`;
  }

  renderDashboard(window.selectedPetName, combo);
}

// ==========================================
// 3. Dashboard & Chart Rendering
// ==========================================
function renderDashboard(petName, comboTag) {
  const titleElem = document.getElementById('chartTitle');
  if (titleElem) titleElem.innerText = `${petName} (${comboTag})`;

  const dataRecords = window.rawRecords || (typeof rawRecords !== 'undefined' ? rawRecords : null);

  if (!dataRecords || !Array.isArray(dataRecords)) {
    alert("Data not loaded yet. Please wait or check your CSV loading script.");
    return;
  }

  const records = dataRecords.filter(r => 
    r.name && String(r.name).toLowerCase() === String(petName).toLowerCase() && r.combo === comboTag
  );

  records.sort((a, b) => new Date(a.date) - new Date(b.date));

  const dates = records.map(r => r.date);
  const values = records.map(r => Number(r.val) || 0);

  if (values.length > 0) {
    // Populate Stat Counters
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
      if (trendElem && trend) {
        trendElem.innerText = trend.text;
        trendElem.style.cssText = `font-size: 1.25rem; font-weight: 700; margin-top: 0.25rem; ${trend.color}`;
      }
    }

    // Render Chart.js Graph
    const chartCanvas = document.getElementById('valueChart');
    if (chartCanvas && window.Chart) {
      const ctx = chartCanvas.getContext('2d');
      if (window.chartInstance) window.chartInstance.destroy();

      window.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: dates,
          datasets: [{
            label: 'Pet Value',
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
// 4. Backpack Link Navigation Route
// ==========================================
function inspectPetFromBackpack(petName, comboTag) {
  window.selectedPetName = petName;
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = petName;

  const parts = comboTag.split('_');
  window.activeType = parts[0] || 'Regular';
  const potions = parts[1] || 'NP';
  window.hasFly = potions.includes('F');
  window.hasRide = potions.includes('R');

  updateToggleUI();
  if (typeof switchTab === 'function') switchTab(1);
  renderDashboard(petName, comboTag);
}

// Initialize UI on load
document.addEventListener("DOMContentLoaded", function() {
  updateToggleUI();
});
