import { describe, it, expect } from "vitest";
import { buildGroceryList, totalGroceryCost } from "../groceryList";
import { generateDayPlan } from "../mealPlanner";

describe("buildGroceryList", () => {
  it("aggregates ingredients across all meals in the plan", () => {
    const plan = generateDayPlan({
      dietPreference: "veg",
      avoid: [],
      mealsNeeded: ["breakfast", "lunch", "dinner"],
    });

    const list = buildGroceryList(plan, []);
    expect(list.length).toBeGreaterThan(0);
    // every item should have a positive quantity and cost
    for (const item of list) {
      expect(item.qty).toBeGreaterThan(0);
      expect(item.estCost).toBeGreaterThanOrEqual(0);
    }
  });

  it("marks pantry items and excludes them from the total cost", () => {
    const plan = generateDayPlan({
      dietPreference: "veg",
      avoid: [],
      mealsNeeded: ["lunch"],
    });

    const withoutPantry = buildGroceryList(plan, []);
    const withPantry = buildGroceryList(plan, ["rice"]);

    const riceItem = withPantry.find((i) => i.name.toLowerCase() === "rice");
    expect(riceItem?.haveInPantry).toBe(true);

    expect(totalGroceryCost(withPantry)).toBeLessThan(totalGroceryCost(withoutPantry));
  });

  it("combines duplicate ingredients into a single entry", () => {
    const plan = generateDayPlan({
      dietPreference: "veg",
      avoid: [],
      mealsNeeded: ["lunch", "dinner"],
    });

    const list = buildGroceryList(plan, []);
    const names = list.map((i) => `${i.name}|${i.unit}`);
    const uniqueNames = new Set(names);
    expect(names.length).toBe(uniqueNames.size);
  });
});
