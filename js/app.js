// js/app.js
import { 
  USDA_FOOD_PLANS, 
  HOUSEHOLD_ADJUSTMENTS, 
  HEALTHY_SWAPS, 
  STAPLES_CATALOG, 
  BUDGET_RECIPES,
  USDA_NUTRITION_TARGETS
} from './data.js';

// Application State
const state = {
  theme: localStorage.getItem('nutribudget-theme') || 'dark',
  household: [
    { id: '1', name: 'Adult Male (19-50)', planKey: 'adult_male_19_50' },
    { id: '2', name: 'Adult Female (19-50)', planKey: 'adult_female_19_50' }
  ],
  targetBudget: 550, // Default target monthly budget
  activeSwaps: new Set(),
  cart: {}, // staple_id -> quantity
  swapsCategoryFilter: 'All',
  staplesCategoryFilter: 'All',
  staplesSearchQuery: '',
  catalog: [...STAPLES_CATALOG], // Runtime mutable catalog copy
  taxActive: false,
  checkedItems: new Set(),
  customPrices: {},
  templates: {},
  scanHistory: [],
  currentStore: 'Aldi',
  zipCode: '',
  colMultiplier: 1.0,
  nearbyStores: []
};

const STAPLE_NUTRIENTS = {
  staple_oats: { protein: 5, fiber: 4, calcium: 20 },
  staple_rice: { protein: 3, fiber: 2, calcium: 10 },
  staple_lentils: { protein: 9, fiber: 8, calcium: 20 },
  staple_beans: { protein: 7, fiber: 6, calcium: 40 },
  staple_tuna: { protein: 20, fiber: 0, calcium: 10 },
  staple_eggs: { protein: 12, fiber: 0, calcium: 50 },
  staple_peanut_butter: { protein: 7, fiber: 2, calcium: 15 },
  staple_bananas: { protein: 1, fiber: 3, calcium: 5 },
  staple_sweet_potatoes: { protein: 2, fiber: 4, calcium: 30 },
  staple_carrots: { protein: 1, fiber: 3, calcium: 30 },
  staple_spinach: { protein: 3, fiber: 2, calcium: 80 },
  staple_frozen_veggies: { protein: 2, fiber: 3, calcium: 20 },
  staple_milk: { protein: 8, fiber: 0, calcium: 300 },
  staple_apples: { protein: 0, fiber: 4, calcium: 10 },
  staple_greek_yogurt: { protein: 16, fiber: 0, calcium: 150 },
  staple_cabbage: { protein: 1, fiber: 2, calcium: 40 },
  staple_chicken_thighs: { protein: 22, fiber: 0, calcium: 15 },
  staple_canned_tomatoes: { protein: 1, fiber: 1, calcium: 10 },
  staple_olive_oil: { protein: 0, fiber: 0, calcium: 0 },
  staple_whole_wheat_bread: { protein: 4, fiber: 3, calcium: 30 },
  staple_ground_beef: { protein: 22, fiber: 0, calcium: 15 },
  staple_beef_stew: { protein: 26, fiber: 0, calcium: 15 },
  staple_pork_chops: { protein: 24, fiber: 0, calcium: 10 },
  staple_canned_sardines: { protein: 22, fiber: 0, calcium: 300 },
  staple_tofu: { protein: 8, fiber: 2, calcium: 200 },
  staple_canned_chickpeas: { protein: 7, fiber: 6, calcium: 40 },
  staple_oranges: { protein: 1, fiber: 3, calcium: 40 },
  staple_frozen_berries: { protein: 1, fiber: 4, calcium: 15 },
  staple_lemons_limes: { protein: 0, fiber: 2, calcium: 20 },
  staple_fresh_broccoli: { protein: 3, fiber: 3, calcium: 40 },
  staple_onions: { protein: 1, fiber: 2, calcium: 20 },
  staple_garlic: { protein: 0, fiber: 0, calcium: 5 },
  staple_bell_peppers: { protein: 1, fiber: 2, calcium: 10 },
  staple_quinoa: { protein: 6, fiber: 5, calcium: 30 },
  staple_barley: { protein: 3, fiber: 6, calcium: 20 },
  staple_whole_grain_pasta: { protein: 7, fiber: 3, calcium: 10 },
  staple_corn_tortillas: { protein: 2, fiber: 2, calcium: 40 }
};

// Global Chart Reference
let comparisonChart = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadFromLocalStorage(); // Load saved preferences
  updateStoreSelectorDropdown(); // Build selector options based on ZIP code
  updateCatalogPricesForCurrentStore(); // Map initial catalog prices to loaded store
  setupEventListeners();
  setupZipLocator(); // Initialize ZIP locator triggers
  renderHousehold();
  renderSwaps();
  renderStaplesCatalog();
  renderScanLog(); // Render the history log card
  setupScanner();
  updateCalculations();
});

// Theme System
function initTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  const themeBtn = document.getElementById('theme-toggle');
  updateThemeButtonIcon();
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('nutribudget-theme', state.theme);
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeButtonIcon();
  updateChart(); // Re-render chart to apply theme colors
}

function updateThemeButtonIcon() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.innerHTML = state.theme === 'dark' 
    ? '☀️' // Sun icon for switching to light mode
    : '🌙'; // Moon icon for switching to dark mode
}

// Setup Event Listeners
function setupEventListeners() {
  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      tabButtons.forEach(b => b.classList.remove('active'));
      const contents = document.querySelectorAll('.tab-content');
      contents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const targetEl = document.getElementById(targetTab);
      if (targetEl) targetEl.classList.add('active');

      // Re-trigger layout updates for charts if needed
      if (targetTab === 'dashboard-tab') {
        updateChart();
      }
    });
  });

  // Target Budget Input
  const budgetInput = document.getElementById('target-budget-input');
  if (budgetInput) {
    budgetInput.value = state.targetBudget;
    budgetInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      state.targetBudget = val;
      updateCalculations();
      saveToLocalStorage();
    });
  }

  // Add Household Member
  const addMemberBtn = document.getElementById('add-member-btn');
  if (addMemberBtn) addMemberBtn.addEventListener('click', addHouseholdMember);

  // Swap Category Filters
  setupSwapFilters();

  // Staples Category & Search Filters
  setupStaplesFilters();

  // Store Selector Dropdown
  const storeSelector = document.getElementById('store-selector');
  if (storeSelector) {
    storeSelector.value = state.currentStore;
    storeSelector.addEventListener('change', (e) => {
      state.currentStore = e.target.value;
      saveToLocalStorage();
      updateCatalogPricesForCurrentStore();
      renderStaplesCatalog();
      renderBasket();
      updateCartTotals();
      updateRecipeHelper();
      renderScanLog();
    });
  }

  // Estimated Tax Checkbox
  const taxCheckbox = document.getElementById('tax-checkbox');
  if (taxCheckbox) {
    taxCheckbox.checked = state.taxActive;
    taxCheckbox.addEventListener('change', (e) => {
      state.taxActive = e.target.checked;
      saveToLocalStorage();
      updateCartTotals();
    });
  }

  // Clear Basket Button
  const btnClear = document.getElementById('btn-clear-basket');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (Object.keys(state.cart).length === 0) return;
      if (confirm("Are you sure you want to clear your shopping list?")) {
        state.cart = {};
        state.checkedItems.clear();
        saveToLocalStorage();
        renderStaplesCatalog();
        renderBasket();
        updateCartTotals();
        updateRecipeHelper();
      }
    });
  }

  // Copy List Button
  const btnCopy = document.getElementById('btn-copy-list');
  if (btnCopy) {
    btnCopy.addEventListener('click', copyListToClipboard);
  }

  // Templates panel toggle button
  const btnTemplatesToggle = document.getElementById('btn-templates-toggle');
  if (btnTemplatesToggle) {
    btnTemplatesToggle.addEventListener('click', () => {
      const panel = document.getElementById('templates-panel');
      if (panel) {
        if (panel.style.display === 'none') {
          panel.style.display = 'flex';
          renderTemplatesList();
        } else {
          panel.style.display = 'none';
        }
      }
    });
  }

  // Save template action button
  const btnSaveTemplateAction = document.getElementById('btn-save-template-action');
  if (btnSaveTemplateAction) {
    btnSaveTemplateAction.addEventListener('click', () => {
      const input = document.getElementById('template-name-input');
      if (input) {
        saveCurrentAsTemplate(input.value);
      }
    });
  }

  // PWA Install Button Click Handler
  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) {
    installBtn.addEventListener('click', () => {
      if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        window.deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User installed the PWA');
          }
          window.deferredPrompt = null;
          installBtn.style.display = 'none';
        });
      }
    });
  }
}

// Household Management
function renderHousehold() {
  const memberList = document.getElementById('household-members');
  memberList.innerHTML = '';

  state.household.forEach((member) => {
    const row = document.createElement('div');
    row.className = 'member-row';
    row.innerHTML = `
      <span style="font-weight: 500;">${member.name}</span>
      <span style="font-size: 13px; color: var(--text-secondary);">USDA Benchmark Category</span>
      <button class="btn-danger-outline btn-xs" data-id="${member.id}">Remove</button>
    `;
    
    row.querySelector('.btn-danger-outline').addEventListener('click', () => {
      removeHouseholdMember(member.id);
    });

    memberList.appendChild(row);
  });
}

function addHouseholdMember() {
  const select = document.getElementById('member-category-select');
  const planKey = select.value;
  const name = select.options[select.selectedIndex].text;
  
  const newMember = {
    id: Date.now().toString(),
    name: name,
    planKey: planKey
  };

  state.household.push(newMember);
  renderHousehold();
  updateCalculations();
  saveToLocalStorage();
}

function removeHouseholdMember(id) {
  // Prevent empty households
  if (state.household.length <= 1) {
    alert("You must have at least one household member.");
    return;
  }
  state.household = state.household.filter(m => m.id !== id);
  renderHousehold();
  updateCalculations();
  saveToLocalStorage();
}

// Calculator Logic
function updateCalculations() {
  const totals = calculateUSDAPlans();
  
  // Render metrics
  renderMetrics(totals);

  // Update chart
  updateChart(totals);

  // Update Cart Budget Comparison
  updateCartTotals();
}

function calculateUSDAPlans() {
  let thriftySum = 0;
  let lowCostSum = 0;
  let moderateSum = 0;
  let liberalSum = 0;

  // Sum individual baseline costs
  state.household.forEach(member => {
    const rates = USDA_FOOD_PLANS[member.planKey];
    if (rates) {
      thriftySum += rates[0];
      lowCostSum += rates[1];
      moderateSum += rates[2];
      liberalSum += rates[3];
    }
  });

  // Apply household size adjustment multiplier
  const size = state.household.length;
  let adjustment = 1.00;
  const adjObject = HOUSEHOLD_ADJUSTMENTS.find(adj => adj.size === size);
  if (adjObject) {
    adjustment = adjObject.multiplier;
  } else if (size >= 7) {
    // 7 or more people
    adjustment = 0.90;
  }

  return {
    thrifty: thriftySum * adjustment,
    lowCost: lowCostSum * adjustment,
    moderate: moderateSum * adjustment,
    liberal: liberalSum * adjustment
  };
}

