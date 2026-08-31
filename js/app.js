// Global Application State
let rawRecords = [];
let uniqueBasePets = [];

// Shared Utility: Determine Combo Tag
function getComboTag(type, fly, ride) {
  let potionTag = "NP";
  if (fly && ride) potionTag = "FR";
  else if (fly) potionTag = "F";
  else if (ride) potionTag = "R";
  return `${type}_${potionTag}`;
}

// Shared Utility: Button Class Updater
function updateButtonStyling(prefix, currentType, fly, ride) {
  const btnM = document.getElementById(`${prefix}-toggle-M`);
  const btnN = document.getElementById(`${prefix}-toggle-N`);
  const btnF = document.getElementById(`${prefix}-toggle-F`);
  const btnR = document.getElementById(`${prefix}-toggle-R`);

  const defaultClass = "py-2 rounded border transition bg-slate-800 text-slate-400 border-slate-700";

  if (btnM) btnM.className = currentType === 'M' ? "py-2 rounded border transition btn-m-active" : defaultClass;
  if (btnN) btnN.className = currentType === 'N' ? "py-2 rounded border transition btn-n-active" : defaultClass;
  if (btnF) btnF.className = fly ? "py-2 rounded border transition btn-f-active" : defaultClass;
  if (btnR) btnR.className = ride ? "py-2 rounded border transition btn-r-active" : defaultClass;
}

// Tab Switching Routing
function switchTab(tabIndex) {
  [1, 2, 3].forEach(i => {
    document.getElementById(`tabContent-${i}`).classList.add('hidden');
    document.getElementById(`tabBtn-${i}`).className = "py-3 px-5 text-sm font-bold border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 transition whitespace-nowrap";
  });
  document.getElementById(`tabContent-${tabIndex}`).classList.remove('hidden');
  document.getElementById(`tabBtn-${tabIndex}`).className = "py-3 px-5 text-sm font-bold border-b-2 border-brand-500 text-brand-400 flex items-center gap-2 transition whitespace-nowrap";
}

// Global Valuation Helpers
function getCurrentVal(petName, comboTag) {
  const records = rawRecords.filter(r => r.name.toLowerCase() === petName.toLowerCase() && r.combo === comboTag);
  if (records.length === 0) return 0;
  records.sort((a, b) => new Date(a.date) - new Date(b.date));
  return records[records.length - 1].val;
}

function calculatePetTrend(petName, comboTag) {
  const records = rawRecords.filter(r => r.name.toLowerCase() === petName.toLowerCase() && r.combo === comboTag);
  if (records.length < 2) return { text: "➡️ Stable", color: "text-slate-400", bg: "bg-slate-800" };
  records.sort((a, b) => new Date(a.date) - new Date(b.date));

  const oldest = records[0].val;
  const latest = records[records.length - 1].val;

  if (latest > oldest * 1.03) return { text: "📈 Rising", color: "text-emerald-400", bg: "bg-emerald-500/10 border border-emerald-500/30" };
  if (latest < oldest * 0.97) return { text: "📉 Dropping", color: "text-rose-400", bg: "bg-rose-500/10 border border-rose-500/30" };
  return { text: "➡️ Stable", color: "text-slate-300", bg: "bg-slate-800" };
}

// CSV Initialization
Papa.parse("history.csv", {
  download: true,
  skipEmptyLines: true,
  complete: function(results) { processCSVData(results.data); },
  error: function() {
    document.getElementById('statusBadge').innerText = "Failed to load history.csv";
  }
});

function processCSVData(rows) {
  if (!rows || rows.length === 0) return;
  let startIdx = isNaN(parseFloat(rows[0][rows[0].length - 1])) ? 1 : 0;

  rawRecords = [];
  const basePetSet = new Set();

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (row.length >= 4) {
      const date = row[0].trim();
      const name = row.slice(1, row.length - 2).join(',').trim();
      const combo = row[row.length - 2].trim();
      const val = parseFloat(row[row.length - 1].trim());

      if (name && !isNaN(val)) {
        rawRecords.push({ date, name, combo, val });
        basePetSet.add(name);
      }
    }
  }

  uniqueBasePets = Array.from(basePetSet).sort();
  document.getElementById('statusBadge').innerText = `${rawRecords.length} Records Loaded`;
  
  // Trigger initializations across modular tab files
  if (typeof renderBackpackUI === 'function') renderBackpackUI();
  if (typeof computeMarketTrends === 'function') computeMarketTrends();
  if (typeof renderUpdateHistory === 'function') renderUpdateHistory();
  if (window.lucide) lucide.createIcons();
}
