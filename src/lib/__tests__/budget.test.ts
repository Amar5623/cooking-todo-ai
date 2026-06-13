import { describe, it, expect } from "vitest";
import { evaluateBudget } from "../budget";
import { generateDayPlan } from "../mealPlanner";

describe("evaluateBudget", () => {
  it("reports feasible with no swaps when the plan is already within budget", () => {
    const plan = generateDayPlan({
      dietPreference: "veg",
      avoid: [],
      mealsNeeded: ["breakfast", "lunch", "dinner"],
    });

    const result = evaluateBudget(plan, 1000, [], "veg", []);

    expect(result.feasible).toBe(true);
    expect(result.swapsApplied.length).toBe(0);
  });

  it("swaps expensive meals for cheaper ones when over budget, and reports feasibility", () => {
    const plan = generateDayPlan({
      dietPreference: "non-veg",
      avoid: [],
      mealsNeeded: ["lunch", "dinner"],
    });

    // Force an over-budget scenario with a very tight budget
    const result = evaluateBudget(plan, 60, [], "non-veg", []);

    expect(result.estimatedCost).toBeLessThanOrEqual(
      plan.lunch!.totalCost + plan.dinner!.totalCost
    );

    if (!result.feasible) {
      expect(result.message).toContain("exceeds your budget");
    } else {
      expect(result.swapsApplied.length).toBeGreaterThan(0);
    }
  });

  it("never increases total cost compared to the original plan", () => {
    const plan = generateDayPlan({
      dietPreference: "veg",
      avoid: [],
      mealsNeeded: ["breakfast", "lunch", "dinner"],
    });

    const originalCost = Object.values(plan).reduce((sum, m) => sum + (m?.totalCost ?? 0), 0);
    const result = evaluateBudget(plan, 1, [], "veg", []);

    expect(result.estimatedCost).toBeLessThanOrEqual(originalCost);
  });
});
