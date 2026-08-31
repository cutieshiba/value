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

// Direct Hardcoded Button Style Manager
function updateButtonStyling(prefix, currentType, fly, ride) {
  const btnM = document.getElementById(`${prefix}-toggle-M`);
  const btnN = document.getElementById(`${prefix}-toggle-N`);
  const btnF = document.getElementById(`${prefix}-toggle-F`);
  const btnR = document.getElementById(`${prefix}-toggle-R`);

  // Default Inactive Style (Dark Slate)
  const defaultStyle = "background-color: #1e293b; color: #94a3b8; border: 1px solid #334155;";

  // Active Hardcoded Color Styles
  const mStyle = "background-color: #a855f7; color: #ffffff; border: 1px solid #c084fc; font-weight: bold;";
  const nStyle = "background-color: #22c55e; color: #ffffff; border: 1px solid #4ade80; font-weight: bold;";
  const fStyle = "background-color: #3b82f6; color: #ffffff; border: 1px solid #60a5fa; font-weight: bold;";
  const rStyle = "background-color: #ec4899; color: #ffffff; border: 1px solid #f472b6; font-weight: bold;";

  if (btnM) btnM.style.cssText = currentType === 'M' ? mStyle : defaultStyle;
  if (btnN) btnN.style.cssText = currentType === 'N' ? nStyle : defaultStyle;
  if (btnF) btnF.style.cssText = fly ? fStyle : defaultStyle;
  if (btnR) btnR.style.cssText = ride ? rStyle : defaultStyle;
}

// Tab Switch Routing
function switchTab(tabIndex) {
  [1, 2, 3].forEach(i => {
    const content = document.getElementById(`tabContent-${i}`);
    const btn = document.getElementById(`tabBtn-${i}`);
    if (content) content.classList.add('hidden');
    if (btn) {
      btn.style.cssText = "padding: 0.75rem 1.25rem; font-size: 0.875rem; font-weight: 700; border-bottom: 2px solid transparent; color: #94a3b8;";
    }
  });

  const activeContent = document.getElementById(`tabContent-${tabIndex}`);
  const activeBtn = document.getElementById(`tabBtn-${tabIndex}`);

  if (activeContent) activeContent.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.style.cssText = "padding: 0.75rem 1.25rem; font-size: 0.875rem; font-weight: 700; border-bottom: 2px solid #6366f1; color: #818cf8;";
  }
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
  if (records.length < 2) return { text: "➡️ Stable", color: "color: #94a3b8;" };
  records.sort((a, b) => new Date(a.date) - new Date(b.date));

  const oldest = records[0].val;
  const latest = records[records.length - 1].val;

  if (latest > oldest * 1.03) return { text: "📈 Rising", color: "color: #34d399;" };
  if (latest < oldest * 0.97) return { text: "📉 Dropping", color: "color: #f87171;" };
  return { text: "➡️ Stable", color: "color: #cbd5e1;" };
}

// CSV Parser Initialization
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
  
  if (typeof renderBackpackUI === 'function') renderBackpackUI();
  if (typeof computeMarketTrends === 'function') computeMarketTrends();
  if (typeof renderUpdateHistory === 'function') renderUpdateHistory();
  if (window.lucide) lucide.createIcons();
}
