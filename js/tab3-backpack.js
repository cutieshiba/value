let backpack = JSON.parse(localStorage.getItem('user_backpack') || '[]');
let bpSelectedPet = "", bpActiveType = 'Regular', bpHasFly = false, bpHasRide = false;
let targetSelectedPet = "", targetActiveType = 'Regular', targetHasFly = false, targetHasRide = false;

// Store generated combos globally so we can complete trades cleanly
let currentGeneratedCombos = [];

function toggleBpVariant(v) { 
  bpActiveType = bpActiveType === v ? 'Regular' : v; 
  if (typeof updateButtonStyling === 'function') {
    updateButtonStyling('bp-toggle', bpActiveType, bpHasFly, bpHasRide); 
  }
}

function toggleBpPotion(p) { 
  if (p === 'F') bpHasFly = !bpHasFly; 
  if (p === 'R') bpHasRide = !bpHasRide; 
  if (typeof updateButtonStyling === 'function') {
    updateButtonStyling('bp-toggle', bpActiveType, bpHasFly, bpHasRide); 
  }
}

function filterBpPetList() {
  const q = document.getElementById("bpSearchInput").value.trim().toLowerCase();
  const container = document.getElementById("bpPetSelectContainer");
  if (!q) return container.classList.add("hidden");
  
  const petList = window.uniqueBasePets || (typeof uniqueBasePets !== 'undefined' ? uniqueBasePets : []);
  const filtered = petList.filter(p => p.toLowerCase().includes(q));
  const select = document.getElementById("bpPetSelect");
  select.innerHTML = "";
  filtered.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p; opt.textContent = p;
    select.appendChild(opt);
  });
  container.classList.remove("hidden");
}

function onBpPetSelectClick() {
  bpSelectedPet = document.getElementById("bpPetSelect").value;
  document.getElementById("bpSearchInput").value = bpSelectedPet;
  document.getElementById("bpPetSelectContainer").classList.add("hidden");
}

function addToBackpack() {
  if (!bpSelectedPet) bpSelectedPet = document.getElementById("bpSearchInput").value.trim();
  if (!bpSelectedPet) return alert("Select a pet first!");

  const combo = typeof getComboTag === 'function' ? getComboTag(bpActiveType, bpHasFly, bpHasRide) : `${bpActiveType}_${bpHasFly ? 'F' : ''}${bpHasRide ? 'R' : ''}`.replace('_$', '_NP');
  const rawVal = typeof getCurrentVal === 'function' ? getCurrentVal(bpSelectedPet, combo) : 0;
  const val = Number(rawVal) || 0;

  backpack.push({ id: Date.now(), name: bpSelectedPet, combo, val });
  localStorage.setItem('user_backpack', JSON.stringify(backpack));
  renderBackpackUI();
}

function removeFromBackpack(id) {
  backpack = backpack.filter(i => i.id !== id);
  localStorage.setItem('user_backpack', JSON.stringify(backpack));
  renderBackpackUI();
}

function clearBackpack() {
  backpack = [];
  localStorage.removeItem('user_backpack');
  renderBackpackUI();
}

function renderBackpackUI() {
  const list = document.getElementById("backpackItemsList");
  if (!list) return;
  if (backpack.length === 0) {
    list.innerHTML = `<div class="text-slate-500 py-2 text-xs text-center">Backpack is empty. Add items above!</div>`;
    return;
  }
  list.innerHTML = "";
  backpack.forEach(item => {
    const trend = typeof calculatePetTrend === 'function' ? calculatePetTrend(item.name, item.combo) : { text: '--', color: 'text-slate-400' };
    const formattedVal = (Number(item.val) || 0).toFixed(2);
    
    list.innerHTML += `
      <div class="flex items-center justify-between bg-slate-800 p-2 rounded text-xs hover:bg-slate-700/60 transition mb-1">
        <div onclick="inspectPetFromBackpack('${item.name.replace(/'/g, "\\'")}', '${item.combo}')" class="flex items-center gap-1.5 cursor-pointer flex-1" title="Click to view chart in Tab 1">
          <span class="font-bold text-white hover:text-brand-400 underline decoration-slate-600">${item.name}</span>
          <span class="text-[10px] text-brand-400">(${item.combo})</span>
          <span class="text-[10px] ${trend.color}">${trend.text ? trend.text.split(' ')[0] : ''}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-emerald-400 font-semibold">${formattedVal} pts</span>
          <button onclick="removeFromBackpack(${item.id})" class="text-rose-400 hover:text-rose-300 ml-1">✕</button>
        </div>
      </div>
    `;
  });
}

