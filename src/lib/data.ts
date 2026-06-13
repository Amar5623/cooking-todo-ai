// Core domain types and meal dataset.
// Cost values are illustrative units (e.g., INR) for a single serving.

export type MealType = "breakfast" | "lunch" | "dinner";
export type DietTag = "veg" | "vegan" | "non-veg" | "gluten-free" | "dairy-free";
export type CostTier = "low" | "medium" | "high";

export interface Ingredient {
  name: string;
  qty: number;
  unit: string; // e.g. "g", "ml", "pcs"
  estCost: number; // estimated cost contribution for this ingredient in this meal
}

export interface Meal {
  id: string;
  name: string;
  type: MealType;
  dietTags: DietTag[];
  costTier: CostTier;
  totalCost: number;
  ingredients: Ingredient[];
}

export const MEALS: Meal[] = [
  {
    id: "oats-banana",
    name: "Banana Oats Porridge",
    type: "breakfast",
    dietTags: ["veg", "vegan", "dairy-free"],
    costTier: "low",
    totalCost: 30,
    ingredients: [
      { name: "oats", qty: 50, unit: "g", estCost: 10 },
      { name: "banana", qty: 1, unit: "pcs", estCost: 8 },
      { name: "milk", qty: 100, unit: "ml", estCost: 8 },
      { name: "honey", qty: 10, unit: "g", estCost: 4 },
    ],
  },
  {
    id: "paneer-paratha",
    name: "Paneer Paratha",
    type: "breakfast",
    dietTags: ["veg"],
    costTier: "medium",
    totalCost: 55,
    ingredients: [
      { name: "wheat flour", qty: 100, unit: "g", estCost: 8 },
      { name: "paneer", qty: 80, unit: "g", estCost: 35 },
      { name: "butter", qty: 10, unit: "g", estCost: 6 },
      { name: "spices", qty: 5, unit: "g", estCost: 6 },
    ],
  },
  {
    id: "egg-toast",
    name: "Egg Toast",
    type: "breakfast",
    dietTags: ["non-veg"],
    costTier: "low",
    totalCost: 35,
    ingredients: [
      { name: "bread", qty: 2, unit: "pcs", estCost: 10 },
      { name: "eggs", qty: 2, unit: "pcs", estCost: 16 },
      { name: "butter", qty: 5, unit: "g", estCost: 3 },
      { name: "pepper", qty: 1, unit: "g", estCost: 2 },
    ],
  },
  {
    id: "dal-rice",
    name: "Dal Rice",
    type: "lunch",
    dietTags: ["veg", "vegan", "gluten-free", "dairy-free"],
    costTier: "low",
    totalCost: 40,
    ingredients: [
      { name: "rice", qty: 150, unit: "g", estCost: 12 },
      { name: "lentils (dal)", qty: 100, unit: "g", estCost: 18 },
      { name: "onion", qty: 1, unit: "pcs", estCost: 5 },
      { name: "tomato", qty: 1, unit: "pcs", estCost: 5 },
    ],
  },
  {
    id: "chicken-curry-rice",
    name: "Chicken Curry with Rice",
    type: "lunch",
    dietTags: ["non-veg", "gluten-free"],
    costTier: "high",
    totalCost: 95,
    ingredients: [
      { name: "chicken", qty: 200, unit: "g", estCost: 60 },
      { name: "rice", qty: 150, unit: "g", estCost: 12 },
      { name: "onion", qty: 1, unit: "pcs", estCost: 5 },
      { name: "tomato", qty: 1, unit: "pcs", estCost: 5 },
      { name: "spices", qty: 10, unit: "g", estCost: 13 },
    ],
  },
  {
    id: "chole-roti",
    name: "Chole with Roti",
    type: "lunch",
    dietTags: ["veg", "vegan", "dairy-free"],
    costTier: "medium",
    totalCost: 50,
    ingredients: [
      { name: "chickpeas", qty: 100, unit: "g", estCost: 20 },
      { name: "wheat flour", qty: 100, unit: "g", estCost: 8 },
      { name: "onion", qty: 1, unit: "pcs", estCost: 5 },
      { name: "tomato", qty: 1, unit: "pcs", estCost: 5 },
      { name: "spices", qty: 10, unit: "g", estCost: 12 },
    ],
  },
  {
    id: "veg-stirfry-noodles",
    name: "Vegetable Stir-fry Noodles",
    type: "dinner",
    dietTags: ["veg", "vegan", "dairy-free"],
    costTier: "medium",
    totalCost: 60,
    ingredients: [
      { name: "noodles", qty: 100, unit: "g", estCost: 20 },
      { name: "mixed vegetables", qty: 150, unit: "g", estCost: 30 },
      { name: "soy sauce", qty: 10, unit: "ml", estCost: 5 },
      { name: "oil", qty: 10, unit: "ml", estCost: 5 },
    ],
  },
  {
    id: "khichdi",
    name: "Vegetable Khichdi",
    type: "dinner",
    dietTags: ["veg", "vegan", "gluten-free", "dairy-free"],
    costTier: "low",
    totalCost: 35,
    ingredients: [
      { name: "rice", qty: 100, unit: "g", estCost: 8 },
      { name: "lentils (dal)", qty: 50, unit: "g", estCost: 9 },
      { name: "mixed vegetables", qty: 100, unit: "g", estCost: 18 },
    ],
  },
  {
    id: "fish-curry-rice",
    name: "Fish Curry with Rice",
    type: "dinner",
    dietTags: ["non-veg", "gluten-free"],
    costTier: "high",
    totalCost: 100,
    ingredients: [
      { name: "fish", qty: 200, unit: "g", estCost: 70 },
      { name: "rice", qty: 150, unit: "g", estCost: 12 },
      { name: "coconut milk", qty: 50, unit: "ml", estCost: 10 },
      { name: "spices", qty: 10, unit: "g", estCost: 8 },
    ],
  },
  {
    id: "paneer-bhurji-roti",
    name: "Paneer Bhurji with Roti",
    type: "dinner",
    dietTags: ["veg"],
    costTier: "medium",
    totalCost: 65,
    ingredients: [
      { name: "paneer", qty: 100, unit: "g", estCost: 45 },
      { name: "wheat flour", qty: 80, unit: "g", estCost: 6 },
      { name: "onion", qty: 1, unit: "pcs", estCost: 5 },
      { name: "spices", qty: 8, unit: "g", estCost: 9 },
    ],
  },
];

