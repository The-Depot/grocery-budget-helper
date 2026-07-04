// js/app.js
import { 
  USDA_FOOD_PLANS, 
  HOUSEHOLD_ADJUSTMENTS, 
  HEALTHY_SWAPS, 
  STAPLES_CATALOG, 
  BUDGET_RECIPES 
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
  checkedItems: new Set()
};

// Global Chart Reference
let comparisonChart = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadFromLocalStorage(); // Load saved preferences
  setupEventListeners();
  renderHousehold();
  renderSwaps();
  renderStaplesCatalog();
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
  const categories = ['All', 'Proteins', 'Grains', 'Vegetables', 'Fruits', 'Dairy', 'Fats', 'Pantry'];
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
    // Exclude scanned/manual custom items from the general staples catalog list
    if (item.id.startsWith('scanned_') || item.id.startsWith('manual_')) {
      return false;
    }
    const matchesSearch = item.name.toLowerCase().includes(state.staplesSearchQuery);
    let matchesCategory = false;
    
    if (state.staplesCategoryFilter === 'All') {
      matchesCategory = true;
    } else {
      matchesCategory = item.foodGroup === state.staplesCategoryFilter;
    }

    return matchesSearch && matchesCategory;
  });

  filtered.forEach(item => {
    const qtyInCart = state.cart[item.id] || 0;
    const card = document.createElement('div');
    card.className = 'card staple-card hoverable';
    
    card.innerHTML = `
      <div class="staple-info">
        <span style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">${item.category}</span>
        <h3 style="margin-top: 4px;">${item.name}</h3>
        <p class="serving-info">${item.servings} Servings (${item.unit})</p>
        <p style="font-size: 13.5px; line-height: 1.3; color: var(--text-secondary);">${item.nutrients}</p>
      </div>
      
      <div class="staple-price-row">
        <div class="staple-price">
          $${item.price.toFixed(2)}
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

function renderBasket() {
  const list = document.getElementById('basket-items-list');
  list.innerHTML = '';

  const itemIds = Object.keys(state.cart);
  
  if (itemIds.length === 0) {
    list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px 0; font-size: 14px;">Your grocery list is empty. Add healthy staples to construct your basket.</div>`;
    return;
  }

  itemIds.forEach(id => {
    const item = state.catalog.find(s => s.id === id);
    const qty = state.cart[id];
    
    if (item) {
      const isChecked = state.checkedItems.has(id);
      const row = document.createElement('div');
      row.className = `basket-item ${isChecked ? 'checked-off-row' : ''}`;
      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <input type="checkbox" class="basket-item-checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''} style="cursor: pointer; width: 18px; height: 18px;">
          <span class="basket-item-name" style="font-weight: 500;">${item.name}</span>
        </div>
        <div class="basket-item-quantity">
          <button class="qty-btn" onclick="adjustCartQty('${item.id}', -1)">-</button>
          <span style="font-weight: 700; width: 14px; text-align: center;">${qty}</span>
          <button class="qty-btn" onclick="adjustCartQty('${item.id}', 1)">+</button>
          <span style="margin-left: 8px; width: 50px; text-align: right; font-family: var(--font-heading); font-weight: 600;">$${(item.price * qty).toFixed(2)}</span>
        </div>
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
  
  // Weekly pacing - compare shopping list cost directly to weekly budget target
  const weeklyTarget = state.targetBudget / 4.33; // 4.33 weeks per month average
  document.getElementById('weekly-budget-target-val').innerText = `$${weeklyTarget.toFixed(2)}`;
  
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
  
  const fields = 'product_name,brands,image_front_url,categories_tags,nutriments,nutriscore_grade';
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
    categories: product.categories_tags || []
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
  
  // Evaluate nutrition warnings & swaps
  evaluateNutritionAndSwaps(currentScannedProduct);
  
  // Set default price
  document.getElementById('scanned-product-price').value = "2.99";
  
  // Show data box
  document.getElementById('scanned-product-preview').style.display = 'block';
  document.getElementById('scanned-product-data').style.display = 'block';
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
  
  const price = parseFloat(document.getElementById('scanned-product-price').value) || 2.99;
  const group = document.getElementById('scanned-product-group').value;
  
  const productId = `scanned_${currentScannedProduct.barcode}`;
  
  // Register in runtime state catalog if not present
  const existing = state.catalog.find(s => s.id === productId);
  if (!existing) {
    state.catalog.push({
      id: productId,
      name: `${currentScannedProduct.brand ? currentScannedProduct.brand + ' ' : ''}${currentScannedProduct.name}`,
      category: "Scanned Database Item",
      price: price,
      unit: "Scanned Pack",
      servings: 1,
      costPerServing: price,
      nutrients: `Nutri-Score: ${currentScannedProduct.nutriscore.toUpperCase()}. Evaluated from database.`,
      calories: currentScannedProduct.nutriments['energy-kcal_100g'] || 100,
      foodGroup: group
    });
  } else {
    // Update price if it was changed
    existing.price = price;
    existing.costPerServing = price;
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
  
  state.catalog.push({
    id: productId,
    name: name,
    category: "Manual Custom Item",
    price: price,
    unit: "Custom Pack",
    servings: 1,
    costPerServing: price,
    nutrients: "Manually entered grocery item.",
    calories: 100,
    foodGroup: group
  });
  
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
