// Tab 1 Local State
let chartInstance = null;
let selectedPetName = "";
let activeType = 'Regular'; // 'Regular', 'M', or 'N'
let hasFly = false; 
let hasRide = false;

// 1. Variant Toggle (Mega / Neon)
function toggleVariant(v) { 
  // Toggle off if clicked twice, otherwise set variant
  activeType = (activeType === v) ? 'Regular' : v; 
  updateToggleUI(); 
}

// 2. Potion Toggle (Fly / Ride)
function togglePotion(p) { 
  if (p === 'F') hasFly = !hasFly; 
  if (p === 'R') hasRide = !hasRide; 
  updateToggleUI(); 
}

// 3. Directly Apply Hardcoded Styles to Tab 1 Buttons
function updateToggleUI() {
  if (typeof updateButtonStyling === 'function') {
    // Calls updateButtonStyling in app.js targeting "toggle-M", "toggle-N", "toggle-F", "toggle-R"
    updateButtonStyling('toggle', activeType, hasFly, hasRide);
  }

  // Update combo tag display label if present
  const tagDisplay = document.getElementById('activeComboTag');
  if (tagDisplay && typeof getComboTag === 'function') {
    tagDisplay.innerText = getComboTag(activeType, hasFly, hasRide);
  }
}

// 4. Search Bar Filtering & Dropdown
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

// 5. Select Pet from Dropdown
function onPetSelectClick() {
  const select = document.getElementById("petSelect");
  if (!select || !select.value) return;

  selectedPetName = select.value;
  document.getElementById("searchInput").value = selectedPetName;
  
  const container = document.getElementById("petSelectContainer");
  if (container) container.classList.add("hidden");
}

// 6. Execute Search & Trigger Dashboard
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

// 7. Render Dashboard Stats and Value Chart
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
    // Populate Stat Counters
    const statCurr = document.getElementById('statCurrent');
    const statAth = document.getElementById('statATH');
    const statSnaps = document.getElementById('statSnapshots');

    if (statCurr) statCurr.innerText = values[values.length - 1];
    if (statAth) statAth.innerText = Math.max(...values);
    if (statSnaps) statSnaps.innerText = records.length;
    
    // Populate Trend Badge
    if (typeof calculatePetTrend === 'function') {
      const trend = calculatePetTrend(petName, comboTag);
      const trendElem = document.getElementById('statTrend');
      if (trendElem) {
        trendElem.innerText = trend.text;
        trendElem.style.cssText = `font-size: 1.25rem; font-weight: 700; margin-top: 0.25rem; ${trend.color}`;
      }
    }

    // Render Line Chart (Chart.js)
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
          plugins: {
            legend: { display: false }
          },
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

// 8. Inspect Action Triggered from Backpack (Tab 2 Routing)
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

// 9. Initialize Button States on Load
document.addEventListener("DOMContentLoaded", () => {
  updateToggleUI();
});