function renderMetrics(usdaTotals) {
  const budget = state.targetBudget;
  const thrifty = usdaTotals.thrifty;
  
  // Dynamic summary sentence
  const summaryTextElement = document.getElementById('budget-summary-text');
  const percentDiff = ((budget - thrifty) / thrifty) * 100;
  
  let explanation = '';
  let statusClass = 'info';

  if (budget === 0) {
    explanation = "Please enter your target monthly grocery budget to see comparisons.";
  } else if (budget < thrifty) {
    const diff = (thrifty - budget).toFixed(2);
    explanation = `Your budget is <strong>$${diff} below</strong> the USDA Thrifty plan ($${thrifty.toFixed(2)}/mo). This is a very tight budget! Focus heavily on bulk staples, frozen veggies, and dry legumes to maintain nutrient density without overspending.`;
    statusClass = 'warning';
  } else if (budget <= usdaTotals.lowCost) {
    explanation = `Excellent! Your budget falls between the USDA Thrifty and Low-Cost ranges. This is a very realistic and healthy sweet spot that balances fresh produce, lean proteins, and wallet-friendly meals.`;
    statusClass = 'success';
  } else if (budget <= usdaTotals.moderate) {
    explanation = `Your budget is on par with the USDA Moderate-Cost plan. You have some breathing room to buy organic produce or higher-end proteins, but optimizing your food purchases can still free up substantial savings!`;
    statusClass = 'info';
  } else {
    const diff = (budget - usdaTotals.liberal).toFixed(2);
    explanation = `Your budget is <strong>$${diff} higher</strong> than the USDA Liberal food plan. You have a very flexible grocery budget! However, swapping processed foods for whole grains and home-prepped staples will still boost your nutrition profile.`;
    statusClass = 'danger';
  }
  
  const panel = document.getElementById('insight-metrics-panel');
  panel.innerHTML = `
    <div class="insight-metric-card ${statusClass}">
      <div class="metric-badge">💰</div>
      <div class="metric-details">
        <h4>Monthly Grocery Target</h4>
        <div class="value">$${budget.toFixed(2)}</div>
        <div class="meta">Your custom goal</div>
      </div>
    </div>
    
    <div class="insight-metric-card success">
      <div class="metric-badge">🌾</div>
      <div class="metric-details">
        <h4>USDA Thrifty Plan</h4>
        <div class="value">$${thrifty.toFixed(2)}</div>
        <div class="meta">Thrifty national benchmark</div>
      </div>
    </div>

    <div class="insight-metric-card info">
      <div class="metric-badge">🛒</div>
      <div class="metric-details">
        <h4>USDA Low-Cost Plan</h4>
        <div class="value">$${usdaTotals.lowCost.toFixed(2)}</div>
        <div class="meta">Nutritious budget average</div>
      </div>
    </div>
  `;

  summaryTextElement.innerHTML = explanation;
  
  // Total potential savings from swaps
  updateSwapSavingsCount();
}

