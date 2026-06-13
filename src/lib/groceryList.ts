import { DayPlan } from "./mealPlanner";
import { Ingredient } from "./data";

export interface GroceryItem {
  name: string;
  qty: number;
  unit: string;
  estCost: number;
  haveInPantry: boolean;
}

/**
 * Aggregates ingredients across all meals in a day plan, combining
 * quantities for ingredients that share the same name and unit, and
 * marking items the user already has in their pantry.
 */
export function buildGroceryList(plan: DayPlan, pantry: string[]): GroceryItem[] {
  const pantrySet = new Set(pantry.map((p) => p.toLowerCase().trim()));
  const allIngredients: Ingredient[] = [];

  for (const meal of Object.values(plan)) {
    if (meal) allIngredients.push(...meal.ingredients);
  }

  const merged = new Map<string, GroceryItem>();

  for (const ing of allIngredients) {
    const key = `${ing.name.toLowerCase()}|${ing.unit}`;
    const existing = merged.get(key);
    if (existing) {
      existing.qty += ing.qty;
      existing.estCost += ing.estCost;
    } else {
      merged.set(key, {
        name: ing.name,
        qty: ing.qty,
        unit: ing.unit,
        estCost: ing.estCost,
        haveInPantry: pantrySet.has(ing.name.toLowerCase()),
      });
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Total cost of items that still need to be purchased (excludes pantry items).
 */
export function totalGroceryCost(items: GroceryItem[]): number {
  return items
    .filter((item) => !item.haveInPantry)
    .reduce((sum, item) => sum + item.estCost, 0);
}
