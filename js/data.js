// js/data.js

// USDA Food Cost Data - Monthly rates (estimated for 2025/2026 based on official guidelines)
// Values represent the estimated cost for one month.
export const USDA_FOOD_PLANS = {
  // Key represents age group and gender
  // [thrifty, lowCost, moderate, liberal]
  toddler_1_3: [198.50, 235.80, 275.40, 335.20],
  child_4_8: [242.10, 298.50, 355.20, 428.60],
  child_9_11: [288.40, 342.30, 420.70, 508.90],
  teen_male_12_18: [308.20, 385.50, 478.10, 582.40],
  teen_female_12_18: [282.60, 335.10, 402.40, 492.30],
  adult_male_19_50: [309.40, 371.20, 465.80, 566.10],
  adult_female_19_50: [247.20, 323.40, 392.50, 499.20],
  adult_male_51_70: [292.30, 358.10, 442.60, 538.40],
  adult_female_51_70: [242.80, 305.40, 372.10, 468.20],
  senior_male_71: [288.10, 352.40, 435.20, 532.50],
  senior_female_71: [238.40, 298.20, 362.50, 452.10]
};

// USDA Nutritional Targets - Daily values for Calories (kcal), Protein (g), Fiber (g), and Calcium (mg)
export const USDA_NUTRITION_TARGETS = {
  toddler_1_3: { calories: 1000, protein: 13, fiber: 14, calcium: 700 },
  child_4_8: { calories: 1400, protein: 19, fiber: 18, calcium: 1000 },
  child_9_11: { calories: 1800, protein: 34, fiber: 22, calcium: 1300 },
  teen_male_12_18: { calories: 2500, protein: 52, fiber: 31, calcium: 1300 },
  teen_female_12_18: { calories: 2000, protein: 46, fiber: 26, calcium: 1300 },
  adult_male_19_50: { calories: 2400, protein: 56, fiber: 38, calcium: 1000 },
  adult_female_19_50: { calories: 2000, protein: 46, fiber: 25, calcium: 1000 },
  adult_male_51_70: { calories: 2200, protein: 56, fiber: 30, calcium: 1000 },
  adult_female_51_70: { calories: 1800, protein: 46, fiber: 21, calcium: 1200 },
  senior_male_71: { calories: 2000, protein: 56, fiber: 30, calcium: 1200 },
  senior_female_71: { calories: 1600, protein: 46, fiber: 21, calcium: 1200 }
};

// Household size multiplier factors
// 1 person: +20%, 2 people: +10%, 3 people: +5%, 4 people: 0%, 5-6 people: -5%, 7+ people: -10%
export const HOUSEHOLD_ADJUSTMENTS = [
  { size: 1, multiplier: 1.20 },
  { size: 2, multiplier: 1.10 },
  { size: 3, multiplier: 1.05 },
  { size: 4, multiplier: 1.00 },
  { size: 5, multiplier: 0.95 },
  { size: 6, multiplier: 0.95 },
  { size: 7, multiplier: 0.90 } // 7 or more
];