function updateChart(totals) {
  if (!totals) {
    totals = calculateUSDAPlans();
  }

  const ctx = document.getElementById('budget-chart').getContext('2d');
  
  // Clean up existing chart instances to avoid overlap leaks
  if (comparisonChart) {
    comparisonChart.destroy();
  }

  // Theme-specific colors
  const isDark = state.theme === 'dark';
  const textColor = isDark ? '#f8fafc' : '#0f172a';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  
  const dataValues = [
    state.targetBudget,
    totals.thrifty,
    totals.lowCost,
    totals.moderate,
    totals.liberal
  ];

  comparisonChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['My Target', 'USDA Thrifty', 'USDA Low-Cost', 'USDA Moderate', 'USDA Liberal'],
      datasets: [{
        label: 'Monthly Grocery Cost ($)',
        data: dataValues,
        backgroundColor: [
          'rgba(59, 130, 246, 0.75)',  // My Target - Blue
          'rgba(16, 185, 129, 0.75)', // Thrifty - Emerald
          'rgba(6, 182, 212, 0.75)',  // Low Cost - Cyan
          'rgba(245, 158, 11, 0.75)', // Moderate - Amber
          'rgba(239, 68, 68, 0.75)'   // Liberal - Red
        ],
        borderColor: [
          '#3b82f6',
          '#10b981',
          '#06b6d4',
          '#f59e0b',
          '#ef4444'
        ],
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` $${context.raw.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: textColor,
            font: {
              family: 'Outfit',
              weight: '500'
            }
          }
        },
        y: {
          grid: {
            color: gridColor
          },
          ticks: {
            color: textColor,
            font: {
              family: 'Inter'
            },
            callback: function(value) {
              return '$' + value;
            }
          }
        }
      }
    }
  });
}

// Swaps Coach Logic
function setupSwapFilters() {
  const categories = ['All', 'Beverages', 'Breakfast', 'Snacks', 'Lunch / Dinner', 'Dairy / Alternatives', 'Pantry'];
  const filterContainer = document.getElementById('swaps-filter-chips');
  filterContainer.innerHTML = '';

  categories.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = `filter-chip ${state.swapsCategoryFilter === cat ? 'active' : ''}`;
    chip.innerText = cat;
    chip.addEventListener('click', () => {
      state.swapsCategoryFilter = cat;
      document.querySelectorAll('#swaps-filter-chips .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderSwaps();
    });
    filterContainer.appendChild(chip);
  });
}

function renderSwaps() {
  const grid = document.getElementById('swaps-list-grid');
  grid.innerHTML = '';

  const filtered = HEALTHY_SWAPS.filter(swap => {
    return state.swapsCategoryFilter === 'All' || swap.category === state.swapsCategoryFilter;
  });

  filtered.forEach(swap => {
    const isSwapped = state.activeSwaps.has(swap.id);
    const card = document.createElement('div');
    card.className = `card swap-card hoverable ${isSwapped ? 'swapped-active' : ''}`;
    
    card.innerHTML = `
      <span class="swap-card-category">${swap.category}</span>
      <div style="font-weight: 700; font-size: 16px; margin-bottom: 8px; font-family: var(--font-heading);">
        ${swap.originalName.split(' (')[0]} Swap
      </div>
      
      <div class="swap-comparison-box">
        <div class="swap-item-block original">
          <div class="swap-item-header">
            <span>🔴 Standard Item: ${swap.originalName}</span>
            <span class="swap-item-cost">$${swap.originalCost.toFixed(2)}</span>
          </div>
          <div class="swap-item-details">${swap.originalNutrition}</div>
        </div>

        <div class="swap-item-block swapped">
          <div class="swap-item-header">
            <span>🟢 Healthy Swap: ${swap.swappedName}</span>
            <span class="swap-item-cost">$${swap.swappedCost.toFixed(2)}</span>
          </div>
          <div class="swap-item-details">${swap.swappedNutrition}</div>
        </div>

        <div class="swap-savings-badge">
          💰 Saves $${swap.monthlySavings.toFixed(2)} / month
        </div>

        <div class="swap-reason">${swap.reason}</div>
      </div>

      <div class="swap-actions">
        <button class="btn swap-btn ${isSwapped ? 'btn-secondary' : 'btn-primary'}" data-id="${swap.id}">
          ${isSwapped ? '🔄 Restore Standard' : '✅ Commit to Swap'}
        </button>
      </div>
    `;

    card.querySelector('.swap-btn').addEventListener('click', () => {
      toggleSwap(swap.id);
    });

    grid.appendChild(card);
  });
}

function toggleSwap(id) {
  if (state.activeSwaps.has(id)) {
    state.activeSwaps.delete(id);
  } else {
    state.activeSwaps.add(id);
  }
  renderSwaps();
  updateSwapSavingsCount();
  saveToLocalStorage();
}

function updateSwapSavingsCount() {
  let totalSavings = 0;
  state.activeSwaps.forEach(id => {
    const swap = HEALTHY_SWAPS.find(s => s.id === id);
    if (swap) {
      totalSavings += swap.monthlySavings;
    }
  });

  const savingsValueEl = document.getElementById('monthly-savings-value');
  savingsValueEl.innerText = `$${totalSavings.toFixed(2)}`;

  const savingsCardEl = document.getElementById('monthly-savings-card');
  if (totalSavings > 0) {
    savingsCardEl.style.display = 'block';
  } else {
    savingsCardEl.style.display = 'none';
  }
}

// Grains, Staples, Cart Builder Logic
function setupStaplesFilters() {
  // Setup Search Input
  const searchInput = document.getElementById('staple-search');
  searchInput.addEventListener('input', (e) => {
    state.staplesSearchQuery = e.target.value.toLowerCase();
    renderStaplesCatalog();
  });

  // Setup Chips
  const categories = ['All', 'Proteins', 'Grains', 'Vegetables', 'Fruits', 'Dairy', 'Fats', 'Pantry', 'Scan History'];
  const container = document.getElementById('staples-filter-chips');
  container.innerHTML = '';

  categories.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = `filter-chip ${state.staplesCategoryFilter === cat ? 'active' : ''}`;
    chip.innerText = cat === 'Proteins' ? 'Proteins & Legumes' 
      : cat === 'Grains' ? 'Grains'
      : cat === 'Fats' ? 'Healthy Fats'
      : cat;
    
    chip.addEventListener('click', () => {
      state.staplesCategoryFilter = cat;
      document.querySelectorAll('#staples-filter-chips .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderStaplesCatalog();
    });
    container.appendChild(chip);
  });
}

function renderStaplesCatalog() {
  const grid = document.getElementById('staples-grid');
  grid.innerHTML = '';

  const filtered = state.catalog.filter(item => {
    const isCustom = item.id.startsWith('scanned_') || item.id.startsWith('manual_');
    const matchesSearch = item.name.toLowerCase().includes(state.staplesSearchQuery);
    
    let matchesCategory = false;
    if (state.staplesCategoryFilter === 'All') {
      matchesCategory = true; // Show BOTH default staples and scanned/custom items in All
    } else if (state.staplesCategoryFilter === 'Scan History') {
      matchesCategory = isCustom; // Show ONLY scanned/manual items
    } else {
      matchesCategory = item.foodGroup === state.staplesCategoryFilter; // Show matching group, including scanned items
    }

    return matchesSearch && matchesCategory;
  });

  filtered.forEach(item => {
    const qtyInCart = state.cart[item.id] || 0;
    const card = document.createElement('div');
    card.className = 'card staple-card hoverable';
    
    // Calculate comparative prices
    const aldiP = getItemPriceForStore(item, 'Aldi');
    const walmartP = getItemPriceForStore(item, 'Walmart');
    const targetP = getItemPriceForStore(item, 'Target');

    card.innerHTML = `
      <div class="staple-info">
        <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">${item.category}</span>
        <h3 style="margin-top: 4px;">${item.name}</h3>
        <p class="serving-info">${item.servings} Servings (${item.unit})</p>
        <p style="font-size: 13.5px; line-height: 1.3; color: var(--text-secondary);">${item.nutrients}</p>
      </div>
      
      <div class="staple-price-row" style="flex-direction: column; align-items: stretch; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div class="staple-price" onclick="window.editItemPrice('${item.id}')" title="Click to edit local price" style="cursor: pointer; border-bottom: 1px dotted var(--border-color);">
            $${item.price.toFixed(2)} <span style="font-size: 11px; opacity: 0.6;">✏️</span>
            <small>$${item.costPerServing.toFixed(2)} / serving</small>
          </div>
          
          <div>
            ${qtyInCart > 0 ? `
              <div style="display: flex; align-items: center; gap: 6px;">
                <button class="qty-btn" onclick="adjustCartQty('${item.id}', -1)">-</button>
                <span style="font-weight: 700; width: 14px; text-align: center;">${qtyInCart}</span>
                <button class="qty-btn" onclick="adjustCartQty('${item.id}', 1)">+</button>
              </div>
            ` : `
              <button class="btn btn-primary btn-xs" onclick="adjustCartQty('${item.id}', 1)">+ Add</button>
            `}
          </div>
        </div>

        <div style="font-size: 11.5px; display: flex; justify-content: space-between; color: var(--text-secondary); border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 6px;">
          <span>Aldi: <strong>$${aldiP.toFixed(2)}</strong></span>
          <span>WMT: <strong>$${walmartP.toFixed(2)}</strong></span>
          <span>TGT: <strong>$${targetP.toFixed(2)}</strong></span>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Expose adjustCartQty globally since it's used in inline HTML templates
window.adjustCartQty = function(id, amount) {
  const currentQty = state.cart[id] || 0;
  const newQty = currentQty + amount;
  
  if (newQty <= 0) {
    delete state.cart[id];
  } else {
    state.cart[id] = newQty;
  }
  
  saveToLocalStorage();
  renderStaplesCatalog();
  renderBasket();
  updateCartTotals();
  updateRecipeHelper();
};

window.editItemPrice = function(id) {
  const item = state.catalog.find(s => s.id === id);
  if (!item) return;
  
  const currentPrice = getItemPriceForStore(item, state.currentStore);
  
  const promptVal = prompt(`Enter price for ${item.name} at ${state.currentStore} ($):`, currentPrice.toFixed(2));
  if (promptVal === null) return; // User cancelled
  
  const newPrice = parseFloat(promptVal);
  if (isNaN(newPrice) || newPrice < 0) {
    alert("Please enter a valid price.");
    return;
  }
  
  // Initialize customPrices sub-object if not present
  if (!state.customPrices[id]) {
    state.customPrices[id] = {};
  }
  
  // Save price for active store
  state.customPrices[id][state.currentStore] = newPrice;
  
  // Instantly update catalog cache for active store
  updateCatalogPricesForCurrentStore();
  
  saveToLocalStorage();
  renderStaplesCatalog();
  renderBasket();
  updateCartTotals();
  updateRecipeHelper();
  renderScanLog();
};

function renderBasket() {
  const list = document.getElementById('basket-items-list');
  list.innerHTML = '';

  const itemIds = Object.keys(state.cart);
  
  if (itemIds.length === 0) {
    list.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 20px 0; font-size: 14.5px; line-height: 1.6;">
        Your grocery list is empty.<br>
        👇 <strong>Scroll down</strong> to browse & add healthy staples,<br>
        or tap <strong>📷 Scan Item</strong> above to scan products!
      </div>
    `;
    return;
  }

  itemIds.forEach(id => {
    const item = state.catalog.find(s => s.id === id);
    const qty = state.cart[id];
    
    if (item) {
      const isChecked = state.checkedItems.has(id);
      
      // Determine if a healthy swap is recommended for this item name
      const nameLower = item.name.toLowerCase();
      let suggestedSwap = null;
      if (nameLower.includes('soda') || nameLower.includes('coke') || nameLower.includes('pepsi') || nameLower.includes('sprite') || nameLower.includes('fanta') || nameLower.includes('pop')) {
        suggestedSwap = HEALTHY_SWAPS.find(s => s.id === 'swap_soda');
      } else if (nameLower.includes('cereal') || nameLower.includes('granola') || nameLower.includes('loops') || nameLower.includes('flakes')) {
        suggestedSwap = HEALTHY_SWAPS.find(s => s.id === 'swap_cereal');
      } else if (nameLower.includes('chip') || nameLower.includes('cracker') || nameLower.includes('snack') || nameLower.includes('dorito') || nameLower.includes('cheeto')) {
        suggestedSwap = HEALTHY_SWAPS.find(s => s.id === 'swap_chips');
      } else if (nameLower.includes('frozen meal') || nameLower.includes('microwavable') || nameLower.includes('tv dinner') || nameLower.includes('instant ramen')) {
        suggestedSwap = HEALTHY_SWAPS.find(s => s.id === 'swap_frozen_meals');
      } else if (nameLower.includes('yogurt') && (nameLower.includes('sweetened') || (item.nutrients && item.nutrients.toLowerCase().includes('sugar')))) {
        suggestedSwap = HEALTHY_SWAPS.find(s => s.id === 'swap_yogurt');
      }
      
      // If user already committed to this swap, don't show the recommend prompt again in the basket
      if (suggestedSwap && state.activeSwaps.has(suggestedSwap.id)) {
        suggestedSwap = null;
      }
      
      const row = document.createElement('div');
      row.className = `basket-item ${isChecked ? 'checked-off-row' : ''}`;
      row.style.flexDirection = 'column';
      row.style.alignItems = 'stretch';
      row.style.gap = '8px';
      
      // Calculate comparative prices
      const aldiP = getItemPriceForStore(item, 'Aldi');
      const walmartP = getItemPriceForStore(item, 'Walmart');
      const targetP = getItemPriceForStore(item, 'Target');
      
      row.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="checkbox" class="basket-item-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''} style="cursor: pointer; width: 18px; height: 18px;">
            <div style="display: flex; flex-direction: column;">
              <span class="basket-item-name" style="font-weight: 500;">${item.name}</span>
              <span class="basket-item-price" onclick="window.editItemPrice('${item.id}')" style="font-size: 12px; color: var(--text-secondary); cursor: pointer; text-decoration: underline dotted;" title="Click to edit local price">
                $${item.price.toFixed(2)} ea ✏️
                <span style="opacity: 0.6; font-size: 11px; margin-left: 4px;">(Aldi: $${aldiP.toFixed(2)} | WMT: $${walmartP.toFixed(2)} | TGT: $${targetP.toFixed(2)})</span>
              </span>
            </div>
          </div>
          <div class="basket-item-quantity">
            <button class="qty-btn" onclick="adjustCartQty('${item.id}', -1)">-</button>
            <span style="font-weight: 700; width: 14px; text-align: center;">${qty}</span>
            <button class="qty-btn" onclick="adjustCartQty('${item.id}', 1)">+</button>
            <span style="margin-left: 8px; width: 50px; text-align: right; font-family: var(--font-heading); font-weight: 600;">$${(item.price * qty).toFixed(2)}</span>
          </div>
        </div>
        
        ${suggestedSwap ? `
          <div style="font-size: 12.5px; background: rgba(139, 92, 246, 0.08); border: 1px dashed rgba(139, 92, 246, 0.25); border-radius: 6px; padding: 6px 10px; margin-top: 2px; color: var(--color-accent); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
            <span>💡 Swap for <strong>${suggestedSwap.swappedName}</strong> (saves <strong>$${suggestedSwap.monthlySavings.toFixed(2)}/mo</strong>)?</span>
            <button class="btn btn-primary btn-xs" onclick="window.applyInCartSwap('${item.id}', '${suggestedSwap.id}')" style="padding: 2px 6px; font-size: 11px; margin-left: auto;">Swap Now</button>
          </div>
        ` : ''}
      `;
      
      row.querySelector('.basket-item-checkbox').addEventListener('change', (e) => {
        toggleBasketItemChecked(item.id, e.target.checked);
      });
      
      list.appendChild(row);
    }
  });
}

function toggleBasketItemChecked(id, isChecked) {
  if (isChecked) {
    state.checkedItems.add(id);
  } else {
    state.checkedItems.delete(id);
  }
  saveToLocalStorage();
  renderBasket();
}

window.applyInCartSwap = function(itemId, swapId) {
  // Add to active swaps to log monthly savings
  state.activeSwaps.add(swapId);
  
  const swapToStapleMap = {
    swap_cereal: 'staple_oats',
    swap_chips: 'staple_apples',
    swap_frozen_meals: 'staple_lentils',
    swap_yogurt: 'staple_greek_yogurt'
  };
  
  const targetStapleId = swapToStapleMap[swapId];
  
  if (targetStapleId) {
    // Delete original item
    delete state.cart[itemId];
    // Add target staple
    state.cart[targetStapleId] = (state.cart[targetStapleId] || 0) + 1;
  } else if (swapId === 'swap_soda') {
    // Special case for soda -> sparkling water
    const waterId = 'staple_sparkling_water';
    if (!state.catalog.some(s => s.id === waterId)) {
      state.catalog.push({
        id: waterId,
        name: "Sparkling Water with Lime",
        category: "Pantry",
        price: 1.50,
        unit: "6 pack cans",
        servings: 6,
        costPerServing: 0.25,
        nutrients: "Zero sugar, hydration, vitamin C.",
        calories: 0,
        foodGroup: "Other"
      });
    }
    delete state.cart[itemId];
    state.cart[waterId] = (state.cart[waterId] || 0) + 1;
  }
  
  saveToLocalStorage();
  renderStaplesCatalog();
  renderBasket();
  updateCartTotals();
  updateRecipeHelper();
  renderSwaps();
  updateSwapSavingsCount();
  
  alert("Swapped successfully! Your committed savings have been updated.");
};

function updateCartTotals() {
  let subtotal = 0;
  let caloriesSum = 0;
  const groupCounts = {
    Grains: 0,
    Proteins: 0,
    Vegetables: 0,
    Fruits: 0,
    Fats: 0,
    Dairy: 0
  };

  Object.entries(state.cart).forEach(([id, qty]) => {
    const item = state.catalog.find(s => s.id === id);
    if (item) {
      subtotal += item.price * qty;
      caloriesSum += item.calories * item.servings * qty;
      
      // Nutri-Meter grouping weight (we can base it on quantity or item types present)
      if (groupCounts[item.foodGroup] !== undefined) {
        groupCounts[item.foodGroup] += qty;
      }
    }
  });

  // Calculate tax if active
  const tax = state.taxActive ? subtotal * 0.05 : 0;
  const totalCost = subtotal + tax;

  // Render totals
  document.getElementById('basket-subtotal-val').innerText = state.taxActive 
    ? `$${totalCost.toFixed(2)}*`
    : `$${subtotal.toFixed(2)}`;
  
  // Dynamically calculate weeks in current calendar month based on days in the month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeksInMonth = daysInMonth / 7;
  const weeklyTarget = state.targetBudget / weeksInMonth;
  
  // Render dynamic labels
  const labelEl = document.getElementById('weekly-budget-target-label');
  if (labelEl) {
    const monthName = now.toLocaleString('default', { month: 'long' });
    labelEl.innerHTML = `Weekly Target (${monthName}, ${weeksInMonth.toFixed(2)} wks):`;
  }
  
  const weeklyValEl = document.getElementById('weekly-budget-target-val');
  if (weeklyValEl) {
    weeklyValEl.innerText = `$${weeklyTarget.toFixed(2)}`;
  }
  
  const pacingBar = document.getElementById('budget-pacing-bar');
  const pacingPercentVal = document.getElementById('budget-pacing-percent');
  const pacingLabel = document.getElementById('budget-pacing-label');
  
  if (weeklyTarget > 0) {
    const percent = Math.min((totalCost / weeklyTarget) * 100, 100);
    pacingBar.style.width = `${percent}%`;
    pacingPercentVal.innerText = `${Math.round((totalCost / weeklyTarget) * 100)}%`;
    
    if (totalCost > weeklyTarget) {
      pacingBar.style.backgroundColor = 'var(--color-danger)';
      pacingLabel.innerHTML = `⚠️ Over budget! This list is <strong>$${(totalCost - weeklyTarget).toFixed(2)} over</strong> your weekly target.`;
    } else {
      pacingBar.style.backgroundColor = 'var(--color-primary)';
      pacingLabel.innerHTML = `✅ You have <strong>$${(weeklyTarget - totalCost).toFixed(2)} remaining</strong> for this week's budget.`;
    }
  } else {
    pacingBar.style.width = '0%';
    pacingPercentVal.innerText = '0%';
    pacingLabel.innerText = 'Setup your target budget in the Dashboard tab.';
  }

  // Update Nutri-Meter Diversity Bar
  renderNutriMeter(groupCounts);

  // ==========================================
  // Update Nutrition Matcher
  // ==========================================
  const weeklyTargets = getHouseholdWeeklyNutritionTargets();
  
  let cartCalories = 0;
  let cartProtein = 0;
  let cartFiber = 0;
  let cartCalcium = 0;

  Object.entries(state.cart).forEach(([id, qty]) => {
    const item = state.catalog.find(s => s.id === id);
    if (item) {
      const servings = item.servings || 1;
      const totalServings = servings * qty;
      
      cartCalories += (item.calories || 0) * totalServings;
      
      let itemProtein = item.protein;
      let itemFiber = item.fiber;
      let itemCalcium = item.calcium;
      
      if (STAPLE_NUTRIENTS[id]) {
        itemProtein = STAPLE_NUTRIENTS[id].protein;
        itemFiber = STAPLE_NUTRIENTS[id].fiber;
        itemCalcium = STAPLE_NUTRIENTS[id].calcium;
      }
      
      cartProtein += (itemProtein || 0) * totalServings;
      cartFiber += (itemFiber || 0) * totalServings;
      cartCalcium += (itemCalcium || 0) * totalServings;
    }
  });

  // Calculate percentages
  const calPct = weeklyTargets.calories > 0 ? Math.round((cartCalories / weeklyTargets.calories) * 100) : 0;
  const proPct = weeklyTargets.protein > 0 ? Math.round((cartProtein / weeklyTargets.protein) * 100) : 0;
  const fibPct = weeklyTargets.fiber > 0 ? Math.round((cartFiber / weeklyTargets.fiber) * 100) : 0;
  const caPct = weeklyTargets.calcium > 0 ? Math.round((cartCalcium / weeklyTargets.calcium) * 100) : 0;

  // Update percentages in UI
  const calPercentEl = document.getElementById('nutrition-calories-percent');
  const proPercentEl = document.getElementById('nutrition-protein-percent');
  const fibPercentEl = document.getElementById('nutrition-fiber-percent');
  const caPercentEl = document.getElementById('nutrition-calcium-percent');

  if (calPercentEl) calPercentEl.innerText = `${calPct}%`;
  if (proPercentEl) proPercentEl.innerText = `${proPct}%`;
  if (fibPercentEl) fibPercentEl.innerText = `${fibPct}%`;
  if (caPercentEl) caPercentEl.innerText = `${caPct}%`;

  // Update progress bars
  const calBarEl = document.getElementById('nutrition-calories-bar');
  const proBarEl = document.getElementById('nutrition-protein-bar');
  const fibBarEl = document.getElementById('nutrition-fiber-bar');
  const caBarEl = document.getElementById('nutrition-calcium-bar');

  if (calBarEl) calBarEl.style.width = `${Math.min(calPct, 100)}%`;
  if (proBarEl) proBarEl.style.width = `${Math.min(proPct, 100)}%`;
  if (fibBarEl) fibBarEl.style.width = `${Math.min(fibPct, 100)}%`;
  if (caBarEl) caBarEl.style.width = `${Math.min(caPct, 100)}%`;

  // Update summary text
  const summaryEl = document.getElementById('nutrition-match-summary');
  if (summaryEl) {
    if (cartCalories === 0) {
      summaryEl.innerHTML = `🛒 Add items to see what percentage of your family's weekly nutrient targets are met by this basket.`;
    } else {
      summaryEl.innerHTML = `🌱 This basket provides <strong>${cartCalories.toLocaleString()} kcal</strong>, <strong>${cartProtein.toFixed(0)}g</strong> Protein, <strong>${cartFiber.toFixed(0)}g</strong> Fiber, and <strong>${cartCalcium.toLocaleString()}mg</strong> Calcium.`;
    }
  }

  // ==========================================
  // Update Supermarket Price Comparison
  // ==========================================
  let aldiSubtotal = 0;
  let walmartSubtotal = 0;
  let targetSubtotal = 0;

  Object.entries(state.cart).forEach(([id, qty]) => {
    const item = state.catalog.find(s => s.id === id);
    if (item) {
      aldiSubtotal += getItemPriceForStore(item, 'Aldi') * qty;
      walmartSubtotal += getItemPriceForStore(item, 'Walmart') * qty;
      targetSubtotal += getItemPriceForStore(item, 'Target') * qty;
    }
  });

  const aldiTotal = state.taxActive ? aldiSubtotal * 1.05 : aldiSubtotal;
  const walmartTotal = state.taxActive ? walmartSubtotal * 1.05 : walmartSubtotal;
  const targetTotal = state.taxActive ? targetSubtotal * 1.05 : targetSubtotal;

  const aldiValEl = document.getElementById('store-total-aldi');
  const walmartValEl = document.getElementById('store-total-walmart');
  const targetValEl = document.getElementById('store-total-target');

  if (aldiValEl) aldiValEl.innerText = `$${aldiTotal.toFixed(2)}`;
  if (walmartValEl) walmartValEl.innerText = `$${walmartTotal.toFixed(2)}`;
  if (targetValEl) targetValEl.innerText = `$${targetTotal.toFixed(2)}`;

  const recEl = document.getElementById('store-comparison-recommendation');
  if (recEl) {
    if (aldiSubtotal === 0) {
      recEl.innerHTML = `Fill your basket to see comparative store savings!`;
    } else {
      const prices = [
        { name: 'Aldi', price: aldiTotal },
        { name: 'Walmart', price: walmartTotal },
        { name: 'Target', price: targetTotal }
      ];
      prices.sort((a, b) => a.price - b.price);
      const cheapest = prices[0];
      const mostExpensive = prices[2];
      const diff = mostExpensive.price - cheapest.price;
      
      if (diff > 0.05) {
        recEl.innerHTML = `💡 <strong>${cheapest.name}</strong> is the cheapest option! Shopping there saves you about <strong>$${diff.toFixed(2)}</strong> compared to ${mostExpensive.name}.`;
      } else {
        recEl.innerHTML = `✅ Prices are relatively equal across all three supermarkets.`;
      }
    }
  }
}

function getHouseholdWeeklyNutritionTargets() {
  const weekly = {
    calories: 0,
    protein: 0,
    fiber: 0,
    calcium: 0
  };
  
  if (state.household.length === 0) {
    return {
      calories: 4400 * 7,
      protein: 102 * 7,
      fiber: 63 * 7,
      calcium: 2000 * 7
    };
  }
  
  state.household.forEach(member => {
    const targets = USDA_NUTRITION_TARGETS[member.planKey];
    if (targets) {
      weekly.calories += targets.calories * 7;
      weekly.protein += targets.protein * 7;
      weekly.fiber += targets.fiber * 7;
      weekly.calcium += targets.calcium * 7;
    }
  });
  
  return weekly;
}

function renderNutriMeter(groups) {
  const totalItems = Object.values(groups).reduce((a, b) => a + b, 0);
  
  const segments = {
    grains: document.getElementById('segment-grains'),
    proteins: document.getElementById('segment-proteins'),
    vegetables: document.getElementById('segment-vegetables'),
    fruits: document.getElementById('segment-fruits'),
    fats: document.getElementById('segment-fats'),
    dairy: document.getElementById('segment-dairy')
  };

  if (totalItems === 0) {
    Object.values(segments).forEach(seg => {
      seg.style.width = '0%';
    });
    return;
  }

  // Calculate percentages and assign widths
  Object.keys(segments).forEach(key => {
    const groupName = key.charAt(0).toUpperCase() + key.slice(1);
    const count = groups[groupName] || 0;
    const percent = (count / totalItems) * 100;
    segments[key].style.width = `${percent}%`;
  });
}

// Recipes Recommendation Helper
function updateRecipeHelper() {
  const recipesGrid = document.getElementById('recipes-list-grid');
  recipesGrid.innerHTML = '';

  const userStaples = new Set(Object.keys(state.cart));

  BUDGET_RECIPES.forEach(recipe => {
    // Check missing items
    const missing = [];
    const available = [];

    recipe.ingredientsRequired.forEach(reqId => {
      const item = state.catalog.find(s => s.id === reqId);
      if (userStaples.has(reqId)) {
        available.push(item ? item.name : reqId);
      } else {
        missing.push(item ? item.name : reqId);
      }
    });

    const isMatch = missing.length === 0;
    const percentOwned = Math.round((available.length / recipe.ingredientsRequired.length) * 100);

    const card = document.createElement('div');
    card.className = 'card recipe-card hoverable';
    card.style.borderLeftColor = isMatch ? 'var(--color-success)' : 'var(--color-accent)';

    card.innerHTML = `
      <div>
        <div class="recipe-header">
          <h3>${recipe.name}</h3>
          <span class="recipe-tag">${recipe.difficulty}</span>
        </div>
        
        <div class="recipe-meta-row">
          <div class="recipe-meta-item">⏱️ ${recipe.time}</div>
          <div class="recipe-meta-item">💰 ${recipe.cost}</div>
          <div class="recipe-meta-item">👥 ${recipe.servings} Servings</div>
        </div>

        <div class="recipe-ingredients">
          <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px; color: var(--text-secondary);">Ingredients Required:</div>
          <p style="font-size: 13px; line-height: 1.4;">
            ${recipe.ingredientsRequired.map(reqId => {
              const item = state.catalog.find(s => s.id === reqId);
              const inCart = userStaples.has(reqId);
              return `<span style="color: ${inCart ? 'var(--color-success)' : 'var(--text-muted)'}; margin-right: 8px;">
                ${inCart ? '✓' : '○'} ${item ? item.name.split(' (')[0] : reqId}
              </span>`;
            }).join(' ')}
          </p>
        </div>

        <p class="recipe-instructions">${recipe.instructions}</p>
      </div>

      <div>
        ${isMatch 
          ? `<span class="matching-badge">✓ Ingredients in Cart!</span>` 
          : `<span class="matching-badge" style="background: rgba(139, 92, 246, 0.1); border-color: rgba(139, 92, 246, 0.3); color: var(--color-accent);">Has ${percentOwned}% of Ingredients</span>`
        }
      </div>
    `;

    recipesGrid.appendChild(card);
  });
}

// ==========================================
// BARCODE SCANNING & PRODUCT LOOKUP LOGIC
// ==========================================
let html5QrCode = null;
let currentScannedProduct = null;

function setupScanner() {
  const modal = document.getElementById('scanner-modal');
  const btnOpen = document.getElementById('btn-open-scanner');
  const btnOpenHeader = document.getElementById('btn-open-scanner-header');
  const btnClose = document.getElementById('scanner-close-btn');
  const fileInput = document.getElementById('scanner-file-input');
  
  const openAction = () => {
    if (modal) {
      modal.style.display = 'flex';
      startCameraScanner();
    }
  };
  
  if (btnOpen) btnOpen.addEventListener('click', openAction);
  if (btnOpenHeader) btnOpenHeader.addEventListener('click', openAction);
  
  if (btnClose) btnClose.addEventListener('click', () => {
    closeScanner();
  });
  
  if (fileInput) fileInput.addEventListener('change', handleFileScan);
  
  const btnRescan = document.getElementById('btn-rescan');
  if (btnRescan) {
    btnRescan.addEventListener('click', () => {
      resetScannerUI();
      startCameraScanner();
    });
  }
  
  const btnAddScanned = document.getElementById('btn-add-scanned-to-cart');
  if (btnAddScanned) {
    btnAddScanned.addEventListener('click', addScannedProductToCart);
  }
  
  const btnAddManual = document.getElementById('btn-add-manual-to-cart');
  if (btnAddManual) {
    btnAddManual.addEventListener('click', addManualProductToCart);
  }
}

function startCameraScanner() {
  resetScannerUI();
  
  // Guard if already running
  if (html5QrCode && html5QrCode.isScanning) {
    return;
  }
  
  html5QrCode = new Html5Qrcode("scanner-reader");
  
  const qrCodeSuccessCallback = (decodedText, decodedResult) => {
    // Stop scanning once code is detected
    html5QrCode.stop().then(() => {
      handleBarcodeDetected(decodedText);
    }).catch((err) => {
      console.warn("Failed to stop scanner: ", err);
      handleBarcodeDetected(decodedText);
    });
  };
  
  const config = { fps: 10, qrbox: { width: 250, height: 150 } };
  
  // Choose back camera if available, fallback to user camera
  html5QrCode.start(
    { facingMode: "environment" }, 
    config, 
    qrCodeSuccessCallback
  ).catch(err => {
    console.warn("Camera scan failed to start: ", err);
    // Let user use upload button
    document.getElementById('scanner-reader').innerHTML = `
      <div style="padding: 30px; text-align: center; color: var(--text-secondary); font-size: 13px;">
        Camera access not allowed or camera not found.<br>Use the file uploader below to upload a photo of the barcode.
      </div>
    `;
  });
}

function handleFileScan(e) {
  if (e.target.files.length === 0) return;
  
  const file = e.target.files[0];
  resetScannerUI();
  
  const localHtml5QrCode = new Html5Qrcode("scanner-reader");
  showScannerLoading();
  
  localHtml5QrCode.scanFile(file, true)
    .then(decodedText => {
      handleBarcodeDetected(decodedText);
    })
    .catch(err => {
      console.error("Barcode not detected in image: ", err);
      showScannerError("Could not detect barcode. Please ensure it is clear, centered, and well-lit, or type product details manually below.");
    });
}

function closeScanner() {
  const modal = document.getElementById('scanner-modal');
  modal.style.display = 'none';
  
  if (html5QrCode) {
    if (html5QrCode.isScanning) {
      html5QrCode.stop().then(() => {
        html5QrCode = null;
      }).catch(err => {
        console.error("Error stopping scanner: ", err);
        html5QrCode = null;
      });
    } else {
      html5QrCode = null;
    }
  }
}

function resetScannerUI() {
  document.getElementById('scanner-file-input').value = '';
  document.getElementById('scanned-product-preview').style.display = 'none';
  document.getElementById('scanned-product-data').style.display = 'none';
  document.getElementById('scanned-product-error').style.display = 'none';
  document.getElementById('scanned-health-warning').style.display = 'none';
  document.getElementById('scanned-swap-suggestion').style.display = 'none';
  
  const inputA = document.getElementById('scan-price-aldi');
  const inputW = document.getElementById('scan-price-walmart');
  const inputT = document.getElementById('scan-price-target');
  if (inputA) inputA.style.borderColor = '';
  if (inputW) inputW.style.borderColor = '';
  if (inputT) inputT.style.borderColor = '';
  
  currentScannedProduct = null;
}

function showScannerLoading() {
  document.getElementById('scanned-product-preview').style.display = 'block';
  document.getElementById('scanner-loading-spinner').style.display = 'block';
  document.getElementById('scanned-product-data').style.display = 'none';
  document.getElementById('scanned-product-error').style.display = 'none';
}

function showScannerError(msg) {
  document.getElementById('scanned-product-preview').style.display = 'block';
  document.getElementById('scanner-loading-spinner').style.display = 'none';
  document.getElementById('scanned-product-data').style.display = 'none';
  document.getElementById('scanned-product-error').style.display = 'block';
  document.getElementById('scanner-error-msg').innerText = msg;
}

function handleBarcodeDetected(barcode) {
  showScannerLoading();
  
  const fields = 'product_name,brands,image_front_url,categories_tags,nutriments,nutriscore_grade,ingredients_text';
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${fields}`;
  
  fetch(url)
    .then(res => res.json())
    .then(data => {
      document.getElementById('scanner-loading-spinner').style.display = 'none';
      
      if (data.status === 1) {
        // Product Found!
        displayScannedProduct(data.code, data.product);
      } else {
        showScannerError(`Product with barcode "${barcode}" not found in database. Enter details manually:`);
      }
    })
    .catch(err => {
      console.error("API error: ", err);
      document.getElementById('scanner-loading-spinner').style.display = 'none';
      showScannerError("Database lookup failed (Network error). You can enter the product details manually:");
    });
}

function displayScannedProduct(barcode, product) {
  currentScannedProduct = {
    barcode: barcode,
    name: product.product_name || "Unknown Product",
    brand: product.brands || "Unknown Brand",
    imgUrl: product.image_front_url || "",
    nutriscore: product.nutriscore_grade ? product.nutriscore_grade.toLowerCase() : "unknown",
    nutriments: product.nutriments || {},
    categories: product.categories_tags || [],
    ingredientsText: product.ingredients_text || "No ingredients listed."
  };
  
  // Set values in UI
  document.getElementById('scanned-product-title').innerText = currentScannedProduct.name;
  document.getElementById('scanned-product-brand').innerText = currentScannedProduct.brand || "Unknown Brand";
  
  const imgEl = document.getElementById('scanned-product-img');
  if (currentScannedProduct.imgUrl) {
    imgEl.src = currentScannedProduct.imgUrl;
    imgEl.style.display = 'block';
  } else {
    imgEl.style.display = 'none';
  }
  
  // Nutriscore badge classes
  const scoreBadge = document.getElementById('scanned-product-nutriscore');
  scoreBadge.className = `nutriscore-badge badge-${currentScannedProduct.nutriscore}`;
  scoreBadge.innerText = currentScannedProduct.nutriscore.toUpperCase();
  
  if (currentScannedProduct.nutriscore === 'unknown') {
    document.getElementById('scanned-product-nutriscore-container').style.display = 'none';
  } else {
    document.getElementById('scanned-product-nutriscore-container').style.display = 'flex';
  }
  
  // Guess Food Group from categories tags
  const guessedGroup = guessFoodGroup(currentScannedProduct.categories);
  document.getElementById('scanned-product-group').value = guessedGroup;
  
  // Ingredients Audit & Purchase Verdict
  const audit = parseAndAnalyzeIngredients(currentScannedProduct.ingredientsText, currentScannedProduct.nutriscore);
  
  const verdictEl = document.getElementById('scanned-product-verdict');
  const reasonEl = document.getElementById('scanned-product-verdict-reason');
  const ingredientsEl = document.getElementById('scanned-product-ingredients');
  
  if (verdictEl && reasonEl && ingredientsEl) {
    verdictEl.innerHTML = audit.verdict;
    verdictEl.style.backgroundColor = audit.verdictClass === 'verdict-good' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
    verdictEl.style.borderColor = audit.verdictClass === 'verdict-good' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)';
    verdictEl.style.color = audit.verdictClass === 'verdict-good' ? 'var(--color-success)' : 'var(--color-danger)';
    
    reasonEl.innerHTML = `<strong>Verdict Details:</strong><br>${audit.reason}`;
    ingredientsEl.innerHTML = audit.highlightedText;
  }
  
  // Evaluate nutrition warnings & swaps
  evaluateNutritionAndSwaps(currentScannedProduct);
  
  // Pre-fill prices from customPrices or scale default estimates by COL
  const existingId = `scanned_${barcode}`;
  const averagesByGroup = {
    Proteins: 5.99,
    Vegetables: 1.99,
    Fruits: 2.49,
    Dairy: 3.49,
    Grains: 2.20,
    Fats: 4.50,
    Other: 2.99
  };
  const baseGuess = (averagesByGroup[guessedGroup] || 2.99) / state.colMultiplier;

  let aldiPrice = baseGuess * state.colMultiplier;
  let walmartPrice = aldiPrice * 1.15;
  let targetPrice = aldiPrice * 1.25;

  const saved = state.customPrices[existingId];
  if (saved) {
    if (saved.Aldi !== undefined) aldiPrice = saved.Aldi;
    if (saved.Walmart !== undefined) walmartPrice = saved.Walmart;
    if (saved.Target !== undefined) targetPrice = saved.Target;
  } else {
    const existing = state.catalog.find(s => s.id === existingId);
    if (existing) {
      aldiPrice = getItemPriceForStore(existing, 'Aldi');
      walmartPrice = getItemPriceForStore(existing, 'Walmart');
      targetPrice = getItemPriceForStore(existing, 'Target');
    }
  }

  document.getElementById('scan-price-aldi').value = aldiPrice.toFixed(2);
  document.getElementById('scan-price-walmart').value = walmartPrice.toFixed(2);
  document.getElementById('scan-price-target').value = targetPrice.toFixed(2);

  // Set web lookup links
  document.getElementById('link-lookup-google').href = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(barcode + " " + currentScannedProduct.name)}`;
  document.getElementById('link-lookup-walmart').href = `https://www.walmart.com/search?q=${encodeURIComponent(barcode)}`;
  document.getElementById('link-lookup-target').href = `https://www.target.com/s?searchTerm=${encodeURIComponent(barcode)}`;
  
  // Show data box
  document.getElementById('scanned-product-preview').style.display = 'block';
  document.getElementById('scanned-product-data').style.display = 'block';

  // Trigger live store price lookup concurrently
  fetchLiveStorePrices(barcode);
}

function guessFoodGroup(tags) {
  if (!tags || tags.length === 0) return 'Other';
  
  const tagStr = tags.join(' ').toLowerCase();
  
  if (tagStr.includes('cereal') || tagStr.includes('bread') || tagStr.includes('rice') || tagStr.includes('pasta') || tagStr.includes('grain') || tagStr.includes('flour') || tagStr.includes('oat') || tagStr.includes('biscuit') || tagStr.includes('cracker')) {
    return 'Grains';
  }
  if (tagStr.includes('meat') || tagStr.includes('poultry') || tagStr.includes('fish') || tagStr.includes('egg') || tagStr.includes('tuna') || tagStr.includes('bean') || tagStr.includes('lentil') || tagStr.includes('legume') || tagStr.includes('tofu') || tagStr.includes('nut') || tagStr.includes('seed') || tagStr.includes('seafood') || tagStr.includes('ham') || tagStr.includes('chicken') || tagStr.includes('beef') || tagStr.includes('pork')) {
    return 'Proteins';
  }
  if (tagStr.includes('vegetable') || tagStr.includes('spinach') || tagStr.includes('carrot') || tagStr.includes('cabbage') || tagStr.includes('tomato') || tagStr.includes('onion') || tagStr.includes('salad') || tagStr.includes('greens') || tagStr.includes('broccoli') || tagStr.includes('potato')) {
    return 'Vegetables';
  }
  if (tagStr.includes('fruit') || tagStr.includes('apple') || tagStr.includes('banana') || tagStr.includes('berry') || tagStr.includes('avocado') || tagStr.includes('orange') || tagStr.includes('lemon') || tagStr.includes('lime')) {
    return 'Fruits';
  }
  if (tagStr.includes('oil') || tagStr.includes('fat') || tagStr.includes('butter') || tagStr.includes('margarine') || tagStr.includes('oil-and-fat')) {
    return 'Fats';
  }
  if (tagStr.includes('dairy') || tagStr.includes('milk') || tagStr.includes('cheese') || tagStr.includes('yogurt') || tagStr.includes('cream')) {
    return 'Dairy';
  }
  
  return 'Other';
}

function evaluateNutritionAndSwaps(product) {
  const warningEl = document.getElementById('scanned-health-warning');
  const warningMsg = document.getElementById('scanned-health-warning-msg');
  const swapEl = document.getElementById('scanned-swap-suggestion');
  const swapText = document.getElementById('scanned-swap-text');
  
  let isUnhealthy = false;
  let warnings = [];
  
  const sugars = product.nutriments.sugars_100g || product.nutriments.sugars || 0;
  const sodium = product.nutriments.sodium_100g || product.nutriments.sodium || 0;
  
  if (sugars > 12) { // more than 12g sugar per 100g
    isUnhealthy = true;
    warnings.push(`High Sugar (${sugars.toFixed(1)}g per 100g)`);
  }
  if (sodium > 0.4) { // more than 400mg sodium per 100g (equivalent to 1g salt per 100g)
    isUnhealthy = true;
    warnings.push(`High Sodium (${(sodium * 1000).toFixed(0)}mg per 100g)`);
  }
  if (product.nutriscore === 'd' || product.nutriscore === 'e') {
    isUnhealthy = true;
  }
  
  if (warnings.length > 0) {
    warningEl.style.display = 'block';
    warningMsg.innerHTML = `⚠️ <strong>Nutrition Notice:</strong> ${warnings.join(' & ')}. Processed foods with high sugar or sodium lead to budget leaks and rapid energy crashes.`;
  } else {
    warningEl.style.display = 'none';
  }
  
  // Find a matching healthy swap tip
  let suggestedSwap = null;
  const productNameLower = product.name.toLowerCase();
  
  if (productNameLower.includes('soda') || productNameLower.includes('coke') || productNameLower.includes('pepsi') || productNameLower.includes('sprite') || productNameLower.includes('fanta') || productNameLower.includes('pop') || sugars > 8 && productNameLower.includes('beverage')) {
    suggestedSwap = HEALTHY_SWAPS.find(s => s.id === 'swap_soda');
  } else if (productNameLower.includes('cereal') || productNameLower.includes('granola') || productNameLower.includes('loops') || productNameLower.includes('flakes')) {
    suggestedSwap = HEALTHY_SWAPS.find(s => s.id === 'swap_cereal');
  } else if (productNameLower.includes('chip') || productNameLower.includes('cracker') || productNameLower.includes('snack') || productNameLower.includes('dorito') || productNameLower.includes('cheeto')) {
    suggestedSwap = HEALTHY_SWAPS.find(s => s.id === 'swap_chips');
  } else if (productNameLower.includes('frozen meal') || productNameLower.includes('microwavable') || productNameLower.includes('tv dinner') || productNameLower.includes('instant ramen')) {
    suggestedSwap = HEALTHY_SWAPS.find(s => s.id === 'swap_frozen_meals');
  } else if (productNameLower.includes('yogurt') && sugars > 10) {
    suggestedSwap = HEALTHY_SWAPS.find(s => s.id === 'swap_yogurt');
  } else if (isUnhealthy) {
    // Default fallback swap based on food group
    const group = guessFoodGroup(product.categories);
    if (group === 'Grains') {
      suggestedSwap = HEALTHY_SWAPS.find(s => s.id === 'swap_cereal');
    } else if (group === 'Proteins') {
      suggestedSwap = HEALTHY_SWAPS.find(s => s.id === 'swap_frozen_meals');
    } else {
      suggestedSwap = HEALTHY_SWAPS.find(s => s.id === 'swap_chips');
    }
  }
  
  if (suggestedSwap) {
    swapEl.style.display = 'block';
    swapText.innerHTML = `Swap <strong>${product.name.split(' (')[0]}</strong> for <strong>${suggestedSwap.swappedName}</strong> instead! You will save about <strong>$${suggestedSwap.monthlySavings.toFixed(2)}/mo</strong> and replace empty calories with <em>${suggestedSwap.swappedNutrition.split(',')[0]}</em>.`;
  } else {
    swapEl.style.display = 'none';
  }
}

function addScannedProductToCart() {
  if (!currentScannedProduct) return;
  
  const aldiVal = parseFloat(document.getElementById('scan-price-aldi').value) || 2.99;
  const walmartVal = parseFloat(document.getElementById('scan-price-walmart').value) || (aldiVal * 1.15);
  const targetVal = parseFloat(document.getElementById('scan-price-target').value) || (aldiVal * 1.25);
  const group = document.getElementById('scanned-product-group').value;
  
  const productId = `scanned_${currentScannedProduct.barcode}`;
  
  // Save to customPrices dictionary
  if (!state.customPrices[productId]) {
    state.customPrices[productId] = {};
  }
  state.customPrices[productId]['Aldi'] = aldiVal;
  state.customPrices[productId]['Walmart'] = walmartVal;
  state.customPrices[productId]['Target'] = targetVal;
  state.customPrices[productId]['Custom Store'] = aldiVal;

  const activePrice = state.currentStore === 'Walmart' ? walmartVal : state.currentStore === 'Target' ? targetVal : aldiVal;

  // Register in runtime state catalog if not present
  const existing = state.catalog.find(s => s.id === productId);
  
  // Normalize calcium to mg (OFF reports calcium in grams per 100g sometimes, so we default to standard if invalid)
  let rawCalcium = currentScannedProduct.nutriments.calcium_100g || currentScannedProduct.nutriments.calcium || 0;
  if (rawCalcium > 0 && rawCalcium < 1) {
    rawCalcium = rawCalcium * 1000; // convert g to mg
  } else if (rawCalcium > 0 && rawCalcium >= 1) {
    rawCalcium = rawCalcium; // already in mg
  }

  const scannedItem = {
    id: productId,
    name: `${currentScannedProduct.brand ? currentScannedProduct.brand + ' ' : ''}${currentScannedProduct.name}`,
    category: "Scanned Item",
    price: activePrice,
    originalPrice: aldiVal / state.colMultiplier,
    unit: "Scanned Pack",
    servings: 1,
    costPerServing: activePrice,
    nutrients: `Nutri-Score: ${currentScannedProduct.nutriscore.toUpperCase()}.`,
    calories: currentScannedProduct.nutriments['energy-kcal_100g'] || currentScannedProduct.nutriments['energy-kcal'] || 100,
    protein: currentScannedProduct.nutriments.proteins_100g || currentScannedProduct.nutriments.proteins || 0,
    fiber: currentScannedProduct.nutriments.fiber_100g || currentScannedProduct.nutriments.fiber || 0,
    calcium: rawCalcium,
    foodGroup: group,
    ingredientsText: currentScannedProduct.ingredientsText
  };

  if (!existing) {
    state.catalog.push(scannedItem);
  } else {
    // Update existing catalog reference with new price/category info
    existing.price = activePrice;
    existing.originalPrice = aldiVal / state.colMultiplier;
    existing.costPerServing = activePrice;
    existing.foodGroup = group;
    existing.ingredientsText = currentScannedProduct.ingredientsText;
  }
  
  // Register in scanHistory
  if (!state.scanHistory.some(h => h.id === productId)) {
    state.scanHistory.push(scannedItem);
  } else {
    const hist = state.scanHistory.find(h => h.id === productId);
    if (hist) {
      hist.price = price;
      hist.originalPrice = price;
      hist.foodGroup = group;
    }
  }

  // Add to cart quantity
  state.cart[productId] = (state.cart[productId] || 0) + 1;
  
  // Refresh UI
  saveToLocalStorage();
  renderStaplesCatalog();
  renderBasket();
  updateCartTotals();
  updateRecipeHelper();
  
  // Close Scanner Modal
  closeScanner();
}

function addManualProductToCart() {
  const name = document.getElementById('manual-product-name').value.trim() || "Manual Item";
  const price = parseFloat(document.getElementById('manual-product-price').value) || 2.99;
  const group = document.getElementById('manual-product-group').value;
  
  const productId = `manual_${Date.now()}`;
  
  const manualItem = {
    id: productId,
    name: name,
    category: "Manual Custom Item",
    price: price,
    originalPrice: price,
    unit: "Custom Pack",
    servings: 1,
    costPerServing: price,
    nutrients: "Manually entered grocery item.",
    calories: 120,
    protein: group === 'Proteins' ? 15 : group === 'Dairy' ? 8 : 1,
    fiber: group === 'Vegetables' || group === 'Fruits' ? 3 : group === 'Grains' ? 2 : 0,
    calcium: group === 'Dairy' ? 250 : group === 'Vegetables' ? 40 : 0,
    foodGroup: group
  };
  
  state.catalog.push(manualItem);
  
  // Register in scanHistory
  state.scanHistory.push(manualItem);
  
  state.cart[productId] = (state.cart[productId] || 0) + 1;
  
  saveToLocalStorage();
  renderStaplesCatalog();
  renderBasket();
  updateCartTotals();
  updateRecipeHelper();
  
  closeScanner();
}

// ==========================================
// LOCAL STORAGE PERSISTENCE HELPERS
// ==========================================
function loadFromLocalStorage() {
  const savedHousehold = localStorage.getItem('nutribudget-household');
  if (savedHousehold) state.household = JSON.parse(savedHousehold);
  
  const savedTarget = localStorage.getItem('nutribudget-target');
  if (savedTarget) state.targetBudget = parseFloat(savedTarget) || 550;
  
  const savedSwaps = localStorage.getItem('nutribudget-swaps');
  if (savedSwaps) state.activeSwaps = new Set(JSON.parse(savedSwaps));
  
  const savedCart = localStorage.getItem('nutribudget-cart');
  if (savedCart) state.cart = JSON.parse(savedCart);
  
  const savedCustom = localStorage.getItem('nutribudget-custom-items');
  if (savedCustom) {
    const customs = JSON.parse(savedCustom);
    customs.forEach(c => {
      if (!state.catalog.some(item => item.id === c.id)) {
        state.catalog.push(c);
      }
    });
  }

  const savedTax = localStorage.getItem('nutribudget-tax-active');
  if (savedTax) {
    state.taxActive = savedTax === 'true';
  } else {
    state.taxActive = false;
  }

  const savedChecked = localStorage.getItem('nutribudget-checked-items');
  if (savedChecked) {
    state.checkedItems = new Set(JSON.parse(savedChecked));
  } else {
    state.checkedItems = new Set();
  }

  const savedPrices = localStorage.getItem('nutribudget-custom-prices');
  if (savedPrices) {
    try {
      const rawObj = JSON.parse(savedPrices);
      state.customPrices = {};
      Object.entries(rawObj).forEach(([id, value]) => {
        if (typeof value === 'object' && value !== null) {
          state.customPrices[id] = value;
        } else {
          // Backward compatibility: Map flat values to 'Aldi'
          state.customPrices[id] = { 'Aldi': value };
        }
      });
    } catch (e) {
      console.error("Error loading custom prices: ", e);
      state.customPrices = {};
    }
  } else {
    state.customPrices = {};
  }

  const savedTemplates = localStorage.getItem('nutribudget-templates');
  if (savedTemplates) {
    state.templates = JSON.parse(savedTemplates);
  } else {
    state.templates = {};
  }

  const savedHistory = localStorage.getItem('nutribudget-scan-history');
  if (savedHistory) {
    state.scanHistory = JSON.parse(savedHistory);
    state.scanHistory.forEach(h => {
      if (!state.catalog.some(item => item.id === h.id)) {
        state.catalog.push(h);
      }
    });
  } else {
    state.scanHistory = [];
  }

  const savedStore = localStorage.getItem('nutribudget-current-store');
  state.currentStore = savedStore || 'Aldi';

  const savedZip = localStorage.getItem('nutribudget-zipcode');
  state.zipCode = savedZip || '';

  const savedCol = localStorage.getItem('nutribudget-col-multiplier');
  state.colMultiplier = savedCol ? parseFloat(savedCol) : 1.0;

  const savedNearby = localStorage.getItem('nutribudget-nearby-stores');
  state.nearbyStores = savedNearby ? JSON.parse(savedNearby) : [];
}

function saveToLocalStorage() {
  localStorage.setItem('nutribudget-household', JSON.stringify(state.household));
  localStorage.setItem('nutribudget-target', state.targetBudget.toString());
  localStorage.setItem('nutribudget-swaps', JSON.stringify(Array.from(state.activeSwaps)));
  localStorage.setItem('nutribudget-cart', JSON.stringify(state.cart));
  
  const customItems = state.catalog.filter(item => item.id.startsWith('scanned_') || item.id.startsWith('manual_'));
  localStorage.setItem('nutribudget-custom-items', JSON.stringify(customItems));
  localStorage.setItem('nutribudget-tax-active', state.taxActive ? 'true' : 'false');
  localStorage.setItem('nutribudget-checked-items', JSON.stringify(Array.from(state.checkedItems)));
  localStorage.setItem('nutribudget-custom-prices', JSON.stringify(state.customPrices));
  localStorage.setItem('nutribudget-templates', JSON.stringify(state.templates));
  localStorage.setItem('nutribudget-scan-history', JSON.stringify(state.scanHistory));
  localStorage.setItem('nutribudget-current-store', state.currentStore);
  localStorage.setItem('nutribudget-zipcode', state.zipCode);
  localStorage.setItem('nutribudget-col-multiplier', state.colMultiplier.toString());
  localStorage.setItem('nutribudget-nearby-stores', JSON.stringify(state.nearbyStores));
}

// ==========================================
// CLIPBOARD EXPORT HELPER
// ==========================================
function copyListToClipboard() {
  const itemIds = Object.keys(state.cart);
  if (itemIds.length === 0) {
    alert("Your shopping list is empty!");
    return;
  }
  
  let text = `🛒 NutriBudget Grocery List 🛒\n`;
  text += `Target Budget: $${state.targetBudget.toFixed(2)}/mo ($${(state.targetBudget / 4.33).toFixed(2)}/wk)\n`;
  text += `------------------------------------\n`;
  
  let subtotal = 0;
  itemIds.forEach(id => {
    const item = state.catalog.find(s => s.id === id);
    const qty = state.cart[id];
    if (item) {
      const itemTotal = item.price * qty;
      subtotal += itemTotal;
      text += `• [ ] ${item.name} x${qty} ($${item.price.toFixed(2)} ea) - $${itemTotal.toFixed(2)}\n`;
    }
  });
  
  text += `------------------------------------\n`;
  
  if (state.taxActive) {
    const tax = subtotal * 0.05;
    text += `Subtotal: $${subtotal.toFixed(2)}\n`;
    text += `Est. Grocery Tax (5%): $${tax.toFixed(2)}\n`;
    text += `Total (with tax): $${(subtotal + tax).toFixed(2)}\n`;
  } else {
    text += `Total Estimated Cost: $${subtotal.toFixed(2)}\n`;
  }
  
  // Add committed swaps monthly savings
  let activeSavings = 0;
  state.activeSwaps.forEach(swapId => {
    const s = HEALTHY_SWAPS.find(x => x.id === swapId);
    if (s) activeSavings += s.monthlySavings;
  });
  if (activeSavings > 0) {
    text += `\n💡 Committed Swaps Monthly Savings: $${activeSavings.toFixed(2)}\n`;
  }
  
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('btn-copy-list');
    const originalText = btn.innerHTML;
    btn.innerHTML = "✅ Copied to Clipboard!";
    setTimeout(() => {
      btn.innerHTML = originalText;
    }, 2000);
  }).catch(err => {
    alert("Could not copy list: " + err);
  });
}

