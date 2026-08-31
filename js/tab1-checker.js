// Tab 1 Global State
window.activeType = 'Regular'; // 'Regular', 'M', or 'N'
window.hasFly = false; 
window.hasRide = false;
window.chartInstance = null;
window.selectedPetName = "";

// Explicitly attach toggle functions to window scope for HTML onclick
window.toggleVariant = function(v) { 
  window.activeType = (window.activeType === v) ? 'Regular' : v; 
  window.updateToggleUI(); 
};

window.togglePotion = function(p) { 
  if (p === 'F') window.hasFly = !window.hasFly; 
  if (p === 'R') window.hasRide = !window.hasRide; 
  window.updateToggleUI(); 
};

// Direct, foolproof color updates
window.updateToggleUI = function() {
  const btnM = document.getElementById("toggle-M");
  const btnN = document.getElementById("toggle-N");
  const btnF = document.getElementById("toggle-F");
  const btnR = document.getElementById("toggle-R");

  // Reset / Default styling helper
  function styleButton(btn, isActive, activeBgColor, activeBorderColor) {
    if (!btn) return;
    if (isActive) {
      btn.style.setProperty("background-color", activeBgColor, "important");
      btn.style.setProperty("border-color", activeBorderColor, "important");
      btn.style.setProperty("color", "#ffffff", "important");
      btn.style.setProperty("font-weight", "bold", "important");
    } else {
      btn.style.setProperty("background-color", "#1e293b", "important");
      btn.style.setProperty("border-color", "#334155", "important");
      btn.style.setProperty("color", "#94a3b8", "important");
      btn.style.setProperty("font-weight", "normal", "important");
    }
  }

  styleButton(btnM, window.activeType === 'M', '#a855f7', '#c084fc'); // Purple
  styleButton(btnN, window.activeType === 'N', '#22c55e', '#4ade80'); // Green
  styleButton(btnF, window.hasFly,          '#3b82f6', '#60a5fa'); // Blue
  styleButton(btnR, window.hasRide,         '#ec4899', '#f472b6'); // Pink

  // Update combo tag display
  const tagDisplay = document.getElementById('activeComboTag');
  if (tagDisplay && typeof getComboTag === 'function') {
    tagDisplay.innerText = getComboTag(window.activeType, window.hasFly, window.hasRide);
  }
};

// Search list filter
window.filterPetList = function() {
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
};

window.onPetSelectClick = function() {
  const select = document.getElementById("petSelect");
  if (!select || !select.value) return;

  window.selectedPetName = select.value;
  document.getElementById("searchInput").value = window.selectedPetName;
  
  const container = document.getElementById("petSelectContainer");
  if (container) container.classList.add("hidden");
};

window.executeSearch = function() {
  if (!window.selectedPetName) {
    window.selectedPetName = document.getElementById("searchInput").value.trim();
  }
  
  if (!window.selectedPetName) {
    alert("Please select or enter a pet name!");
    return;
  }

  const combo = getComboTag(window.activeType, window.hasFly, window.hasRide);
  window.renderDashboard(window.selectedPetName, combo);
};

window.renderDashboard = function(petName, comboTag) {
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
      if (window.chartInstance) window.chartInstance.destroy();

      window.chartInstance = new Chart(ctx, {
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
};

// Initialize colors after DOM loads
document.addEventListener("DOMContentLoaded", () => {
  window.updateToggleUI();
});