// Healthy Swaps Data
// Format: category, original product info, swapped healthy product info, and details
export const HEALTHY_SWAPS = [
  {
    id: "swap_soda",
    category: "Beverages",
    originalName: "Brand Soda (12-pack)",
    originalCost: 6.99,
    originalNutrition: "High sugar, high fructose corn syrup, artificial colors, 1800 empty calories total.",
    swappedName: "Sparkling Water + Fresh Lime/Lemon",
    swappedCost: 3.99,
    swappedNutrition: "Zero sugar, rich in Vitamin C, natural hydration, 0 calories.",
    monthlySavings: 24.00, // Assumes buying 2 packs a week
    reason: "Soda contributes to insulin spikes and weight gain without providing nutrients. Sparkling water satisfies the carbonation craving with zero sugar and natural citrus flavor."
  },
  {
    id: "swap_cereal",
    category: "Breakfast",
    originalName: "Sugary Cereal Box (15 oz)",
    originalCost: 5.49,
    originalNutrition: "Refined grains, high sugar (12g per serving), low fiber, artificial preservatives.",
    swappedName: "Rolled Oats (32 oz) + Bananas",
    swappedCost: 3.10, // $2.50 oats (half used) + $0.60 banana bunch
    swappedNutrition: "100% whole grain, rich in soluble fiber (beta-glucan), potassium, Vitamin B6, low glycemic index.",
    monthlySavings: 14.36, // Assumes 3 boxes of cereal replaced by bulk oats and bananas
    reason: "Sugary cereal digests quickly, leading to mid-morning energy crashes. Oatmeal releases energy slowly (complex carbs) and provides prebiotic fiber to support gut health."
  },
  {
    id: "swap_chips",
    category: "Snacks",
    originalName: "Flavored Potato Chips (10 oz)",
    originalCost: 4.79,
    originalNutrition: "Saturated fats, high sodium, processed oils, empty calories, low satiety.",
    swappedName: "Carrot Sticks + Hummus",
    swappedCost: 2.80, // $1.10 carrots + $1.70 partial tub hummus
    swappedNutrition: "Beta-carotene (Vitamin A), healthy plant protein, dietary fiber, heart-healthy monounsaturated fats.",
    monthlySavings: 15.92, // Assumes 8 bags per month
    reason: "Chips are calorie-dense but don't fill you up. Carrots and hummus offer a crunchy, satisfying snack with healthy fats and fiber that keep hunger locked down."
  },
  {
    id: "swap_frozen_meals",
    category: "Lunch / Dinner",
    originalName: "Premium Frozen Meals (4 pack)",
    originalCost: 19.96, // $4.99 each
    originalNutrition: "High sodium, chemical emulsifiers, processed meats, small portion size.",
    swappedName: "Meal Prep: Brown Rice, Black Beans & Eggs/Tofu",
    swappedCost: 5.80, // bulk grains and proteins
    swappedNutrition: "Complete plant-protein profile, excellent fiber, vitamins B1 & B6, minerals (iron, magnesium).",
    monthlySavings: 56.64, // Assumes replacing 4 frozen dinners a week
    reason: "Frozen meals are expensive convenience traps loaded with sodium for preservation. Preparing a batch of rice, beans, and simple proteins takes 30 mins, saves huge amounts, and offers clean energy."
  },
  {
    id: "swap_dressing",
    category: "Pantry",
    originalName: "Store-Bought Creamy Ranch Dressing (16 oz)",
    originalCost: 3.99,
    originalNutrition: "Soybean oil base, high sodium, added sugar, MSG, artificial stabilizers.",
    swappedName: "Homemade Olive Oil, Lemon & Garlic Emulsion",
    swappedCost: 1.50, // Pro-rated olive oil and lemon
    swappedNutrition: "Extra virgin healthy fats (oleic acid), polyphenols, fresh enzymes, zero sugar.",
    monthlySavings: 9.96, // Assumes 4 bottles replaced per quarter
    reason: "Commercial dressings turn a healthy salad into a high-calorie processed meal. Extra virgin olive oil and lemon juice supply antioxidants and assist in fat-soluble vitamin absorption (A, D, E, K)."
  },
  {
    id: "swap_energy_drinks",
    category: "Beverages",
    originalName: "Energy Drinks (8 pack)",
    originalCost: 17.99,
    originalNutrition: "Extreme synthetic caffeine, taurine, artificial sweeteners or high sugar, potential heart stress.",
    swappedName: "Organic Green Tea + Dash of Honey",
    swappedCost: 2.50, // bulk tea bags + honey drops
    swappedNutrition: "L-theanine for calm focus, catechins (EGCG) antioxidants, smooth energy, zero crashes.",
    monthlySavings: 61.96, // Assumes replacing 4 packs/month
    reason: "Energy drinks cause heart rate spikes and sleep issues. Green tea contains L-theanine, which works synergistically with caffeine to increase focus without the jittery crash."
  },
  {
    id: "swap_yogurt",
    category: "Dairy / Alternatives",
    originalName: "Sugary Fruit Yogurt Cups (8 pack)",
    originalCost: 7.49,
    originalNutrition: "Added sugar (up to 16g per cup), artificial colorings, low protein.",
    swappedName: "Greek Yogurt (Plain, 32 oz) + Honey & Frozen Berries",
    swappedCost: 4.80, // pro-rated yogurt, honey, frozen fruit
    swappedNutrition: "Double the protein, active probiotics, calcium, antioxidants from berries, natural sweetness.",
    monthlySavings: 10.76, // Assumes replacing 4 packs/month
    reason: "Flavored yogurts are often dessert in disguise. Plain Greek yogurt has excellent protein density and gut-healthy probiotics. You can sweeten it naturally with high-antioxidant berries."
  }
];