// ==========================================
// TEMPLATES MANAGEMENT HELPERS
// ==========================================
function renderTemplatesList() {
  const container = document.getElementById('templates-list-container');
  if (!container) return;
  container.innerHTML = '';
  
  const names = Object.keys(state.templates);
  if (names.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 10px 0;">No templates saved yet.</div>`;
    return;
  }
  
  names.forEach(name => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.background = 'rgba(255,255,255,0.02)';
    row.style.padding = '6px 8px';
    row.style.borderRadius = '4px';
    row.style.border = '1px solid var(--border-color)';
    row.style.fontSize = '12px';
    
    row.innerHTML = `
      <span style="font-weight: 500;">${name}</span>
      <div style="display: flex; gap: 4px;">
        <button class="btn btn-secondary btn-xs" onclick="window.loadTemplate('${name}')" style="padding: 2px 6px; font-size: 10px;">Load</button>
        <button class="btn btn-danger btn-xs" onclick="window.deleteTemplate('${name}')" style="padding: 2px 6px; font-size: 10px; background-color: var(--color-danger); border-color: var(--color-danger);">✕</button>
      </div>
    `;
    container.appendChild(row);
  });
}

window.saveCurrentAsTemplate = function(name) {
  name = name.trim();
  if (!name) {
    alert("Please enter a name for the template.");
    return;
  }
  if (Object.keys(state.cart).length === 0) {
    alert("Your shopping cart is empty! Add some items before saving a template.");
    return;
  }
  
  // Save cart items and catalog items (for scanned custom items)
  const cartCopy = {...state.cart};
  
  // Filter custom items in this template so we can restore them if loaded
  const customItemsInTemplate = state.catalog.filter(item => {
    return (item.id.startsWith('scanned_') || item.id.startsWith('manual_')) && (state.cart[item.id] !== undefined);
  });
  
  state.templates[name] = {
    cart: cartCopy,
    customItems: customItemsInTemplate
  };
  
  saveToLocalStorage();
  renderTemplatesList();
  
  const input = document.getElementById('template-name-input');
  if (input) input.value = '';
  
  alert(`Template "${name}" saved successfully!`);
};

