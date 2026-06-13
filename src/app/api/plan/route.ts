import { NextRequest, NextResponse } from "next/server";
import { generateDayPlan, PlannerInput } from "@/lib/mealPlanner";
import { buildGroceryList, totalGroceryCost } from "@/lib/groceryList";
import { buildSubstitutions } from "@/lib/substitutions";
import { evaluateBudget } from "@/lib/budget";
import { generateSummary } from "@/lib/llm";
import { DietTag, MealType } from "@/lib/data";

const VALID_DIETS: DietTag[] = ["veg", "vegan", "non-veg", "gluten-free", "dairy-free"];
const VALID_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

interface RequestBody {
  dietPreference: string;
  budget: number;
  mealsNeeded: string[];
  avoid?: string[];
  pantry?: string[];
}

function validateBody(body: unknown): { valid: true; data: RequestBody } | { valid: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { valid: false, error: "Request body must be a JSON object." };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.dietPreference !== "string" || !VALID_DIETS.includes(b.dietPreference as DietTag)) {
    return { valid: false, error: `dietPreference must be one of: ${VALID_DIETS.join(", ")}` };
  }

  if (typeof b.budget !== "number" || b.budget <= 0 || !Number.isFinite(b.budget)) {
    return { valid: false, error: "budget must be a positive number." };
  }

  if (
    !Array.isArray(b.mealsNeeded) ||
    b.mealsNeeded.length === 0 ||
    !b.mealsNeeded.every((m) => typeof m === "string" && VALID_MEAL_TYPES.includes(m as MealType))
  ) {
    return { valid: false, error: `mealsNeeded must be a non-empty array containing only: ${VALID_MEAL_TYPES.join(", ")}` };
  }

  if (b.avoid !== undefined && (!Array.isArray(b.avoid) || !b.avoid.every((a) => typeof a === "string"))) {
    return { valid: false, error: "avoid must be an array of strings." };
  }

  if (b.pantry !== undefined && (!Array.isArray(b.pantry) || !b.pantry.every((p) => typeof p === "string"))) {
    return { valid: false, error: "pantry must be an array of strings." };
  }

  return {
    valid: true,
    data: {
      dietPreference: b.dietPreference as string,
      budget: b.budget as number,
      mealsNeeded: b.mealsNeeded as string[],
      avoid: (b.avoid as string[]) ?? [],
      pantry: (b.pantry as string[]) ?? [],
    },
  };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateBody(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { dietPreference, budget, mealsNeeded, avoid = [], pantry = [] } = validation.data;

  try {
    const normalizedAvoid = avoid.map((a) => a.toLowerCase().trim());
    const normalizedPantry = pantry.map((p) => p.toLowerCase().trim());

    const plannerInput: PlannerInput = {
      dietPreference: dietPreference as DietTag,
      avoid: normalizedAvoid,
      mealsNeeded: mealsNeeded as MealType[],
    };

    const initialPlan = generateDayPlan(plannerInput);

    const budgetResult = evaluateBudget(
      initialPlan,
      budget,
      normalizedPantry,
      plannerInput.dietPreference,
      plannerInput.avoid
    );

    const finalPlan = budgetResult.finalPlan;
    const groceryItems = buildGroceryList(finalPlan, normalizedPantry);
    const substitutions = buildSubstitutions(finalPlan, {
      dietPreference: plannerInput.dietPreference,
      avoid: plannerInput.avoid,
      pantry: normalizedPantry,
    });

    const summary = await generateSummary({
      plan: finalPlan,
      groceryItems,
      substitutions,
      budgetResult,
    });

    return NextResponse.json({
      plan: finalPlan,
      groceryList: groceryItems,
      groceryTotal: totalGroceryCost(groceryItems),
      substitutions,
      budget: budgetResult,
      summary: summary.text,
      summarySource: summary.source,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error generating plan.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
