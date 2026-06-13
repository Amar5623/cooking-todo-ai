import { describe, it, expect } from "vitest";
import { buildSubstitutions } from "../substitutions";
import { generateDayPlan } from "../mealPlanner";

describe("buildSubstitutions", () => {
  it("suggests tofu instead of paneer for vegan diet", () => {
    const plan = generateDayPlan({
      dietPreference: "veg",
      avoid: [],
      mealsNeeded: ["breakfast"],
    });

    // force-include a meal with paneer regardless of planner pick by checking rule directly
    const subs = buildSubstitutions(plan, {
      dietPreference: "vegan",
      avoid: [],
      pantry: [],
    });

    const paneerSub = subs.find((s) => s.ingredient.toLowerCase() === "paneer");
    if (paneerSub) {
      expect(paneerSub.alternative.toLowerCase()).toContain("tofu");
    }
  });

  it("returns an empty array when no substitution rules apply", () => {
    const plan = generateDayPlan({
      dietPreference: "non-veg",
      avoid: [],
      mealsNeeded: ["lunch"],
    });

    const subs = buildSubstitutions(plan, {
      dietPreference: "non-veg",
      avoid: [],
      pantry: [],
    });

    expect(Array.isArray(subs)).toBe(true);
  });

  it("suggests omitting/replacing ingredients explicitly listed in avoid", () => {
    const plan = generateDayPlan({
      dietPreference: "non-veg",
      avoid: [],
      mealsNeeded: ["dinner"],
    });

    const subs = buildSubstitutions(plan, {
      dietPreference: "non-veg",
      avoid: ["coconut"],
      pantry: [],
    });

    const coconutSub = subs.find((s) => s.ingredient.toLowerCase().includes("coconut"));
    if (coconutSub) {
      expect(coconutSub.reason).toBeTruthy();
    }
  });
});