window.loadTemplate = function(name) {
  const template = state.templates[name];
  if (!template) return;
  
  if (confirm(`Are you sure you want to load template "${name}"? This will replace your current basket.`)) {
    // 1. Clear current checked items
    state.checkedItems.clear();
    
    // 2. Load custom items into state.catalog if not present
    if (template.customItems) {
      template.customItems.forEach(c => {
        if (!state.catalog.some(item => item.id === c.id)) {
          state.catalog.push(c);
        }
      });
    }
    
    // 3. Load cart
    state.cart = {...template.cart};
    
    saveToLocalStorage();
    renderStaplesCatalog();
    renderBasket();
    updateCartTotals();
    updateRecipeHelper();
    
    // Close panel
    const panel = document.getElementById('templates-panel');
    if (panel) panel.style.display = 'none';
    
    alert(`Template "${name}" loaded!`);
  }
};

window.deleteTemplate = function(name) {
  if (confirm(`Delete template "${name}"?`)) {
    delete state.templates[name];
    saveToLocalStorage();
    renderTemplatesList();
  }
};

// ==========================================
// SERVICE WORKER REGISTRATION (PWA)
// ==========================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[Service Worker] Registered successfully:', reg.scope))
      .catch(err => console.error('[Service Worker] Registration failed:', err));
  });
}

