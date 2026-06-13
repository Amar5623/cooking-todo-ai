import { DayPlan, pickCheaperAlternative } from "./mealPlanner";
import { buildGroceryList, totalGroceryCost } from "./groceryList";
import { DietTag, MealType, Meal } from "./data";

export interface BudgetSwap {
  mealType: MealType;
  from: string;
  to: string;
  savedAmount: number;
}

export interface BudgetResult {
  estimatedCost: number;
  budget: number;
  feasible: boolean;
  difference: number; // positive = under budget (surplus), negative = over budget (deficit)
  swapsApplied: BudgetSwap[];
  finalPlan: DayPlan;
  message: string;
}

/**
 * Evaluates whether a day's meal plan fits within the user's stated budget.
 * If the plan is over budget, it iteratively swaps the most expensive meal
 * for the cheapest available alternative of the same type (respecting diet
 * preference and avoid list) until the plan fits or no more swaps help.
 *
 * Returns the final (possibly adjusted) plan along with a log of swaps made
 * and a human-readable explanation of the feasibility verdict.
 */
export function evaluateBudget(
  initialPlan: DayPlan,
  budget: number,
  pantry: string[],
  dietPreference: DietTag,
  avoid: string[]
): BudgetResult {
  let plan: DayPlan = { ...initialPlan };
  const swaps: BudgetSwap[] = [];

  let groceryItems = buildGroceryList(plan, pantry);
  let cost = totalGroceryCost(groceryItems);

  const MAX_ITERATIONS = 10;
  let iterations = 0;

  while (cost > budget && iterations < MAX_ITERATIONS) {
    iterations++;

    // Find the most expensive meal currently in the plan
    const entries = Object.entries(plan) as [MealType, Meal | undefined][];
    const validEntries = entries.filter(([, meal]) => meal !== undefined) as [
      MealType,
      Meal
    ][];

    if (validEntries.length === 0) break;

    const [mostExpensiveType, mostExpensiveMeal] = validEntries.sort(
      (a, b) => b[1].totalCost - a[1].totalCost
    )[0];

    const alternative = pickCheaperAlternative(
      mostExpensiveMeal.id,
      mostExpensiveType,
      dietPreference,
      avoid
    );

    // No cheaper alternative exists, or it's not actually cheaper: stop trying.
    if (!alternative || alternative.totalCost >= mostExpensiveMeal.totalCost) {
      break;
    }

    swaps.push({
      mealType: mostExpensiveType,
      from: mostExpensiveMeal.name,
      to: alternative.name,
      savedAmount: mostExpensiveMeal.totalCost - alternative.totalCost,
    });

    plan = { ...plan, [mostExpensiveType]: alternative };
    groceryItems = buildGroceryList(plan, pantry);
    cost = totalGroceryCost(groceryItems);
  }

  const difference = budget - cost;
  const feasible = cost <= budget;

  let message: string;
  if (feasible && swaps.length === 0) {
    message = `Your plan fits comfortably within your budget of ₹${budget}, with ₹${difference} to spare.`;
  } else if (feasible && swaps.length > 0) {
    message = `Your original plan exceeded the budget, so ${swaps.length} meal(s) were swapped for cheaper alternatives. The adjusted plan now fits within ₹${budget}, with ₹${difference} to spare.`;
  } else {
    message = `Even after swapping to the cheapest available options, the plan still exceeds your budget of ₹${budget} by ₹${Math.abs(
      difference
    )}. Consider increasing your budget, using more pantry items, or reducing the number of meals.`;
  }

  return {
    estimatedCost: cost,
    budget,
    feasible,
    difference,
    swapsApplied: swaps,
    finalPlan: plan,
    message,
  };
}
