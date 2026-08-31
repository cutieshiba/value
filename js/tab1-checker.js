// Tab 1 State
let chartInstance = null;
let selectedPetName = "";
let activeType = 'Regular'; // 'Regular', 'M', or 'N'
let hasFly = false; 
let hasRide = false;

// 1. Toggles (Called directly by button onclick)
function toggleVariant(v) { 
  activeType = (activeType === v) ? 'Regular' : v; 
  updateToggleUI(); 
}

function togglePotion(p) { 
  if (p === 'F') hasFly = !hasFly; 
  if (p === 'R') hasRide = !hasRide; 
  updateToggleUI(); 
}

// 2. Safe Color Switcher (Only changes background/text colors)
function updateToggleUI() {
  const btnM = document.getElementById("toggle-M");
  const btnN = document.getElementById("toggle-N");
  const btnF = document.getElementById("toggle-F");
  const btnR = document.getElementById("toggle-R");

  // Helper function to safely apply colors without breaking clicks
  const applyColors = (btn, isActive, activeBg, activeBorder) => {
    if (!btn) return;
    if (isActive) {
      btn.style.backgroundColor = activeBg;
      btn.style.borderColor = activeBorder;
      btn.style.color = "#ffffff";
      btn.style.fontWeight = "bold";
    } else {
      btn.style.backgroundColor = "#1e293b";
      btn.style.borderColor = "#334155";
      btn.style.color = "#94a3b8";
      btn.style.fontWeight = "normal";
    }
  };

  // Apply colors directly to buttons
  applyColors(btnM, activeType === 'M', '#a855f7', '#c084fc'); // Purple
  applyColors(btnN, activeType === 'N', '#22c55e', '#4ade80'); // Green
  applyColors(btnF, hasFly,          '#3b82f6', '#60a5fa'); // Blue
  applyColors(btnR, hasRide,         '#ec4899', '#f472b6'); // Pink

  // Update combo tag display label if present
  const tagDisplay = document.getElementById('activeComboTag');
  if (tagDisplay && typeof getComboTag === 'function') {
    tagDisplay.innerText = getComboTag(activeType, hasFly, hasRide);
  }
}

// 3. Search & Select Handlers
function filterPetList() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const container = document.getElementById("petSelectContainer");
  const select = document.getElementById("petSelect");

  if (!query) { 
    if (container) container.classList.add("hidden"); 
    return; 
  }

  if (typeof uniqueBasePets !== 'undefined' && select) {
    const filtered = uniqueBasePets.filter(p => p.toLowerCase().includes(query));
    select.innerHTML = "";
    
    filtered.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p; 
      opt.textContent = p;
      select.appendChild(opt);
    });

    if (container && filtered.length > 0) {
      container.classList.remove("hidden");
    }
  }
}

function onPetSelectClick() {
  const select = document.getElementById("petSelect");
  if (!select || !select.value) return;

  selectedPetName = select.value;
  document.getElementById("searchInput").value = selectedPetName;
  
  const container = document.getElementById("petSelectContainer");
  if (container) container.classList.add("hidden");
}

function executeSearch() {
  if (!selectedPetName) {
    selectedPetName = document.getElementById("searchInput").value.trim();
  }
  
  if (!selectedPetName) {
    alert("Please select or enter a pet name!");
    return;
  }

  const combo = getComboTag(activeType, hasFly, hasRide);
  renderDashboard(selectedPetName, combo);
}

// 4. Dashboard & Chart Rendering
function renderDashboard(petName, comboTag) {
  const titleElem = document.getElementById('chartTitle');
  if (titleElem) titleElem.innerText = `${petName} (${comboTag})`;

  if (typeof rawRecords === 'undefined') return;

  const records = rawRecords.filter(r => 
    r.name.toLowerCase() === petName.toLowerCase() && r.combo === comboTag
  );

  records.sort((a, b) => new Date(a.date) - new Date(b.date));

  const dates = records.map(r => r.date);
  const values = records.map(r => r.val);

  if (values.length > 0) {
    const statCurr = document.getElementById('statCurrent');
    const statAth = document.getElementById('statATH');
    const statSnaps = document.getElementById('statSnapshots');

    if (statCurr) statCurr.innerText = values[values.length - 1];
    if (statAth) statAth.innerText = Math.max(...values);
    if (statSnaps) statSnaps.innerText = records.length;
    
    if (typeof calculatePetTrend === 'function') {
      const trend = calculatePetTrend(petName, comboTag);
      const trendElem = document.getElementById('statTrend');
      if (trendElem) {
        trendElem.innerText = trend.text;
        trendElem.style.cssText = `font-size: 1.25rem; font-weight: 700; margin-top: 0.25rem; ${trend.color}`;
      }
    }

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
    alert(`No price history found for ${petName} [${comboTag}]`);
  }
}

// 5. Backpack Inspection Route
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

// 6. Bind Buttons Safely on Page Load
document.addEventListener("DOMContentLoaded", () => {
  updateToggleUI();
});
