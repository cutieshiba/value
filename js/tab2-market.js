// Tab 2 Local Pagination & Data State
var gainersLimit = 10;
var losersLimit = 10;
var cachedTrendData = [];

// Helper function to safely get rawRecords array
function getRawRecords() {
  if (window.rawRecords && Array.isArray(window.rawRecords) && window.rawRecords.length > 0) {
    return window.rawRecords;
  }
  if (typeof rawRecords !== 'undefined' && Array.isArray(rawRecords) && rawRecords.length > 0) {
    return rawRecords;
  }
  return [];
}

// 1. Main Compute Function for Top Gainers & Losers
function computeMarketTrends() {
  var dataRecords = getRawRecords();

  if (dataRecords.length === 0) {
    // If data isn't ready yet, attempt reload shortly
    setTimeout(computeMarketTrends, 300);
    return;
  }

  var petGroupMap = {};

  dataRecords.forEach(function(r) {
    if (!r.name || !r.combo || r.val === undefined) return;
    var key = `${r.name} (${r.combo})`;
    if (!petGroupMap[key]) petGroupMap[key] = [];
    petGroupMap[key].push(r);
  });

  cachedTrendData = [];

  Object.keys(petGroupMap).forEach(function(key) {
    var list = petGroupMap[key];
    if (list.length >= 2) {
      list.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
      var oldVal = Number(list[0].val) || 0;
      var newVal = Number(list[list.length - 1].val) || 0;
      var diff = newVal - oldVal;
      var pct = oldVal !== 0 ? (diff / oldVal) * 100 : 0;

      cachedTrendData.push({
        label: key,
        petName: list[0].name,
        combo: list[0].combo,
        oldVal: oldVal,
        newVal: newVal,
        diff: diff,
        pct: pct
      });
    }
  });

  renderGainersAndLosers();
}