// Healthy Staples Catalog (For the Interactive Shopping Basket Builder)
export const STAPLES_CATALOG = [
  {
    id: "staple_oats",
    name: "Rolled Oats (32 oz)",
    category: "Grains & Grains",
    price: 2.50,
    unit: "32 oz container",
    servings: 30,
    costPerServing: 0.08,
    nutrients: "Rich in beta-glucan (cholesterol lowering), complex carbs, iron.",
    calories: 150, // per serving
    foodGroup: "Grains"
  },
  {
    id: "staple_rice",
    name: "Brown Rice (32 oz)",
    category: "Grains & Grains",
    price: 1.80,
    unit: "32 oz bag",
    servings: 20,
    costPerServing: 0.09,
    nutrients: "Magnesium, fiber, selenium, sustained energy.",
    calories: 160,
    foodGroup: "Grains"
  },
  {
    id: "staple_lentils",
    name: "Dry Brown Lentils (16 oz)",
    category: "Proteins & Legumes",
    price: 1.30,
    unit: "16 oz bag",
    servings: 10,
    costPerServing: 0.13,
    nutrients: "Extremely high protein (9g/serving), folate, iron, potassium.",
    calories: 115,
    foodGroup: "Proteins"
  },
  {
    id: "staple_beans",
    name: "Canned Black Beans (15 oz)",
    category: "Proteins & Legumes",
    price: 0.90,
    unit: "15 oz can",
    servings: 3.5,
    costPerServing: 0.26,
    nutrients: "Fiber (7g/serving), protein, anthocyanin antioxidants.",
    calories: 120,
    foodGroup: "Proteins"
  },
  {
    id: "staple_tuna",
    name: "Canned Tuna in Water (5 oz)",
    category: "Proteins & Legumes",
    price: 1.20,
    unit: "5 oz can",
    servings: 2,
    costPerServing: 0.60,
    nutrients: "Lean protein (20g/serving), Omega-3 fatty acids, Vitamin D.",
    calories: 90,
    foodGroup: "Proteins"
  },
  {
    id: "staple_eggs",
    name: "Large Grade A Eggs (Dozen)",
    category: "Proteins & Legumes",
    price: 2.50,
    unit: "12 eggs carton",
    servings: 6, // 2 eggs per serving
    costPerServing: 0.42,
    nutrients: "Complete protein, choline, lutein/zeaxanthin for eye health.",
    calories: 140,
    foodGroup: "Proteins"
  },
  {
    id: "staple_pb",
    name: "Creamy Peanut Butter (16 oz)",
    category: "Healthy Fats & Nuts",
    price: 2.20,
    unit: "16 oz jar",
    servings: 14,
    costPerServing: 0.16,
    nutrients: "Healthy monounsaturated fats, protein, Vitamin E, niacin.",
    calories: 190,
    foodGroup: "Fats"
  },
  {
    id: "staple_bananas",
    name: "Fresh Bananas (Bunch)",
    category: "Fresh Produce",
    price: 1.50,
    unit: "Approx. 2.5 lbs bunch",
    servings: 6,
    costPerServing: 0.25,
    nutrients: "Potassium, Vitamin B6, vitamin C, prebiotic fiber.",
    calories: 105,
    foodGroup: "Fruits"
  },
  {
    id: "staple_sweet_potato",
    name: "Sweet Potatoes (3 lbs)",
    category: "Fresh Produce",
    price: 3.20,
    unit: "3 lb bag",
    servings: 9,
    costPerServing: 0.36,
    nutrients: "Mega dose of Vitamin A (beta-carotene), fiber, Vitamin C.",
    calories: 110,
    foodGroup: "Vegetables"
  },
  {
    id: "staple_carrots",
    name: "Fresh Carrots (1 lb)",
    category: "Fresh Produce",
    price: 1.10,
    unit: "1 lb bag",
    servings: 5,
    costPerServing: 0.22,
    nutrients: "Vitamin A, antioxidants, high fiber, crunchy satiety.",
    calories: 35,
    foodGroup: "Vegetables"
  },
  {
    id: "staple_spinach",
    name: "Frozen Chopped Spinach (10 oz)",
    category: "Fresh Produce",
    price: 1.30,
    unit: "10 oz box",
    servings: 3,
    costPerServing: 0.43,
    nutrients: "Iron, Calcium, Folate, Vitamin K. Highly concentrated nutrients.",
    calories: 30,
    foodGroup: "Vegetables"
  },
  {
    id: "staple_mixed_veg",
    name: "Frozen Mixed Veggies (12 oz)",
    category: "Fresh Produce",
    price: 1.25,
    unit: "12 oz bag",
    servings: 4,
    costPerServing: 0.31,
    nutrients: "Vitamins A & C, fiber, diverse micronutrients (peas, carrots, corn, beans).",
    calories: 60,
    foodGroup: "Vegetables"
  },
  {
    id: "staple_milk",
    name: "Whole Milk (1 Gallon)",
    category: "Dairy & Dairy-Free",
    price: 3.40,
    unit: "1 Gallon",
    servings: 16,
    costPerServing: 0.21,
    nutrients: "Calcium, Vitamin D, high quality protein, fat for children's brain growth.",
    calories: 150,
    foodGroup: "Dairy"
  },
  {
    id: "staple_apples",
    name: "Gala Apples (3 lbs)",
    category: "Fresh Produce",
    price: 3.99,
    unit: "3 lb bag",
    servings: 9,
    costPerServing: 0.44,
    nutrients: "Pectin fiber (supports gut), Vitamin C, antioxidants.",
    calories: 95,
    foodGroup: "Fruits"
  },
  {
    id: "staple_greek_yogurt",
    name: "Plain Greek Yogurt (32 oz)",
    category: "Dairy & Dairy-Free",
    price: 3.80,
    unit: "32 oz tub",
    servings: 5,
    costPerServing: 0.76,
    nutrients: "Calcium, probiotics (good bacteria), extremely high protein (16g/serv).",
    calories: 130,
    foodGroup: "Dairy"
  },
  {
    id: "staple_cabbage",
    name: "Green Cabbage (Head)",
    category: "Fresh Produce",
    price: 1.60,
    unit: "Approx 3 lb head",
    servings: 12,
    costPerServing: 0.13,
    nutrients: "Vitamin C, Vitamin K, glucosinolates (cancer-fighting compounds), budget-king veggie.",
    calories: 25,
    foodGroup: "Vegetables"
  },
  {
    id: "staple_chicken",
    name: "Chicken Breasts (2.5 lbs)",
    category: "Proteins & Legumes",
    price: 8.75, // $3.50/lb
    unit: "2.5 lb pack",
    servings: 10,
    costPerServing: 0.88,
    nutrients: "Lean muscle-building protein (26g/serving), B-Vitamins.",
    calories: 120,
    foodGroup: "Proteins"
  },
  {
    id: "staple_canned_tomatoes",
    name: "Diced Tomatoes (14.5 oz)",
    category: "Pantry",
    price: 1.00,
    unit: "14.5 oz can",
    servings: 3.5,
    costPerServing: 0.28,
    nutrients: "Lycopene (powerful heart-healthy antioxidant), Vitamin C.",
    calories: 25,
    foodGroup: "Vegetables"
  },
  {
    id: "staple_olive_oil",
    name: "Extra Virgin Olive Oil (16 oz)",
    category: "Healthy Fats & Nuts",
    price: 5.99,
    unit: "16 oz bottle",
    servings: 32,
    costPerServing: 0.19,
    nutrients: "Anti-inflammatory monounsaturated fats, Vitamin E, heart-healthy.",
    calories: 120,
    foodGroup: "Fats"
  },
  {
    id: "staple_bread",
    name: "100% Whole Wheat Bread",
    category: "Grains & Grains",
    price: 2.00,
    unit: "20 oz loaf",
    servings: 20,
    costPerServing: 0.10,
    nutrients: "Fiber, B-Vitamins, complex carbohydrates.",
    calories: 70,
    foodGroup: "Grains"
  },
  {
    id: "staple_ground_beef",
    name: "Lean Ground Beef (85/15)",
    category: "Proteins & Legumes",
    price: 4.99,
    unit: "1 lb pack",
    servings: 4,
    costPerServing: 1.25,
    nutrients: "High quality protein, iron, zinc, Vitamin B12 for energy support.",
    calories: 215,
    foodGroup: "Proteins"
  },
  {
    id: "staple_beef_stew",
    name: "Beef Stew Meat",
    category: "Proteins & Legumes",
    price: 5.99,
    unit: "1 lb pack",
    servings: 4,
    costPerServing: 1.50,
    nutrients: "Iron, high protein, rich source of essential amino acids.",
    calories: 190,
    foodGroup: "Proteins"
  },
  {
    id: "staple_pork_chops",
    name: "Center Cut Pork Chops",
    category: "Proteins & Legumes",
    price: 4.50,
    unit: "1.5 lb pack",
    servings: 6,
    costPerServing: 0.75,
    nutrients: "Thiamine (vitamin B1), protein, selenium, zinc.",
    calories: 160,
    foodGroup: "Proteins"
  },
  {
    id: "staple_sardines",
    name: "Canned Sardines in Olive Oil",
    category: "Proteins & Legumes",
    price: 1.10,
    unit: "3.75 oz can",
    servings: 1,
    costPerServing: 1.10,
    nutrients: "Omega-3 fats, calcium (edible bones), Vitamin D, protein.",
    calories: 190,
    foodGroup: "Proteins"
  },
  {
    id: "staple_tofu",
    name: "Organic Firm Tofu",
    category: "Proteins & Legumes",
    price: 1.80,
    unit: "14 oz block",
    servings: 4,
    costPerServing: 0.45,
    nutrients: "Plant-based complete protein, calcium, iron, low saturated fat.",
    calories: 90,
    foodGroup: "Proteins"
  },
  {
    id: "staple_chickpeas",
    name: "Dry Chickpeas (Garbanzo Beans)",
    category: "Proteins & Legumes",
    price: 1.30,
    unit: "16 oz bag",
    servings: 10,
    costPerServing: 0.13,
    nutrients: "Folate, iron, protein, fiber. Excellent budget protein.",
    calories: 120,
    foodGroup: "Proteins"
  },
  {
    id: "staple_oranges",
    name: "Navel Oranges (3 lbs)",
    category: "Fresh Produce",
    price: 3.50,
    unit: "3 lb bag",
    servings: 8,
    costPerServing: 0.44,
    nutrients: "Massive Vitamin C, soluble fiber (pectin), hydration.",
    calories: 60,
    foodGroup: "Fruits"
  },
  {
    id: "staple_frozen_berries",
    name: "Frozen Mixed Berries (12 oz)",
    category: "Fresh Produce",
    price: 2.99,
    unit: "12 oz bag",
    servings: 4,
    costPerServing: 0.75,
    nutrients: "Antioxidants (anthocyanins), Vitamin C, high fiber.",
    calories: 70,
    foodGroup: "Fruits"
  },
  {
    id: "staple_lemons",
    name: "Fresh Lemons (1 lb)",
    category: "Fresh Produce",
    price: 1.50,
    unit: "1 lb bag",
    servings: 5,
    costPerServing: 0.30,
    nutrients: "Citric acid (supports kidney health), Vitamin C, flavoring.",
    calories: 15,
    foodGroup: "Fruits"
  },
  {
    id: "staple_broccoli",
    name: "Fresh Broccoli Crown",
    category: "Fresh Produce",
    price: 1.60,
    unit: "1 lb bunch",
    servings: 3,
    costPerServing: 0.53,
    nutrients: "Sulforaphane, Vitamin K, Vitamin C, folate.",
    calories: 35,
    foodGroup: "Vegetables"
  },
  {
    id: "staple_onions",
    name: "Yellow Onions (3 lbs)",
    category: "Fresh Produce",
    price: 1.99,
    unit: "3 lb bag",
    servings: 10,
    costPerServing: 0.20,
    nutrients: "Quercetin (antioxidant), prebiotic fiber, flavor base.",
    calories: 40,
    foodGroup: "Vegetables"
  },
  {
    id: "staple_garlic",
    name: "Fresh Garlic (3 Heads)",
    category: "Fresh Produce",
    price: 1.20,
    unit: "3 head pack",
    servings: 15,
    costPerServing: 0.08,
    nutrients: "Allicin (supports immune health and blood pressure), flavor booster.",
    calories: 5,
    foodGroup: "Vegetables"
  },
  {
    id: "staple_peppers",
    name: "Bell Peppers (3 Pack)",
    category: "Fresh Produce",
    price: 2.99,
    unit: "3 pepper pack",
    servings: 3,
    costPerServing: 1.00,
    nutrients: "Red/Yellow/Green mix. High Vitamin C (more than oranges), Vitamin A.",
    calories: 30,
    foodGroup: "Vegetables"
  },
  {
    id: "staple_quinoa",
    name: "White Quinoa (16 oz)",
    category: "Grains & Grains",
    price: 2.80,
    unit: "16 oz bag",
    servings: 10,
    costPerServing: 0.28,
    nutrients: "Complete plant protein, manganese, phosphorus, fiber.",
    calories: 170,
    foodGroup: "Grains"
  },
  {
    id: "staple_barley",
    name: "Pearl Barley (16 oz)",
    category: "Grains & Grains",
    price: 1.40,
    unit: "16 oz bag",
    servings: 10,
    costPerServing: 0.14,
    nutrients: "Beta-glucan fiber (excellent for cholesterol), selenium.",
    calories: 160,
    foodGroup: "Grains"
  },
  {
    id: "staple_pasta",
    name: "Whole Wheat Penne Pasta",
    category: "Grains & Grains",
    price: 1.25,
    unit: "16 oz box",
    servings: 8,
    costPerServing: 0.16,
    nutrients: "Iron, fiber, complex carbohydrates for stamina.",
    calories: 180,
    foodGroup: "Grains"
  },
  {
    id: "staple_tortillas",
    name: "Yellow Corn Tortillas (30 ct)",
    category: "Grains & Grains",
    price: 1.80,
    unit: "30 ct pack",
    servings: 10,
    costPerServing: 0.18,
    nutrients: "Low fat, calcium, fiber, whole grain carbohydrate source.",
    calories: 100,
    foodGroup: "Grains"
  }
];

