let chartInstance = null;
let selectedPetName = "";
let activeType = 'Regular', hasFly = false, hasRide = false;

function toggleVariant(v) { 
  activeType = activeType === v ? 'Regular' : v; 
  updateToggleUI(); 
}

function togglePotion(p) { 
  if (p === 'F') hasFly = !hasFly; 
  if (p === 'R') hasRide = !hasRide; 
  updateToggleUI(); 
}

function updateToggleUI() {
  updateButtonStyling('toggle', activeType, hasFly, hasRide);
  document.getElementById('activeComboTag').innerText = getComboTag(activeType, hasFly, hasRide);
}

function filterPetList() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  const container = document.getElementById("petSelectContainer");
  if (!q) { container.classList.add("hidden"); return; }
  const filtered = uniqueBasePets.filter(p => p.toLowerCase().includes(q));
  const select = document.getElementById("petSelect");
  select.innerHTML = "";
  filtered.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p; opt.textContent = p;
    select.appendChild(opt);
  });
  container.classList.remove("hidden");
}

function onPetSelectClick() {
  selectedPetName = document.getElementById("petSelect").value;
  document.getElementById("searchInput").value = selectedPetName;
  document.getElementById("petSelectContainer").classList.add("hidden");
}

function executeSearch() {
  if (!selectedPetName) selectedPetName = document.getElementById("searchInput").value.trim();
  if (!selectedPetName) return alert("Select a pet!");
  const combo = getComboTag(activeType, hasFly, hasRide);
  renderDashboard(selectedPetName, combo);
}

function renderDashboard(selectedPet, comboTag) {
  document.getElementById('chartTitle').innerText = `${selectedPet} (${comboTag})`;
  const records = rawRecords.filter(r => r.name.toLowerCase() === selectedPet.toLowerCase() && r.combo === comboTag);
  records.sort((a, b) => new Date(a.date) - new Date(b.date));

  const dates = records.map(r => r.date);
  const values = records.map(r => r.val);

  if (values.length > 0) {
    document.getElementById('statCurrent').innerText = values[values.length - 1];
    document.getElementById('statATH').innerText = Math.max(...values);
    document.getElementById('statSnapshots').innerText = records.length;
    
    const trend = calculatePetTrend(selectedPet, comboTag);
    const trendElem = document.getElementById('statTrend');
    trendElem.innerText = trend.text;
    trendElem.className = `text-xl font-bold mt-1 ${trend.color}`;

    const ctx = document.getElementById('valueChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: { labels: dates, datasets: [{ label: 'Value', data: values, borderColor: '#6366f1', fill: true }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

function inspectPetFromBackpack(petName, comboTag) {
  selectedPetName = petName;
  document.getElementById("searchInput").value = petName;

  const parts = comboTag.split('_');
  activeType = parts[0] || 'Regular';
  const potions = parts[1] || 'NP';
  hasFly = potions.includes('F');
  hasRide = potions.includes('R');

  updateToggleUI();
  switchTab(1);
  renderDashboard(petName, comboTag);
}