function toggleTargetVariant(v) {
  targetActiveType = targetActiveType === v ? 'Regular' : v;
  if (typeof updateButtonStyling === 'function') {
    updateButtonStyling('target-toggle', targetActiveType, targetHasFly, targetHasRide);
  }
  const comboTag = typeof getComboTag === 'function' ? getComboTag(targetActiveType, targetHasFly, targetHasRide) : `${targetActiveType}_NP`;
  document.getElementById('targetActiveTag').innerText = comboTag;
}

function toggleTargetPotion(p) {
  if (p === 'F') targetHasFly = !targetHasFly;
  if (p === 'R') targetHasRide = !targetHasRide;
  if (typeof updateButtonStyling === 'function') {
    updateButtonStyling('target-toggle', targetActiveType, targetHasFly, targetHasRide);
  }
  const comboTag = typeof getComboTag === 'function' ? getComboTag(targetActiveType, targetHasFly, targetHasRide) : `${targetActiveType}_NP`;
  document.getElementById('targetActiveTag').innerText = comboTag;
}

function filterTargetList() {
  const q = document.getElementById("targetSearchInput").value.trim().toLowerCase();
  const container = document.getElementById("targetSelectContainer");
  if (!q) return container.classList.add("hidden");
  
  const petList = window.uniqueBasePets || (typeof uniqueBasePets !== 'undefined' ? uniqueBasePets : []);
  const filtered = petList.filter(p => p.toLowerCase().includes(q));
  const select = document.getElementById("targetSelect");
  select.innerHTML = "";
  filtered.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p; opt.textContent = p;
    select.appendChild(opt);
  });
  container.classList.remove("hidden");
}

function onTargetSelectClick() {
  targetSelectedPet = document.getElementById("targetSelect").value;
  document.getElementById("targetSearchInput").value = targetSelectedPet;
  document.getElementById("targetSelectContainer").classList.add("hidden");
}

function generateOfferSuggestions() {
  if (!targetSelectedPet) targetSelectedPet = document.getElementById("targetSearchInput").value.trim();
  if (!targetSelectedPet) return alert("Select target pet!");
  if (backpack.length === 0) return alert("Backpack is empty!");

  const combo = typeof getComboTag === 'function' ? getComboTag(targetActiveType, targetHasFly, targetHasRide) : `${targetActiveType}_NP`;
  const baseVal = Number(typeof getCurrentVal === 'function' ? getCurrentVal(targetSelectedPet, combo) : 0) || 0;
  const trend = typeof calculatePetTrend === 'function' ? calculatePetTrend(targetSelectedPet, combo) : { text: '--', bg: 'bg-slate-800', color: 'text-slate-400' };

  if (baseVal === 0) return alert("Selected target pet variant has no valid price data.");

  document.getElementById("targetValSummary").classList.remove("hidden");
  document.getElementById("dispBaseVal").innerText = baseVal.toFixed(2) + " pts";
  
  const badge = document.getElementById("targetTrendBadge");
  badge.innerText = `Market Trend: ${trend.text}`;
  badge.className = `px-2.5 py-1 rounded-full text-[11px] font-semibold ${trend.bg} ${trend.color}`;

  const allCombos = getAllCombinations(backpack);

  const winOffers = allCombos.filter(c => c.totalVal >= baseVal * 0.85 && c.totalVal <= baseVal * 0.96);
  const fairOffers = allCombos.filter(c => c.totalVal > baseVal * 0.96 && c.totalVal <= baseVal * 1.05);
  const overpayOffers = allCombos.filter(c => c.totalVal > baseVal * 1.05 && c.totalVal <= baseVal * 1.20);

  renderOfferColumn("winOfferContainer", winOffers.slice(0, 3), "Win", baseVal);
  renderOfferColumn("fairOfferContainer", fairOffers.slice(0, 3), "Fair", baseVal);
  renderOfferColumn("loseOfferContainer", overpayOffers.slice(0, 3), "Overpay", baseVal);
}

function getAllCombinations(items) {
  let results = [];
  
  function combine(start, currentCombo, currentVal) {
    if (currentCombo.length > 0 && currentCombo.length <= 6) {
      results.push({ items: [...currentCombo], totalVal: currentVal });
    }
    if (currentCombo.length === 6) return;

    for (let i = start; i < items.length; i++) {
      combine(i + 1, [...currentCombo, items[i]], currentVal + (Number(items[i].val) || 0));
    }
  }

  combine(0, [], 0);
  return results.sort((a, b) => a.totalVal - b.totalVal);
}

