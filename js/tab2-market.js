// Tab 2 Local Pagination & State
var gainersLimit = 10;
var losersLimit = 10;
var cachedTrendData = [];

function getRawRecords() {
  if (window.rawRecords && Array.isArray(window.rawRecords) && window.rawRecords.length > 0) {
    return window.rawRecords;
  }
  if (typeof rawRecords !== 'undefined' && Array.isArray(rawRecords) && rawRecords.length > 0) {
    return rawRecords;
  }
  return [];
}

function computeMarketTrends() {
  var dataRecords = getRawRecords();

  if (dataRecords.length === 0) {
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

  // 1. Render Gainers List
  var gainersContainer = document.getElementById("topGainersList");
  var gainersBtnContainer = document.getElementById("topGainersBtnContainer");

  if (gainersContainer) {
    var visibleGainers = gainers.slice(0, gainersLimit);
    gainersContainer.innerHTML = visibleGainers.length === 0 ? 
      `<div class="text-slate-500 py-4 text-center text-xs">No price gainers detected.</div>` :
      visibleGainers.map(function(g) {
        var safeName = g.petName.replace(/'/g, "\\'");
        return `
          <div onclick="inspectPetFromBackpack('${safeName}', '${g.combo}')" class="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition mb-2">
            <div>
              <div class="font-bold text-white">${g.label}</div>
              <div class="text-[10px] text-slate-400">${g.oldVal} pts ➔ <span class="text-emerald-400 font-bold">${g.newVal} pts</span></div>
            </div>
            <span class="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-bold">+${g.pct.toFixed(1)}%</span>
          </div>
        `;
      }).join("");

    if (gainersBtnContainer) {
      if (gainers.length > gainersLimit) {
        gainersBtnContainer.innerHTML = `
          <button onclick="loadMoreGainers()" class="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold rounded-lg border border-emerald-500/30 transition">
            👇 See More Gainers (${gainers.length - gainersLimit} remaining)
          </button>
        `;
      } else {
        gainersBtnContainer.innerHTML = "";
      }
    }
  }

  // 2. Render Losers List
  var losersContainer = document.getElementById("topLosersList");
  var losersBtnContainer = document.getElementById("topLosersBtnContainer");

  if (losersContainer) {
    var visibleLosers = losers.slice(0, losersLimit);
    losersContainer.innerHTML = visibleLosers.length === 0 ? 
      `<div class="text-slate-500 py-4 text-center text-xs">No price drops detected.</div>` :
      visibleLosers.map(function(l) {
        var safeName = l.petName.replace(/'/g, "\\'");
        return `
          <div onclick="inspectPetFromBackpack('${safeName}', '${l.combo}')" class="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 hover:border-rose-500/40 cursor-pointer transition mb-2">
            <div>
              <div class="font-bold text-white">${l.label}</div>
              <div class="text-[10px] text-slate-400">${l.oldVal} pts ➔ <span class="text-rose-400 font-bold">${l.newVal} pts</span></div>
            </div>
            <span class="px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md text-xs font-bold">${l.pct.toFixed(1)}%</span>
          </div>
        `;
      }).join("");

    if (losersBtnContainer) {
      if (losers.length > losersLimit) {
        losersBtnContainer.innerHTML = `
          <button onclick="loadMoreLosers()" class="w-full py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-bold rounded-lg border border-rose-500/30 transition">
            👇 See More Losers (${losers.length - losersLimit} remaining)
          </button>
        `;
      } else {
        losersBtnContainer.innerHTML = "";
      }
    }
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

// 3. Render Version History (FR, NFR, MFR)
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
      `<div class="text-slate-500 text-[11px] py-1.5 italic">No FR, NFR, or MFR changes on this date.</div>` :
      changes.map(function(c) {
        var isGain = c.diff > 0;
        var colorClass = isGain ? 'text-emerald-400' : 'text-rose-400';
        var sign = isGain ? '+' : '';
        var formattedCombo = c.combo.replace('Regular_', '');
        var safeName = c.name.replace(/'/g, "\\'");

        return `
          <div onclick="inspectPetFromBackpack('${safeName}', '${c.combo}')" class="flex items-center justify-between bg-slate-950/80 p-2 rounded border border-slate-800 hover:border-brand-500/50 cursor-pointer transition text-[11px] my-1">
            <span class="font-bold text-white">${c.name} <span class="text-brand-400">(${formattedCombo})</span></span>
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
          <span class="text-slate-200 font-bold group-hover:text-brand-400 transition text-sm">
            📅 Snapshot Date: <strong class="text-white">${dateStr}</strong>
          </span>
          <div class="flex items-center gap-2">
            <span class="text-slate-300 text-[11px] bg-slate-800 px-2 py-0.5 rounded font-semibold border border-slate-700">${changes.length} core changes</span>
            <span id="expandIcon-${idx}" class="text-brand-400 text-xs font-bold">▼ Click to Expand</span>
          </div>
        </button>
        <div id="dateDetails-${idx}" class="hidden mt-2 pl-2 border-l-2 border-brand-500 space-y-1">
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
      if (icon) icon.innerText = "▲ Collapse";
    } else {
      details.classList.add('hidden');
      if (icon) icon.innerText = "▼ Click to Expand";
    }
  }
}

document.addEventListener("DOMContentLoaded", function() {
  computeMarketTrends();
  renderUpdateHistory();
});