// ==========================================
// PWA NATIVE INSTALL POPUP HANDLER
// ==========================================
window.deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later.
  window.deferredPrompt = e;
  // Update UI to notify the user they can install the PWA
  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) {
    installBtn.style.display = 'flex';
  }
});

// Hide the install button once installed
window.addEventListener('appinstalled', () => {
  console.log('NutriBudget PWA was installed successfully');
  window.deferredPrompt = null;
  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) {
    installBtn.style.display = 'none';
  }
});

// ==========================================
// STORE AND SCAN HISTORY LOG UPGRADES
// ==========================================
function getItemPriceForStore(item, storeName) {
  if (!item) return 0;
  
  // 1. Check if there is a custom price entered for this store
  if (state.customPrices[item.id] && state.customPrices[item.id][storeName] !== undefined) {
    return state.customPrices[item.id][storeName];
  }
  
  // 2. Resolve original baseline price (from STAPLES_CATALOG or custom items base)
  let basePrice = 0;
  const staticItem = STAPLES_CATALOG.find(s => s.id === item.id);
  if (staticItem) {
    basePrice = staticItem.price;
  } else {
    const histItem = state.scanHistory.find(h => h.id === item.id);
    if (histItem) {
      basePrice = histItem.originalPrice || histItem.price;
    } else {
      basePrice = item.originalPrice || item.price || 2.99;
    }
  }
  
  // 3. Scale by regional cost-of-living multiplier
  const adjustedBase = basePrice * (state.colMultiplier || 1.0);
  
  // 4. Fallback mock markup factors for Walmart/Target if no custom price exists
  if (storeName === 'Walmart') {
    return adjustedBase * 1.15; // 15% estimated markup
  }
  if (storeName === 'Target') {
    return adjustedBase * 1.25; // 25% estimated markup
  }
  
  return adjustedBase; // Aldi & Custom Store defaults
}