function renderOfferColumn(containerId, optionsList, typeLabel, targetVal) {
  const box = document.getElementById(containerId);

  if (!optionsList || optionsList.length === 0) {
    box.innerHTML = `<div class="text-slate-500 text-center py-4 text-xs">No suitable ${typeLabel} combinations found.</div>`;
    return;
  }

  box.innerHTML = optionsList.map((opt, idx) => {
    const diff = opt.totalVal - targetVal;
    const formattedDiff = (diff >= 0 ? `+${diff.toFixed(2)}` : `${diff.toFixed(2)}`) + " pts";
    const diffColor = diff > 0 ? "text-amber-400" : diff < 0 ? "text-emerald-400" : "text-blue-400";
    
    // Store JSON in attribute for execution upon completion
    const offerDataJSON = encodeURIComponent(JSON.stringify({
      offeredItemIds: opt.items.map(i => i.id),
      targetPetName: targetSelectedPet,
      targetCombo: typeof getComboTag === 'function' ? getComboTag(targetActiveType, targetHasFly, targetHasRide) : `${targetActiveType}_NP`,
      targetVal: targetVal
    }));

    return `
      <div class="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-2 mb-2 shadow-sm">
        <div class="flex justify-between items-center border-b border-slate-800 pb-1.5">
          <div>
            <span class="text-[10px] font-bold text-brand-400 uppercase">Option ${idx + 1}</span>
            <span class="text-[10px] font-semibold ml-1.5 ${diffColor}">(${formattedDiff})</span>
          </div>
          <span class="text-xs font-bold ${typeLabel === 'Win' ? 'text-emerald-400' : typeLabel === 'Fair' ? 'text-blue-400' : 'text-amber-400'}">
            ${opt.totalVal.toFixed(2)} pts
          </span>
        </div>
        
        <div class="space-y-1">
          ${opt.items.map(i => {
            const itemTrend = typeof calculatePetTrend === 'function' ? calculatePetTrend(i.name, i.combo) : { text: '--', color: 'text-slate-400' };
            return `
              <div class="flex justify-between items-center text-[11px] text-slate-300">
                <span class="flex items-center gap-1">
                  <span>${i.name}</span>
                  <span class="text-[9px] text-slate-500">(${i.combo})</span>
                  <span class="text-[9px] ${itemTrend.color}">${itemTrend.text ? itemTrend.text.split(' ')[0] : ''}</span>
                </span>
                <span class="text-slate-400">${(Number(i.val) || 0).toFixed(2)}</span>
              </div>
            `;
          }).join("")}
        </div>

        <button onclick="completeTrade('${offerDataJSON}')" class="w-full mt-2 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-bold transition flex items-center justify-center gap-1">
          ✓ Trade Completed
        </button>
      </div>
    `;
  }).join("");
}

// Handler to execute automatic item exchange in backpack
function completeTrade(encodedData) {
  try {
    const data = JSON.parse(decodeURIComponent(encodedData));
    
    // 1. Remove offered items from backpack
    backpack = backpack.filter(item => !data.offeredItemIds.includes(item.id));
    
    // 2. Add received target pet to backpack
    backpack.push({
      id: Date.now(),
      name: data.targetPetName,
      combo: data.targetCombo,
      val: data.targetVal
    });

    // 3. Save state & refresh UI
    localStorage.setItem('user_backpack', JSON.stringify(backpack));
    renderBackpackUI();
    
    // 4. Re-generate / clear offers
    if (backpack.length > 0) {
      generateOfferSuggestions();
    } else {
      document.getElementById("winOfferContainer").innerHTML = `<div class="text-slate-500 text-center py-4 text-xs font-semibold text-emerald-400">Trade completed! Backpack is now empty.</div>`;
      document.getElementById("fairOfferContainer").innerHTML = `<div class="text-slate-500 text-center py-4 text-xs">No suitable Fair combinations found.</div>`;
      document.getElementById("loseOfferContainer").innerHTML = `<div class="text-slate-500 text-center py-4 text-xs">No suitable Overpay combinations found.</div>`;
    }

  } catch (err) {
    console.error("Error completing trade:", err);
  }
}

// Initialize backpack on DOM load
document.addEventListener("DOMContentLoaded", function() {
  renderBackpackUI();
});
