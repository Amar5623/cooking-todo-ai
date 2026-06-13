import { NextRequest } from "next/server";
import { generateDayPlan, PlannerInput } from "@/lib/mealPlanner";
import { buildGroceryList, totalGroceryCost } from "@/lib/groceryList";
import { buildSubstitutions } from "@/lib/substitutions";
import { evaluateBudget } from "@/lib/budget";
import {
  callGroqStream,
  callGeminiStream,
  fallbackSummary,
  SummaryInput,
} from "@/lib/llm";
import { DietTag, MealType } from "@/lib/data";

const VALID_DIETS: DietTag[] = [
  "veg",
  "vegan",
  "non-veg",
  "gluten-free",
  "dairy-free",
];
const VALID_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

interface RequestBody {
  dietPreference: string;
  budget: number;
  mealsNeeded: string[];
  avoid?: string[];
  pantry?: string[];
}

function validateBody(
  body: unknown
):
  | { valid: true; data: RequestBody }
  | { valid: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { valid: false, error: "Request body must be a JSON object." };
  }

  const b = body as Record<string, unknown>;

  if (
    typeof b.dietPreference !== "string" ||
    !VALID_DIETS.includes(b.dietPreference as DietTag)
  ) {
    return {
      valid: false,
      error: `dietPreference must be one of: ${VALID_DIETS.join(", ")}`,
    };
  }

  if (
    typeof b.budget !== "number" ||
    b.budget <= 0 ||
    !Number.isFinite(b.budget)
  ) {
    return { valid: false, error: "budget must be a positive number." };
  }

  if (
    !Array.isArray(b.mealsNeeded) ||
    b.mealsNeeded.length === 0 ||
    !b.mealsNeeded.every(
      (m) => typeof m === "string" && VALID_MEAL_TYPES.includes(m as MealType)
    )
  ) {
    return {
      valid: false,
      error: `mealsNeeded must be a non-empty array containing only: ${VALID_MEAL_TYPES.join(", ")}`,
    };
  }

  if (
    b.avoid !== undefined &&
    (!Array.isArray(b.avoid) || !b.avoid.every((a) => typeof a === "string"))
  ) {
    return { valid: false, error: "avoid must be an array of strings." };
  }

  if (
    b.pantry !== undefined &&
    (!Array.isArray(b.pantry) ||
      !b.pantry.every((p) => typeof p === "string"))
  ) {
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

/**
 * POST /api/plan
 *
 * Streams a newline-delimited JSON protocol:
 *   1. One "data" event with the full structured plan (plan, groceryList,
 *      groceryTotal, substitutions, budget).
 *   2. Many "chunk" events each carrying a string fragment of the AI summary.
 *   3. One "done" event with the summary source ("groq" | "gemini" | "fallback").
 *
 * Each line is a JSON object: { type: string; payload: unknown }
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const validation = validateBody(body);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ error: validation.error }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const {
    dietPreference,
    budget,
    mealsNeeded,
    avoid = [],
    pantry = [],
  } = validation.data;

  // ── Deterministic core logic ──────────────────────────────────────────────
  let planData: ReturnType<typeof evaluateBudget> & {
    groceryList: ReturnType<typeof buildGroceryList>;
    groceryTotal: number;
    substitutions: ReturnType<typeof buildSubstitutions>;
  };

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

    planData = {
      ...budgetResult,
      groceryList: groceryItems,
      groceryTotal: totalGroceryCost(groceryItems),
      substitutions,
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Unexpected error generating plan.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Build summary input ───────────────────────────────────────────────────
  const summaryInput: SummaryInput = {
    plan: planData.finalPlan,
    groceryItems: planData.groceryList,
    substitutions: planData.substitutions,
    budgetResult: {
      estimatedCost: planData.estimatedCost,
      budget: planData.budget,
      feasible: planData.feasible,
      difference: planData.difference,
      swapsApplied: planData.swapsApplied,
      finalPlan: planData.finalPlan,
      message: planData.message,
    },
  };

  // ── Stream response ───────────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // 1. Send structured plan data first
      const dataEvent = {
        type: "data",
        payload: {
          plan: planData.finalPlan,
          groceryList: planData.groceryList,
          groceryTotal: planData.groceryTotal,
          substitutions: planData.substitutions,
          budget: {
            estimatedCost: planData.estimatedCost,
            budget: planData.budget,
            feasible: planData.feasible,
            difference: planData.difference,
            swapsApplied: planData.swapsApplied,
            message: planData.message,
          },
        },
      };
      controller.enqueue(
        encoder.encode(JSON.stringify(dataEvent) + "\n")
      );

      // 2. Try streaming AI summary
      let summarySource: "groq" | "gemini" | "fallback" = "fallback";

      const groqStream = await callGroqStream(summaryInput);
      if (groqStream) {
        summarySource = "groq";
        const reader = groqStream.getReader();
        const dec = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = dec.decode(value, { stream: true });
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "chunk", payload: chunk }) + "\n"
            )
          );
        }
      } else {
        const geminiStream = await callGeminiStream(summaryInput);
        if (geminiStream) {
          summarySource = "gemini";
          const reader = geminiStream.getReader();
          const dec = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = dec.decode(value, { stream: true });
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: "chunk", payload: chunk }) + "\n"
              )
            );
          }
        } else {
          // Deterministic fallback — send as a single chunk
          const text = fallbackSummary(summaryInput);
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "chunk", payload: text }) + "\n"
            )
          );
        }
      }

      // 3. Signal completion
      controller.enqueue(
        encoder.encode(
          JSON.stringify({ type: "done", payload: summarySource }) + "\n"
        )
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}