// Budget Friendly Healthy Recipes
// Lists ingredients required by id (mapped to STAPLES_CATALOG) and simple prep instructions
export const BUDGET_RECIPES = [
  {
    name: "Protein-Packed Banana Oatmeal",
    cost: "$0.91 per serving",
    time: "10 mins",
    difficulty: "Easy",
    ingredientsRequired: ["staple_oats", "staple_bananas", "staple_pb", "staple_milk", "staple_eggs"],
    servings: 1,
    instructions: "Boil 1/2 cup rolled oats in whole milk or water. Mash half a banana and stir it in with a pinch of salt. Whisk in an egg during the last 2 minutes of cooking for a custard-like texture and protein boost. Top with a spoonful of peanut butter and remaining banana slices."
  },
  {
    name: "Savory Lentil & Vegetable Soup",
    cost: "$0.56 per serving",
    time: "40 mins",
    difficulty: "Medium",
    ingredientsRequired: ["staple_lentils", "staple_carrots", "staple_spinach", "staple_canned_tomatoes", "staple_olive_oil"],
    servings: 4,
    instructions: "Sauté chopped carrots in olive oil. Add 1 cup dry rinsed lentils, 1 can diced tomatoes, and 4 cups of water/broth. Simmer for 30 minutes until lentils are soft. Stir in frozen chopped spinach at the end and cook for 2 minutes. Season with salt, pepper, and garlic powder."
  },
  {
    name: "Tuna & Black Bean Rice Bowl",
    cost: "$1.12 per serving",
    time: "15 mins",
    difficulty: "Easy",
    ingredientsRequired: ["staple_rice", "staple_beans", "staple_tuna", "staple_cabbage", "staple_olive_oil"],
    servings: 2,
    instructions: "Cook brown rice. Drain and rinse canned black beans, then warm them up. Mix canned tuna with a dash of olive oil, salt, and pepper. Serve rice topped with beans, tuna, and a side of finely shredded crunchy green cabbage."
  },
  {
    name: "Cabbage & Chicken Stir-Fry",
    cost: "$1.45 per serving",
    time: "20 mins",
    difficulty: "Easy",
    ingredientsRequired: ["staple_chicken", "staple_cabbage", "staple_carrots", "staple_olive_oil", "staple_rice"],
    servings: 3,
    instructions: "Cube chicken breast and sauté in olive oil until browned. Slice cabbage and carrots thinly. Add veggies to the pan and stir-fry on high heat for 6-8 minutes until tender-crisp. Serve hot over a bed of steamed brown rice."
  },
  {
    name: "Baked Sweet Potato with Peanut Satay Sauce",
    cost: "$0.65 per serving",
    time: "45 mins",
    difficulty: "Easy",
    ingredientsRequired: ["staple_sweet_potato", "staple_pb", "staple_spinach", "staple_milk"],
    servings: 2,
    instructions: "Prick sweet potatoes with a fork and microwave for 8-10 minutes (or bake at 400°F for 40 minutes) until soft. Steam frozen spinach. Whisk peanut butter with a little milk and warm water to create a creamy satay sauce. Slice potatoes open, stuff with spinach, and drizzle with peanut sauce."
  }
];
