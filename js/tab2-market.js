function computeMarketTrends() {
  const petGroupMap = {};

  rawRecords.forEach(r => {
    const key = `${r.name} (${r.combo})`;
    if (!petGroupMap[key]) petGroupMap[key] = [];
    petGroupMap[key].push(r);
  });

  const trendData = [];

  Object.keys(petGroupMap).forEach(key => {
    const list = petGroupMap[key];
    if (list.length >= 2) {
      list.sort((a, b) => new Date(a.date) - new Date(b.date));
      const oldVal = list[0].val;
      const newVal = list[list.length - 1].val;
      const diff = newVal - oldVal;
      const pct = oldVal !== 0 ? (diff / oldVal) * 100 : 0;

      trendData.push({
        label: key,
        petName: list[0].name,
        combo: list[0].combo,
        oldVal,
        newVal,
        diff,
        pct
      });
    }
  });

  const gainers = trendData.filter(t => t.diff > 0).sort((a, b) => b.pct - a.pct).slice(0, 10);
  const losers = trendData.filter(t => t.diff < 0).sort((a, b) => a.pct - b.pct).slice(0, 10);

  const gainersContainer = document.getElementById("topGainersList");
  if (gainersContainer) {
    gainersContainer.innerHTML = gainers.length === 0 ? 
      `<div class="text-slate-500 py-2 text-center text-xs">No price gainers detected.</div>` :
      gainers.map(g => `
        <div onclick="inspectPetFromBackpack('${g.petName}', '${g.combo}')" class="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition">
          <div>
            <div class="font-bold text-white">${g.label}</div>
            <div class="text-[10px] text-slate-400">${g.oldVal} pts ➔ <span class="text-emerald-400 font-bold">${g.newVal} pts</span></div>
          </div>
          <span class="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-bold">+${g.pct.toFixed(1)}%</span>
        </div>
      `).join("");
  }

  const losersContainer = document.getElementById("topLosersList");
  if (losersContainer) {
    losersContainer.innerHTML = losers.length === 0 ? 
      `<div class="text-slate-500 py-2 text-center text-xs">No price drops detected.</div>` :
      losers.map(l => `
        <div onclick="inspectPetFromBackpack('${l.petName}', '${l.combo}')" class="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 hover:border-rose-500/40 cursor-pointer transition">
          <div>
            <div class="font-bold text-white">${l.label}</div>
            <div class="text-[10px] text-slate-400">${l.oldVal} pts ➔ <span class="text-rose-400 font-bold">${l.newVal} pts</span></div>
          </div>
          <span class="px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md text-xs font-bold">${l.pct.toFixed(1)}%</span>
        </div>
      `).join("");
  }
}

function renderUpdateHistory() {
  const dates = Array.from(new Set(rawRecords.map(r => r.date))).sort((a, b) => new Date(b) - new Date(a));
  const historyList = document.getElementById("updateHistoryList");
  if (!historyList) return;

  historyList.innerHTML = dates.length === 0 ? 
    `<div class="text-slate-500 text-center py-2">No snapshot dates logged.</div>` :
    dates.map(d => {
      const count = rawRecords.filter(r => r.date === d).length;
      return `
        <div class="flex items-center justify-between py-1.5 border-b border-slate-800/60 last:border-0">
          <span class="text-slate-300 font-medium">📅 Snapshot Date: <strong class="text-white">${d}</strong></span>
          <span class="text-slate-400 text-[11px]">${count} records tracked</span>
        </div>
      `;
    }).join("");
}

