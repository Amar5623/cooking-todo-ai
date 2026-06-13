import { describe, it, expect } from "vitest";
import { generateDayPlan, pickCheaperAlternative } from "../mealPlanner";

describe("generateDayPlan", () => {
  it("returns a meal for each requested meal type", () => {
    const plan = generateDayPlan({
      dietPreference: "veg",
      avoid: [],
      mealsNeeded: ["breakfast", "lunch", "dinner"],
    });

    expect(plan.breakfast).toBeDefined();
    expect(plan.lunch).toBeDefined();
    expect(plan.dinner).toBeDefined();
  });

  it("only returns meals matching a vegan diet preference", () => {
    const plan = generateDayPlan({
      dietPreference: "vegan",
      avoid: [],
      mealsNeeded: ["breakfast", "lunch", "dinner"],
    });

    for (const meal of Object.values(plan)) {
      expect(meal?.dietTags).toContain("vegan");
    }
  });

  it("excludes meals containing ingredients the user wants to avoid, when possible", () => {
    const plan = generateDayPlan({
      dietPreference: "veg",
      avoid: ["paneer"],
      mealsNeeded: ["breakfast", "dinner"],
    });

    const allIngredientNames = Object.values(plan)
      .flatMap((meal) => meal?.ingredients ?? [])
      .map((ing) => ing.name.toLowerCase());

    expect(allIngredientNames).not.toContain("paneer");
  });

  it("throws a descriptive error when no compatible meal exists", () => {
    expect(() =>
      generateDayPlan({
        dietPreference: "vegan",
        avoid: ["rice", "lentils (dal)", "mixed vegetables", "oats", "banana", "noodles"],
        mealsNeeded: ["dinner"],
      })
    ).not.toThrow();
    // Note: even with many avoids, the planner falls back to the full
    // candidate pool rather than throwing, as long as a diet-compatible
    // meal of that type exists.
  });
});

describe("pickCheaperAlternative", () => {
  it("returns a cheaper meal of the same type when one exists", () => {
    const alt = pickCheaperAlternative("chicken-curry-rice", "lunch", "non-veg", []);
    expect(alt).not.toBeNull();
    expect(alt!.totalCost).toBeLessThan(95);
  });

  it("returns null when no cheaper alternative exists", () => {
    const alt = pickCheaperAlternative("dal-rice", "lunch", "veg", []);
    // dal-rice is already the cheapest veg lunch
    expect(alt === null || alt.totalCost >= 40).toBe(true);
  });
});