// Substitution rules: maps an ingredient name (lowercase) + a dietary
// restriction/context to a suggested alternative with a reason.
export interface SubstitutionRule {
  ingredient: string;
  reason: string;
  alternative: string;
  appliesWhen: (context: SubstitutionContext) => boolean;
}

export interface SubstitutionContext {
  dietPreference: DietTag;
  avoid: string[]; // lowercase ingredient names the user wants to avoid (allergies/dislikes)
  pantry: string[]; // lowercase ingredient names user already has
}

export const SUBSTITUTION_RULES: SubstitutionRule[] = [
  {
    ingredient: "paneer",
    reason: "vegan diet selected",
    alternative: "firm tofu",
    appliesWhen: (ctx) => ctx.dietPreference === "vegan",
  },
  {
    ingredient: "milk",
    reason: "dairy-free preference",
    alternative: "almond or soy milk",
    appliesWhen: (ctx) =>
      ctx.dietPreference === "vegan" || ctx.dietPreference === "dairy-free" || ctx.avoid.includes("milk") || ctx.avoid.includes("dairy"),
  },
  {
    ingredient: "butter",
    reason: "dairy-free preference",
    alternative: "vegetable oil or vegan margarine",
    appliesWhen: (ctx) =>
      ctx.dietPreference === "vegan" || ctx.dietPreference === "dairy-free" || ctx.avoid.includes("butter") || ctx.avoid.includes("dairy"),
  },
  {
    ingredient: "honey",
    reason: "vegan diet selected",
    alternative: "maple syrup or jaggery syrup",
    appliesWhen: (ctx) => ctx.dietPreference === "vegan",
  },
  {
    ingredient: "wheat flour",
    reason: "gluten-free preference",
    alternative: "rice flour or gluten-free flour blend",
    appliesWhen: (ctx) => ctx.dietPreference === "gluten-free" || ctx.avoid.includes("gluten") || ctx.avoid.includes("wheat"),
  },
  {
    ingredient: "noodles",
    reason: "gluten-free preference",
    alternative: "rice noodles",
    appliesWhen: (ctx) => ctx.dietPreference === "gluten-free" || ctx.avoid.includes("gluten") || ctx.avoid.includes("wheat"),
  },
  {
    ingredient: "soy sauce",
    reason: "gluten-free preference",
    alternative: "tamari (gluten-free soy sauce)",
    appliesWhen: (ctx) => ctx.dietPreference === "gluten-free" || ctx.avoid.includes("gluten"),
  },
  {
    ingredient: "coconut milk",
    reason: "user marked this as unavailable/disliked",
    alternative: "cashew cream or regular cream",
    appliesWhen: (ctx) => ctx.avoid.includes("coconut milk") || ctx.avoid.includes("coconut"),
  },
];