function renderGainersAndLosers() {
  var gainers = cachedTrendData.filter(function(t) { return t.diff > 0; })
                               .sort(function(a, b) { return b.pct - a.pct; });

  var losers = cachedTrendData.filter(function(t) { return t.diff < 0; })
                              .sort(function(a, b) { return a.pct - b.pct; });

  // Render Top Gainers
  var gainersContainer = document.getElementById("topGainersList");
  if (gainersContainer) {
    var visibleGainers = gainers.slice(0, gainersLimit);
    var gainersHTML = visibleGainers.length === 0 ? 
      `<div class="text-slate-500 py-2 text-center text-xs">No price gainers detected in current data.</div>` :
      visibleGainers.map(function(g) {
        var petNameEscaped = g.petName.replace(/'/g, "\\'");
        return `
          <div onclick="inspectPetFromBackpack('${petNameEscaped}', '${g.combo}')" class="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition mb-2">
            <div>
              <div class="font-bold text-white">${g.label}</div>
              <div class="text-[10px] text-slate-400">${g.oldVal} pts ➔ <span class="text-emerald-400 font-bold">${g.newVal} pts</span></div>
            </div>
            <span class="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-bold">+${g.pct.toFixed(1)}%</span>
          </div>
        `;
      }).join("");

    if (gainers.length > gainersLimit) {
      gainersHTML += `
        <button onclick="loadMoreGainers()" class="w-full py-2 mt-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold rounded-lg border border-slate-700 transition">
          See More Gainers (${gainers.length - gainersLimit} remaining)
        </button>
      `;
    }
    gainersContainer.innerHTML = gainersHTML;
  }

  // Render Top Losers
  var losersContainer = document.getElementById("topLosersList");
  if (losersContainer) {
    var visibleLosers = losers.slice(0, losersLimit);
    var losersHTML = visibleLosers.length === 0 ? 
      `<div class="text-slate-500 py-2 text-center text-xs">No price drops detected in current data.</div>` :
      visibleLosers.map(function(l) {
        var petNameEscaped = l.petName.replace(/'/g, "\\'");
        return `
          <div onclick="inspectPetFromBackpack('${petNameEscaped}', '${l.combo}')" class="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 hover:border-rose-500/40 cursor-pointer transition mb-2">
            <div>
              <div class="font-bold text-white">${l.label}</div>
              <div class="text-[10px] text-slate-400">${l.oldVal} pts ➔ <span class="text-rose-400 font-bold">${l.newVal} pts</span></div>
            </div>
            <span class="px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md text-xs font-bold">${l.pct.toFixed(1)}%</span>
          </div>
        `;
      }).join("");

    if (losers.length > losersLimit) {
      losersHTML += `
        <button onclick="loadMoreLosers()" class="w-full py-2 mt-2 bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-bold rounded-lg border border-slate-700 transition">
          See More Losers (${losers.length - losersLimit} remaining)
        </button>
      `;
    }
    losersContainer.innerHTML = losersHTML;
  }
}

function loadMoreGainers() {
  gainersLimit += 10;
  renderGainersAndLosers();
}

function loadMoreLosers() {
  losersLimit += 10;
  renderGainersAndLosers();
}

// 2. Render Snapshot History with Expandable Changes (FR, NFR, MFR)
function renderUpdateHistory() {
  var dataRecords = getRawRecords();
  var historyList = document.getElementById("updateHistoryList");
  if (!historyList) return;

  if (dataRecords.length === 0) {
    historyList.innerHTML = `<div class="text-slate-500 text-center py-2">Loading snapshot data...</div>`;
    setTimeout(renderUpdateHistory, 300);
    return;
  }

  var dates = Array.from(new Set(dataRecords.map(function(r) { return r.date; })))
                   .filter(Boolean)
                   .sort(function(a, b) { return new Date(b) - new Date(a); });

  if (dates.length === 0) {
    historyList.innerHTML = `<div class="text-slate-500 text-center py-2">No snapshot dates logged.</div>`;
    return;
  }

  var targetCombos = ['Regular_FR', 'N_FR', 'M_FR'];

  historyList.innerHTML = dates.map(function(dateStr, idx) {
    var dateRecords = dataRecords.filter(function(r) { return r.date === dateStr; });
    var prevDateIndex = dates.indexOf(dateStr) + 1;
    var prevDateStr = dates[prevDateIndex] || null;

    var changes = [];

    if (prevDateStr) {
      var prevRecords = dataRecords.filter(function(r) { return r.date === prevDateStr; });

      dateRecords.forEach(function(curr) {
        if (targetCombos.indexOf(curr.combo) !== -1) {
          var matchPrev = prevRecords.find(function(p) { 
            return p.name && curr.name && p.name.toLowerCase() === curr.name.toLowerCase() && p.combo === curr.combo; 
          });

          if (matchPrev && Number(matchPrev.val) !== Number(curr.val)) {
            changes.push({
              name: curr.name,
              combo: curr.combo,
              oldVal: Number(matchPrev.val),
              newVal: Number(curr.val),
              diff: Number(curr.val) - Number(matchPrev.val)
            });
          }
        }
      });
    }

    var changesDetailsHTML = changes.length === 0 ? 
      `<div class="text-slate-500 text-[11px] py-1 italic">No changes in FR, NFR, or MFR values recorded for this snapshot.</div>` :
      changes.map(function(c) {
        var isGain = c.diff > 0;
        var colorClass = isGain ? 'text-emerald-400' : 'text-rose-400';
        var sign = isGain ? '+' : '';
        var formattedCombo = c.combo.replace('Regular_', '');
        var petNameEscaped = c.name.replace(/'/g, "\\'");

        return `
          <div onclick="inspectPetFromBackpack('${petNameEscaped}', '${c.combo}')" class="flex items-center justify-between bg-slate-950/70 p-2 rounded border border-slate-800 hover:border-brand-500/40 cursor-pointer transition text-[11px] my-1">
            <span class="font-bold text-white">${c.name} <span class="text-slate-400">(${formattedCombo})</span></span>
            <span>
              <span class="text-slate-400">${c.oldVal} pts</span> ➔ 
              <strong class="${colorClass}">${c.newVal} pts</strong> 
              <span class="${colorClass} font-semibold ml-1">(${sign}${c.diff.toFixed(1)})</span>
            </span>
          </div>
        `;
      }).join("");

    return `
      <div class="border-b border-slate-800/80 last:border-0 py-2">
        <button onclick="toggleDateExpand('${idx}')" class="w-full flex items-center justify-between text-left focus:outline-none group">
          <span class="text-slate-300 font-medium group-hover:text-white transition">
            📅 Snapshot Date: <strong class="text-white">${dateStr}</strong>
          </span>
          <div class="flex items-center gap-2">
            <span class="text-slate-400 text-[11px] bg-slate-800 px-2 py-0.5 rounded">${changes.length} core changes</span>
            <span id="expandIcon-${idx}" class="text-slate-400 text-xs font-bold transition-transform">▶</span>
          </div>
        </button>
        <div id="dateDetails-${idx}" class="hidden mt-2 pl-2 border-l-2 border-brand-500/40 space-y-1">
          ${changesDetailsHTML}
        </div>
      </div>
    `;
  }).join("");
}

function toggleDateExpand(idx) {
  var details = document.getElementById(`dateDetails-${idx}`);
  var icon = document.getElementById(`expandIcon-${idx}`);

  if (details) {
    if (details.classList.contains('hidden')) {
      details.classList.remove('hidden');
      if (icon) icon.innerText = "▼";
    } else {
      details.classList.add('hidden');
      if (icon) icon.innerText = "▶";
    }
  }
}

// 3. Auto-run triggers when DOM or Tab is active
document.addEventListener("DOMContentLoaded", function() {
  computeMarketTrends();
  renderUpdateHistory();
});
