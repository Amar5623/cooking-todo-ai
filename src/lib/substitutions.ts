import { DayPlan } from "./mealPlanner";
import { SUBSTITUTION_RULES, SubstitutionContext } from "./data";

export interface SubstitutionSuggestion {
  mealName: string;
  ingredient: string;
  alternative: string;
  reason: string;
}

/**
 * Scans every meal in the plan and applies substitution rules based on the
 * user's diet preference and avoid list. Returns a flat list of suggestions,
 * each tied to the meal and ingredient it applies to.
 */
export function buildSubstitutions(
  plan: DayPlan,
  context: SubstitutionContext
): SubstitutionSuggestion[] {
  const suggestions: SubstitutionSuggestion[] = [];

  for (const meal of Object.values(plan)) {
    if (!meal) continue;

    for (const ing of meal.ingredients) {
      for (const rule of SUBSTITUTION_RULES) {
        if (
          ing.name.toLowerCase() === rule.ingredient.toLowerCase() &&
          rule.appliesWhen(context)
        ) {
          suggestions.push({
            mealName: meal.name,
            ingredient: ing.name,
            alternative: rule.alternative,
            reason: rule.reason,
          });
        }
      }

      // Also handle direct "avoid" matches not covered by a specific rule:
      // suggest a generic omission if the user explicitly listed this
      // ingredient as something to avoid and no rule already covered it.
      const lowerAvoid = context.avoid.map((a) => a.toLowerCase());
      const directMatch = lowerAvoid.some((a) => ing.name.toLowerCase().includes(a));
      const alreadyCovered = suggestions.some(
        (s) => s.mealName === meal.name && s.ingredient === ing.name
      );
      if (directMatch && !alreadyCovered) {
        suggestions.push({
          mealName: meal.name,
          ingredient: ing.name,
          alternative: "omit or replace with a similar ingredient you can tolerate",
          reason: "listed in your items to avoid",
        });
      }
    }
  }

  return suggestions;
}