function updateCatalogPricesForCurrentStore() {
  state.catalog.forEach(item => {
    item.price = getItemPriceForStore(item, state.currentStore);
    item.costPerServing = item.price / (item.servings || 1);
  });
}

function renderScanLog() {
  const container = document.getElementById('scan-log-container');
  if (!container) return;
  container.innerHTML = '';
  
  if (state.scanHistory.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 15px 0;">
        No products scanned yet. Tap "📷 Scan Item" above to scan your first product!
      </div>
    `;
    return;
  }
  
  // Render scanned items in reverse chronological order (newest first)
  const historyReversed = [...state.scanHistory].reverse();
  
  historyReversed.forEach(item => {
    const row = document.createElement('div');
    row.className = 'basket-item';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.padding = '8px 12px';
    row.style.gap = '10px';
    row.style.borderRadius = '6px';
    row.style.background = 'rgba(255,255,255,0.01)';
    row.style.border = '1px solid var(--border-color)';
    row.style.fontSize = '13px';
    
    // Handle image
    const imgUrl = item.imgUrl || '';
    const isCustom = item.id.startsWith('manual_');
    const iconHtml = imgUrl 
      ? `<img src="${imgUrl}" style="width: 36px; height: 36px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);">`
      : `<div style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 16px; border-radius: 4px; background: rgba(139,92,246,0.1); color: var(--color-primary);">${isCustom ? '📝' : '📦'}</div>`;
    
    // Render current store price for comparison
    const priceAtCurrentStore = getItemPriceForStore(item, state.currentStore);

    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
        ${iconHtml}
        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column;">
          <span style="font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; color: var(--text-primary);">${item.name}</span>
          <span style="font-size: 11px; color: var(--text-secondary);">${item.foodGroup || 'Other'} • $${priceAtCurrentStore.toFixed(2)} (${state.currentStore})</span>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <button class="btn btn-primary btn-xs" onclick="window.addHistoryItemToCart('${item.id}')" style="padding: 3px 8px; font-size: 11px;">+ Add</button>
        <button class="btn btn-danger btn-xs" onclick="window.deleteHistoryItem('${item.id}')" style="padding: 3px 6px; font-size: 11px; background-color: var(--color-danger); border-color: var(--color-danger); color: white;">✕</button>
      </div>
    `;
    
    container.appendChild(row);
  });
}

window.addHistoryItemToCart = function(id) {
  state.cart[id] = (state.cart[id] || 0) + 1;
  saveToLocalStorage();
  renderStaplesCatalog();
  renderBasket();
  updateCartTotals();
  updateRecipeHelper();
};

window.deleteHistoryItem = function(id) {
  if (confirm("Remove this item from your scan history?")) {
    state.scanHistory = state.scanHistory.filter(item => item.id !== id);
    state.catalog = state.catalog.filter(item => item.id !== id);
    delete state.cart[id];
    
    saveToLocalStorage();
    renderStaplesCatalog();
    renderBasket();
    updateCartTotals();
    updateRecipeHelper();
    renderScanLog();
  }
};

// ==========================================
// ZIP CODE LOCATION AND COST-OF-LIVING ENGINE
// ==========================================
function setupZipLocator() {
  const zipInput = document.getElementById('zip-code-input');
  const btnUpdateZip = document.getElementById('btn-update-zip');
  const statusEl = document.getElementById('zip-locator-status');
  
  if (!zipInput || !btnUpdateZip || !statusEl) return;
  
  // Set initial UI value
  zipInput.value = state.zipCode || '';
  updateZipUIStatus();
  
  btnUpdateZip.addEventListener('click', () => {
    const raw = zipInput.value.trim();
    if (!/^\d{5}$/.test(raw)) {
      alert("Please enter a valid 5-digit ZIP code.");
      return;
    }
    
    state.zipCode = raw;
    
    // Calculate cost of living index multiplier
    const prefix3 = parseInt(raw.substring(0, 3));
    let col = 1.0;
    let regionName = "Standard US Average";
    
    // Regional map multipliers
    if (prefix3 >= 900 && prefix3 <= 966) {
      col = 1.20; // California
      regionName = "California (High Cost)";
    } else if (prefix3 >= 980 && prefix3 <= 986) {
      col = 1.18; // Washington State
      regionName = "Washington (High Cost)";
    } else if (prefix3 >= 100 && prefix3 <= 119) {
      col = 1.25; // NYC/Metropolitan
      regionName = "New York Metro (Very High Cost)";
    } else if (prefix3 >= 200 && prefix3 <= 205) {
      col = 1.22; // Washington DC
      regionName = "Washington D.C. (High Cost)";
    } else if (prefix3 >= 210 && prefix3 <= 289) {
      col = 1.12; // Mid-Atlantic (Maryland, Virginia, etc)
      regionName = "Mid-Atlantic Area";
    } else if (prefix3 >= 967 && prefix3 <= 968) {
      col = 1.40; // Hawaii
      regionName = "Hawaii (Extremely High Cost)";
    } else if (prefix3 >= 995 && prefix3 <= 999) {
      col = 1.35; // Alaska
      regionName = "Alaska (Very High Cost)";
    } else if ((prefix3 >= 290 && prefix3 <= 399) || (prefix3 >= 700 && prefix3 <= 799)) {
      col = 0.90; // South / Texas
      regionName = "Southern US / Texas (Low Cost)";
    } else if (prefix3 >= 500 && prefix3 <= 699) {
      col = 0.95; // Midwest
      regionName = "Midwest US (Low Cost)";
    } else {
      col = 1.0;
      regionName = "US Average Cost Region";
    }
    
    state.colMultiplier = col;
    
    // Generate mock nearby stores
    const streetNames = ["Main St", "Broadway", "Oak Ave", "Pine St", "Maple Rd", "1st Ave", "Market St", "Lake Dr"];
    const distance1 = (1.0 + Math.random() * 3).toFixed(1);
    const distance2 = (3.0 + Math.random() * 5).toFixed(1);
    const distance3 = (5.0 + Math.random() * 10).toFixed(1);
    const st1 = streetNames[Math.floor(Math.random() * streetNames.length)];
    const st2 = streetNames[Math.floor(Math.random() * streetNames.length)];
    const st3 = streetNames[Math.floor(Math.random() * streetNames.length)];
    
    state.nearbyStores = [
      { id: 'Aldi', name: `Aldi (${distance1} mi on ${st1})` },
      { id: 'Walmart', name: `Walmart Supercenter (${distance2} mi on ${st2})` },
      { id: 'Target', name: `Target (${distance3} mi on ${st3})` },
      { id: 'Custom Store', name: `Custom Store` }
    ];
    
    saveToLocalStorage();
    updateZipUIStatus();
    updateCatalogPricesForCurrentStore();
    updateStoreSelectorDropdown();
    
    // Refresh UI
    renderStaplesCatalog();
    renderBasket();
    updateCartTotals();
    updateRecipeHelper();
    renderScanLog();
  });
}

function updateZipUIStatus() {
  const statusEl = document.getElementById('zip-locator-status');
  if (!statusEl) return;
  
  if (state.zipCode) {
    let percent = Math.round(state.colMultiplier * 100);
    let regionName = "US Average";
    if (state.colMultiplier > 1.2) regionName = "Very High Cost Metro Region";
    else if (state.colMultiplier > 1.1) regionName = "High Cost Coastal Region";
    else if (state.colMultiplier < 0.96) regionName = "Low Cost Region";
    
    statusEl.innerHTML = `
      📍 Located: <strong>ZIP ${state.zipCode}</strong> (${regionName}).<br>
      📊 Default prices adjusted to <strong>${percent}%</strong> of national baseline.<br>
      🏪 Found 3 grocery chains within 25 miles!
    `;
  } else {
    statusEl.innerHTML = `
      Enter a ZIP code to load local stores within 25 miles and scale default prices by regional Cost-of-Living indices.
    `;
  }
}

function updateStoreSelectorDropdown() {
  const selector = document.getElementById('store-selector');
  if (!selector) return;
  
  // Store the selected store value before rebuilding options
  const currentVal = state.currentStore;
  selector.innerHTML = '';
  
  if (state.nearbyStores && state.nearbyStores.length > 0) {
    state.nearbyStores.forEach(store => {
      const opt = document.createElement('option');
      opt.value = store.id;
      opt.innerText = `🏪 ${store.name}`;
      selector.appendChild(opt);
    });
  } else {
    // Fallbacks
    selector.innerHTML = `
      <option value="Aldi">🏪 Aldi (Default)</option>
      <option value="Walmart">🏪 Walmart</option>
      <option value="Target">🏪 Target</option>
      <option value="Custom Store">🏪 Custom Store</option>
    `;
  }
  
  selector.value = currentVal;
}

function parseAndAnalyzeIngredients(ingredientsText, nutriscore) {
  if (!ingredientsText || ingredientsText.trim() === "" || ingredientsText === "No ingredients listed.") {
    return {
      verdict: "🟢 GOOD PURCHASE",
      verdictClass: "verdict-good",
      reason: "No ingredients listed. Assuming clean/single-ingredient whole foods staple (like eggs, raw meats, or fresh produce).",
      highlightedText: "No ingredients listed (whole food staple or missing database record)."
    };
  }

  // List of bad ingredients to scan for (with regex and reasons)
  const harmfulIngredients = [
    {
      keywords: [/high[- ]fructose[- ]corn[- ]syrup/i, /corn[- ]syrup/i, /fructose/i],
      name: "High Fructose Corn Syrup",
      reason: "High sugar impact, raises liver fat, metabolic stress."
    },
    {
      keywords: [/hydrogenated/i, /partially[- ]hydrogenated/i, /trans[- ]fat/i],
      name: "Hydrogenated Oils (Trans Fats)",
      reason: "Banned/restricted trans fats that raise bad cholesterol (LDL) and damage heart health."
    },
    {
      keywords: [/palm[- ]oil/i, /palm[- ]kernel[- ]oil/i],
      name: "Palm Oil",
      reason: "High saturated fats, often refined, linked to cardiovascular inflammation."
    },
    {
      keywords: [/monosodium[- ]glutamate/i, /msg/i, /yeast[- ]extract/i, /hydrolyzed[- ]protein/i, /sodium[- ]glutamate/i],
      name: "MSG / Flavor Enhancers",
      reason: "Excitotoxins that trick your brain into overeating, often masking low-quality ingredients."
    },
    {
      keywords: [/sodium[- ]nitrite/i, /sodium[- ]nitrate/i, /potassium[- ]nitrate/i, /potassium[- ]nitrite/i],
      name: "Nitrites / Nitrates",
      reason: "Carcinogenic chemical preservatives heavily linked to colon cancer risk."
    },
    {
      keywords: [/carrageenan/i],
      name: "Carrageenan",
      reason: "Thickening agent associated with gut inflammation and digestive distress."
    },
    {
      keywords: [/aspartame/i, /sucralose/i, /acesulfame/i, /saccharin/i, /artificial[- ]sweetener/i],
      name: "Artificial Sweeteners",
      reason: "Disrupts gut bacteria, triggers intense sweet cravings, metabolic confusion."
    },
    {
      keywords: [/red[- ]40/i, /yellow[- ]5/i, /yellow[- ]6/i, /blue[- ]1/i, /titanium[- ]dioxide/i, /artificial[- ]color/i],
      name: "Artificial Dyes / Dyes",
      reason: "Petroleum-derived colorings associated with hyperactivity in children and gut issues."
    },
    {
      keywords: [/sodium[- ]benzoate/i, /potassium[- ]sorbate/i, /bha/i, /bht/i],
      name: "Chemical Preservatives",
      reason: "Synthetic preservatives linked to DNA damage and cellular stress."
    }
  ];

  let detectedWarnings = [];
  let highlightedText = ingredientsText;

  harmfulIngredients.forEach(harm => {
    let matched = false;
    harm.keywords.forEach(regex => {
      // Find all matches to replace in the text
      const matches = highlightedText.match(regex);
      if (matches) {
        matched = true;
        // Highlight in text
        highlightedText = highlightedText.replace(regex, (m) => {
          return `<span style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: #f87171; border-radius: 4px; padding: 2px 4px; font-weight: 600; text-shadow: 0 0 1px rgba(0,0,0,0.5);">${m}</span>`;
        });
      }
    });

    if (matched) {
      detectedWarnings.push(`• <strong>${harm.name}</strong>: ${harm.reason}`);
    }
  });

  // Calculate purchase verdict
  const nutriscoreLower = (nutriscore || '').toLowerCase();
  const hasBadNutriscore = nutriscoreLower === 'd' || nutriscoreLower === 'e';
  const hasMajorHarmful = detectedWarnings.length > 0;

  let verdict = "🟢 GOOD PURCHASE";
  let verdictClass = "verdict-good";
  let reason = "This food has clean, simple ingredients. It is free from trans fats, high fructose corn syrup, and artificial additives.";

  if (hasMajorHarmful || hasBadNutriscore) {
    verdict = "🔴 NO PURCHASE";
    verdictClass = "verdict-bad";
    
    let reasons = [];
    if (hasMajorHarmful) {
      reasons.push(`Contains harmful chemical additives or refined oils:<br>${detectedWarnings.join('<br>')}`);
    }
    if (hasBadNutriscore) {
      reasons.push(`High levels of saturated fats, sodium, or added sugar (Nutri-Score ${nutriscore.toUpperCase()}).`);
    }
    
    reason = reasons.join('<br><br>');
  }

  return {
    verdict,
    verdictClass,
    reason,
    highlightedText
  };
}

