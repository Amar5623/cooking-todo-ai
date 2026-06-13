/**
 * Optional LLM layer: turns the structured meal plan / grocery list /
 * substitutions / budget result into a friendly, natural-language daily
 * cooking to-do list.
 *
 * This layer is purely additive — if both providers fail or no API keys
 * are configured, the app falls back to a deterministic, template-based
 * summary so the core feature always works without external dependencies.
 */

import { DayPlan } from "./mealPlanner";
import { GroceryItem } from "./groceryList";
import { SubstitutionSuggestion } from "./substitutions";
import { BudgetResult } from "./budget";

export interface SummaryInput {
  plan: DayPlan;
  groceryItems: GroceryItem[];
  substitutions: SubstitutionSuggestion[];
  budgetResult: BudgetResult;
}

function buildPrompt(input: SummaryInput): string {
  const mealLines = Object.entries(input.plan)
    .filter(([, meal]) => meal)
    .map(([type, meal]) => `- ${type}: ${meal!.name}`)
    .join("\n");

  const groceryLines = input.groceryItems
    .map((g) => `- ${g.name}: ${g.qty}${g.unit}${g.haveInPantry ? " (already in pantry)" : ""}`)
    .join("\n");

  const subLines =
    input.substitutions.length > 0
      ? input.substitutions
          .map((s) => `- In ${s.mealName}, swap ${s.ingredient} for ${s.alternative} (${s.reason})`)
          .join("\n")
      : "- None needed";

  return `You are a helpful cooking assistant. Based on the structured data below, write a short, friendly daily cooking to-do list for the user. Keep it concise, use a warm tone, and organize it by meal. Mention the budget status briefly at the end.

Meals planned:
${mealLines}

Grocery list:
${groceryLines}

Suggested substitutions:
${subLines}

Budget status: ${input.budgetResult.message}

Write the to-do list now:`;
}

async function callGroq(prompt: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.6,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

/**
 * Deterministic fallback summary used when no LLM provider is available
 * or both calls fail. Ensures the app remains fully functional offline.
 */
function fallbackSummary(input: SummaryInput): string {
  const lines: string[] = ["Here's your cooking to-do list for today:"];

  for (const [type, meal] of Object.entries(input.plan)) {
    if (meal) lines.push(`- ${type.charAt(0).toUpperCase() + type.slice(1)}: ${meal.name}`);
  }

  lines.push("", "Grocery list:");
  for (const item of input.groceryItems) {
    lines.push(`- ${item.name} (${item.qty}${item.unit})${item.haveInPantry ? " — already have" : ""}`);
  }

  if (input.substitutions.length > 0) {
    lines.push("", "Substitutions to consider:");
    for (const s of input.substitutions) {
      lines.push(`- ${s.ingredient} → ${s.alternative} (${s.reason}) in ${s.mealName}`);
    }
  }

  lines.push("", input.budgetResult.message);

  return lines.join("\n");
}

/**
 * Generates a natural-language daily cooking to-do list. Tries Groq first,
 * then Gemini, then falls back to a deterministic template.
 */
export async function generateSummary(input: SummaryInput): Promise<{ text: string; source: "groq" | "gemini" | "fallback" }> {
  const prompt = buildPrompt(input);

  const groqResult = await callGroq(prompt);
  if (groqResult) return { text: groqResult, source: "groq" };

  const geminiResult = await callGemini(prompt);
  if (geminiResult) return { text: geminiResult, source: "gemini" };

  return { text: fallbackSummary(input), source: "fallback" };
}
