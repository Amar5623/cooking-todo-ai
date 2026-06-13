/**
 * Optional LLM layer: turns the structured meal plan / grocery list /
 * substitutions / budget result into a friendly, natural-language daily
 * cooking to-do list.
 *
 * Streaming-first: callGroqStream / callGeminiStream write chunks to a
 * ReadableStream<Uint8Array> so the UI can render text progressively.
 * Falls back to a deterministic template if both providers are unavailable.
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

// ─── Prompt ──────────────────────────────────────────────────────────────────

function buildPrompt(input: SummaryInput): string {
  const mealLines = Object.entries(input.plan)
    .filter(([, meal]) => meal)
    .map(([type, meal]) => `${type}: ${meal!.name} (₹${meal!.totalCost})`)
    .join(", ");

  const groceryLines = input.groceryItems
    .map(
      (g) =>
        `${g.name} ${g.qty}${g.unit}${g.haveInPantry ? " (already in pantry)" : ""}`
    )
    .join(", ");

  const subLines =
    input.substitutions.length > 0
      ? input.substitutions
        .map(
          (s) =>
            `In ${s.mealName}, swap ${s.ingredient} for ${s.alternative} (${s.reason})`
        )
        .join("; ")
      : "none needed";

  return `You are a helpful cooking assistant for an Indian home cook. Given the data below, write a warm, concise daily cooking to-do list. Rules: write in plain sentences only, no markdown symbols (no asterisks, no hyphens as bullets, no hash headings, no backticks). Use short numbered steps grouped by meal (e.g. "Breakfast 1. ...  2. ..."). Keep the whole response under 200 words. End with one sentence about budget status.

Meals: ${mealLines}
Groceries to buy: ${groceryLines}
Substitutions: ${subLines}
Budget: ${input.budgetResult.message}

Write the to-do list now:`;
}

// ─── Groq streaming ───────────────────────────────────────────────────────────

export async function callGroqStream(
  input: SummaryInput
): Promise<ReadableStream<Uint8Array> | null> {
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
        messages: [{ role: "user", content: buildPrompt(input) }],
        max_tokens: 400,
        temperature: 0.5,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) return null;

    // Transform the SSE stream into plain text chunks
    const encoder = new TextEncoder();
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }

          const text = decoder.decode(value, { stream: true });
          for (const line of text.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(payload);
              const chunk: string =
                json?.choices?.[0]?.delta?.content ?? "";
              if (chunk) controller.enqueue(encoder.encode(chunk));
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      },
    });
  } catch {
    return null;
  }
}

// ─── Gemini streaming ─────────────────────────────────────────────────────────

export async function callGeminiStream(
  input: SummaryInput
): Promise<ReadableStream<Uint8Array> | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=${apiKey}&alt=sse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(input) }] }],
          generationConfig: { maxOutputTokens: 400, temperature: 0.5 },
        }),
      }
    );

    if (!res.ok || !res.body) return null;

    const encoder = new TextEncoder();
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }

          const text = decoder.decode(value, { stream: true });
          for (const line of text.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(payload);
              const chunk: string =
                json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
              if (chunk) controller.enqueue(encoder.encode(chunk));
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      },
    });
  } catch {
    return null;
  }
}

// ─── Deterministic fallback ───────────────────────────────────────────────────

export function fallbackSummary(input: SummaryInput): string {
  const lines: string[] = ["Here is your cooking to-do list for today."];

  let step = 1;
  for (const [type, meal] of Object.entries(input.plan)) {
    if (!meal) continue;
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    lines.push(`${label}: Step ${step}. Gather ingredients for ${meal.name}.`);
    step++;
    lines.push(`Step ${step}. Prepare and cook ${meal.name} (estimated cost ₹${meal.totalCost}).`);
    step++;
  }

  const toBuy = input.groceryItems.filter((i) => !i.haveInPantry);
  if (toBuy.length > 0) {
    lines.push(
      `Shopping: Pick up ${toBuy.map((i) => `${i.name} (${i.qty}${i.unit})`).join(", ")}.`
    );
  }

  if (input.substitutions.length > 0) {
    lines.push(
      `Substitutions: ${input.substitutions
        .map((s) => `use ${s.alternative} instead of ${s.ingredient} in ${s.mealName}`)
        .join("; ")}.`
    );
  }

  lines.push(input.budgetResult.message);

  return lines.join(" ");
}

// ─── Non-streaming fallback (used by tests / non-streaming callers) ────────

export async function generateSummary(
  input: SummaryInput
): Promise<{ text: string; source: "groq" | "gemini" | "fallback" }> {
  const prompt = buildPrompt(input);

  // Non-streaming Groq
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 400,
            temperature: 0.5,
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) return { text, source: "groq" };
      }
    } catch {
      // fall through
    }
  }

  // Non-streaming Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 400, temperature: 0.5 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
        if (text) return { text, source: "gemini" };
      }
    } catch {
      // fall through
    }
  }

  return { text: fallbackSummary(input), source: "fallback" };
}