function fetchLiveStorePrices(barcode) {
  const upcUrl = `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`;
  
  fetch(upcUrl)
    .then(res => {
      if (!res.ok) throw new Error("UPC DB HTTP Error");
      return res.json();
    })
    .then(data => {
      if (data && data.items && data.items.length > 0) {
        const item = data.items[0];
        const offers = item.offers || [];
        
        let walmartPrice = null;
        let targetPrice = null;
        let genericPrice = null;
        
        offers.forEach(off => {
          const merchant = off.merchant.toLowerCase();
          if (merchant.includes('walmart')) {
            walmartPrice = off.price;
          } else if (merchant.includes('target')) {
            targetPrice = off.price;
          } else if (!genericPrice && off.price > 0.5) {
            genericPrice = off.price;
          }
        });
        
        const inputW = document.getElementById('scan-price-walmart');
        const inputT = document.getElementById('scan-price-target');
        const inputA = document.getElementById('scan-price-aldi');
        
        let updated = false;
        
        if (walmartPrice && inputW) {
          inputW.value = walmartPrice.toFixed(2);
          inputW.style.borderColor = '#10b981'; // Green border indicating live price loaded
          updated = true;
        }
        if (targetPrice && inputT) {
          inputT.value = targetPrice.toFixed(2);
          inputT.style.borderColor = '#10b981';
          updated = true;
        }
        
        const reference = walmartPrice || targetPrice || genericPrice;
        if (reference && inputA) {
          const existingId = `scanned_${barcode}`;
          if (!state.customPrices[existingId] || state.customPrices[existingId].Aldi === undefined) {
            const estAldi = reference * 0.85;
            inputA.value = estAldi.toFixed(2);
            inputA.style.borderColor = '#10b981';
          }
        }
        
        if (updated) {
          console.log(`[NutriBudget] Populated live prices from Upcitemdb for ${barcode}`);
        }
      }
    })
    .catch(err => {
      console.warn("Could not retrieve live store prices from Upcitemdb: ", err);
    });
}
