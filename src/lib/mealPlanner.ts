import { MEALS, Meal, DietTag, MealType, CostTier } from "./data";

export interface PlannerInput {
  dietPreference: DietTag;
  avoid: string[]; // lowercase ingredient names to avoid (allergies/dislikes)
  mealsNeeded: MealType[]; // which meals of the day are needed
}

/**
 * Returns true if a meal is compatible with the user's diet preference.
 * "non-veg" preference can still eat veg meals; veg/vegan/gluten-free/
 * dairy-free preferences require the meal to carry that tag.
 */
function dietCompatible(meal: Meal, dietPreference: DietTag): boolean {
  if (dietPreference === "non-veg") return true; // non-veg eaters can have anything
  return meal.dietTags.includes(dietPreference);
}

/**
 * Returns true if none of the meal's ingredients are in the user's avoid list.
 */
function avoidsExcluded(meal: Meal, avoid: string[]): boolean {
  if (avoid.length === 0) return true;
  const lowerAvoid = avoid.map((a) => a.toLowerCase());
  return !meal.ingredients.some((ing) =>
    lowerAvoid.some((a) => ing.name.toLowerCase().includes(a))
  );
}

/**
 * Picks the cheapest compatible meal for a given meal type.
 * Falls back to any compatible meal if no candidates match avoid list strictly.
 */
function pickMeal(type: MealType, dietPreference: DietTag, avoid: string[]): Meal {
  const candidates = MEALS.filter(
    (m) => m.type === type && dietCompatible(m, dietPreference)
  );

  const strict = candidates.filter((m) => avoidsExcluded(m, avoid));
  const pool = strict.length > 0 ? strict : candidates;

  if (pool.length === 0) {
    throw new Error(
      `No meals available for type "${type}" with diet preference "${dietPreference}". Please relax your filters.`
    );
  }

  // Default pick: lowest cost first (helps budget feasibility downstream)
  return [...pool].sort((a, b) => a.totalCost - b.totalCost)[0];
}

/**
 * Returns the next-cheapest alternative meal of the same type, excluding
 * a given meal id. Used by the budget engine to swap out expensive meals.
 */
export function pickCheaperAlternative(
  currentMealId: string,
  type: MealType,
  dietPreference: DietTag,
  avoid: string[]
): Meal | null {
  const candidates = MEALS.filter(
    (m) =>
      m.type === type &&
      m.id !== currentMealId &&
      dietCompatible(m, dietPreference) &&
      avoidsExcluded(m, avoid)
  ).sort((a, b) => a.totalCost - b.totalCost);

  return candidates[0] ?? null;
}

export interface DayPlan {
  breakfast?: Meal;
  lunch?: Meal;
  dinner?: Meal;
}

/**
 * Generates a one-day meal plan based on diet preference, ingredients to
 * avoid, and which meals are requested.
 */
export function generateDayPlan(input: PlannerInput): DayPlan {
  const plan: DayPlan = {};
  for (const mealType of input.mealsNeeded) {
    plan[mealType] = pickMeal(mealType, input.dietPreference, input.avoid);
  }
  return plan;
}

export function costTierRank(tier: CostTier): number {
  return tier === "low" ? 0 : tier === "medium" ? 1 : 2;
}
