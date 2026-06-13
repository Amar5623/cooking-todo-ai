"use client";

import { useState, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DietPreference = "veg" | "vegan" | "non-veg" | "gluten-free" | "dairy-free";
type MealType = "breakfast" | "lunch" | "dinner";

interface GroceryItem {
  name: string;
  qty: number;
  unit: string;
  estCost: number;
  haveInPantry: boolean;
}

interface BudgetSwap {
  mealType: string;
  from: string;
  to: string;
  savedAmount: number;
}

interface PlanResponse {
  plan: Record<string, { name: string; totalCost: number; costTier: string }>;
  groceryList: GroceryItem[];
  groceryTotal: number;
  substitutions: { mealName: string; ingredient: string; alternative: string; reason: string }[];
  budget: {
    estimatedCost: number;
    budget: number;
    feasible: boolean;
    difference: number;
    swapsApplied: BudgetSwap[];
    message: string;
  };
}

// ─── Static config ────────────────────────────────────────────────────────────

const DIET_OPTIONS: { value: DietPreference; label: string; emoji: string; desc: string }[] = [
  { value: "veg", label: "Vegetarian", emoji: "🥦", desc: "No meat or fish" },
  { value: "vegan", label: "Vegan", emoji: "🌱", desc: "No animal products" },
  { value: "non-veg", label: "Non-veg", emoji: "🍗", desc: "All meals welcome" },
  { value: "gluten-free", label: "Gluten-free", emoji: "🌾", desc: "No wheat / gluten" },
  { value: "dairy-free", label: "Dairy-free", emoji: "🥛", desc: "No milk products" },
];

const MEAL_OPTIONS: { value: MealType; label: string; emoji: string; time: string }[] = [
  { value: "breakfast", label: "Breakfast", emoji: "🌅", time: "Morning" },
  { value: "lunch", label: "Lunch", emoji: "☀️", time: "Afternoon" },
  { value: "dinner", label: "Dinner", emoji: "🌙", time: "Evening" },
];

const MEAL_EMOJI: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
};

const COST_TIER_COLOR: Record<string, string> = {
  low: "text-emerald-600 bg-emerald-50",
  medium: "text-amber-600  bg-amber-50",
  high: "text-red-600    bg-red-50",
};

// ─── Tag input component ──────────────────────────────────────────────────────

function TagInput({
  id,
  label,
  hint,
  placeholder,
  tags,
  onAdd,
  onRemove,
}: {
  id: string;
  label: string;
  hint: string;
  placeholder: string;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && !tags.includes(trimmed.toLowerCase())) {
      onAdd(trimmed.toLowerCase());
    }
    setDraft("");
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold mb-1">
        {label}
      </label>
      <p className="text-xs text-stone-500 mb-2">{hint}</p>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            }
          }}
          className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-transparent"
          aria-describedby={`${id}-hint`}
        />
        <button
          type="button"
          onClick={commit}
          className="px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-600 hover:bg-stone-100 transition-colors"
          aria-label={`Add ${label.toLowerCase()} tag`}
        >
          Add
        </button>
      </div>
      {tags.length > 0 && (
        <ul
          className="flex flex-wrap gap-2 mt-2"
          aria-label={`${label} tags`}
        >
          {tags.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => onRemove(tag)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                {tag}
                <span aria-hidden="true" className="text-amber-600">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <span id={`${id}-hint`} className="sr-only">
        Press Enter or comma to add a tag. Click a tag to remove it.
      </span>
    </div>
  );
}

// ─── Streaming summary display ────────────────────────────────────────────────

function SummarySection({
  text,
  source,
  streaming,
}: {
  text: string;
  source: "groq" | "gemini" | "fallback" | null;
  streaming: boolean;
}) {
  const sourceLabel =
    source === "fallback"
      ? "Generated locally"
      : source === "groq"
        ? "AI via Groq"
        : source === "gemini"
          ? "AI via Gemini"
          : null;

  return (
    <section
      className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6"
      aria-label="Cooking to-do list"
      aria-live="polite"
      aria-busy={streaming}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-stone-800 flex items-center gap-2">
          <span aria-hidden="true">📋</span> Your cooking to-do list
        </h2>
        {sourceLabel && (
          <span className="text-xs text-stone-400 uppercase tracking-wide">
            {sourceLabel}
          </span>
        )}
      </div>

      {text ? (
        <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
          {text}
          {streaming && (
            <span
              className="inline-block w-1.5 h-4 ml-0.5 bg-amber-700 align-text-bottom animate-pulse"
              aria-hidden="true"
            />
          )}
        </p>
      ) : (
        <div className="flex items-center gap-3 text-stone-400 text-sm">
          <span
            className="inline-block w-4 h-4 border-2 border-amber-700 border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
          Generating your to-do list…
        </div>
      )}
    </section>
  );
}

// ─── Result view ──────────────────────────────────────────────────────────────

function ResultView({
  result,
  summaryText,
  summarySource,
  streaming,
}: {
  result: PlanResponse;
  summaryText: string;
  summarySource: "groq" | "gemini" | "fallback" | null;
  streaming: boolean;
}) {
  const { plan, groceryList, groceryTotal, substitutions, budget } = result;

  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      {/* Budget verdict banner */}
      <div
        role="status"
        className={`rounded-2xl px-5 py-4 flex items-start gap-3 ${budget.feasible
            ? "bg-emerald-50 border border-emerald-200"
            : "bg-red-50 border border-red-200"
          }`}
      >
        <span className="text-xl" aria-hidden="true">
          {budget.feasible ? "✅" : "⚠️"}
        </span>
        <div>
          <p
            className={`text-sm font-semibold ${budget.feasible ? "text-emerald-800" : "text-red-800"
              }`}
          >
            {budget.feasible ? "Budget looks good" : "Over budget"}
          </p>
          <p
            className={`text-xs mt-0.5 ${budget.feasible ? "text-emerald-700" : "text-red-700"
              }`}
          >
            {budget.message}
          </p>
          {budget.swapsApplied.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1" aria-label="Meal swaps applied">
              {budget.swapsApplied.map((swap, i) => (
                <li key={i} className="text-xs text-stone-600">
                  <span className="font-medium capitalize">{swap.mealType}</span>:{" "}
                  {swap.from} → {swap.to}{" "}
                  <span className="text-emerald-700">(saved ₹{swap.savedAmount})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Meal plan */}
      <section
        className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6"
        aria-labelledby="meal-plan-heading"
      >
        <h2
          id="meal-plan-heading"
          className="text-base font-bold text-stone-800 mb-4 flex items-center gap-2"
        >
          <span aria-hidden="true">🍽️</span> Today&apos;s meal plan
        </h2>
        <ul className="flex flex-col gap-3">
          {Object.entries(plan).map(([type, meal]) => (
            <li
              key={type}
              className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100"
            >
              <span className="text-xl" aria-hidden="true">
                {MEAL_EMOJI[type] ?? "🍴"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 capitalize">
                  {type}
                </p>
                <p className="text-sm font-medium text-stone-800 truncate">
                  {meal.name}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-stone-700">₹{meal.totalCost}</p>
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${COST_TIER_COLOR[meal.costTier] ?? "text-stone-500 bg-stone-100"
                    }`}
                >
                  {meal.costTier}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Grocery list */}
      <section
        className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6"
        aria-labelledby="grocery-heading"
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            id="grocery-heading"
            className="text-base font-bold text-stone-800 flex items-center gap-2"
          >
            <span aria-hidden="true">🛒</span> Grocery list
          </h2>
          <span className="text-sm font-semibold text-stone-700">
            Total: ₹{groceryTotal}
          </span>
        </div>
        <ul className="flex flex-col gap-2" aria-label="Ingredients to buy">
          {groceryList.map((item, i) => (
            <li
              key={i}
              className={`flex items-center justify-between text-sm gap-3 px-3 py-2 rounded-lg ${item.haveInPantry
                  ? "opacity-50 bg-stone-50"
                  : "bg-white border border-stone-100"
                }`}
            >
              <span
                className={
                  item.haveInPantry
                    ? "line-through text-stone-400"
                    : "text-stone-700"
                }
              >
                {item.name}{" "}
                <span className="text-stone-400 font-normal">
                  {item.qty}
                  {item.unit}
                </span>
              </span>
              <span className="shrink-0 text-xs font-medium text-stone-500">
                {item.haveInPantry ? "in pantry" : `₹${item.estCost}`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Substitutions */}
      {substitutions.length > 0 && (
        <section
          className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6"
          aria-labelledby="subs-heading"
        >
          <h2
            id="subs-heading"
            className="text-base font-bold text-stone-800 mb-4 flex items-center gap-2"
          >
            <span aria-hidden="true">🔄</span> Suggested substitutions
          </h2>
          <ul className="flex flex-col gap-3">
            {substitutions.map((sub, i) => (
              <li
                key={i}
                className="text-sm bg-amber-50 border border-amber-100 rounded-xl px-4 py-3"
              >
                <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide mb-1">
                  {sub.mealName}
                </p>
                <p className="text-stone-700">
                  Replace{" "}
                  <span className="font-medium text-stone-900">{sub.ingredient}</span>{" "}
                  with{" "}
                  <span className="font-medium text-stone-900">{sub.alternative}</span>
                </p>
                <p className="text-xs text-stone-500 mt-0.5">{sub.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* AI summary (streaming) */}
      <SummarySection
        text={summaryText}
        source={summarySource}
        streaming={streaming}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PlannerApp() {
  const [dietPreference, setDietPreference] = useState<DietPreference>("veg");
  const [budget, setBudget] = useState<number>(200);
  const [mealsNeeded, setMealsNeeded] = useState<MealType[]>([
    "breakfast",
    "lunch",
    "dinner",
  ]);
  const [avoidTags, setAvoidTags] = useState<string[]>([]);
  const [pantryTags, setPantryTags] = useState<string[]>([]);

  const [result, setResult] = useState<PlanResponse | null>(null);
  const [summaryText, setSummaryText] = useState("");
  const [summarySource, setSummarySource] = useState<
    "groq" | "gemini" | "fallback" | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function toggleMeal(meal: MealType) {
    setMealsNeeded((prev) =>
      prev.includes(meal) ? prev.filter((m) => m !== meal) : [...prev, meal]
    );
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (mealsNeeded.length === 0) {
        setError("Please select at least one meal to plan.");
        return;
      }

      // Cancel any in-flight request
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      setLoading(true);
      setStreaming(false);
      setError(null);
      setResult(null);
      setSummaryText("");
      setSummarySource(null);

      try {
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dietPreference,
            budget,
            mealsNeeded,
            avoid: avoidTags,
            pantry: pantryTags,
          }),
          signal: abort.signal,
        });

        if (!res.ok || !res.body) {
          // Non-streaming error responses
          let errMsg = "Something went wrong. Please try again.";
          try {
            const errData = await res.json();
            errMsg = errData.error ?? errMsg;
          } catch { /* ignore */ }
          setError(errMsg);
          setLoading(false);
          return;
        }

        // ── Read newline-delimited JSON stream ─────────────────────────────
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        setLoading(false);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            let msg: { type: string; payload: unknown };
            try {
              msg = JSON.parse(trimmed);
            } catch {
              continue;
            }

            if (msg.type === "data") {
              setResult(msg.payload as PlanResponse);
              setStreaming(true);
            } else if (msg.type === "chunk") {
              setSummaryText((prev) => prev + (msg.payload as string));
            } else if (msg.type === "done") {
              setSummarySource(msg.payload as "groq" | "gemini" | "fallback");
              setStreaming(false);
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError("Could not reach the planner. Check your connection and try again.");
        setLoading(false);
        setStreaming(false);
      }
    },
    [dietPreference, budget, mealsNeeded, avoidTags, pantryTags]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        aria-label="Meal planning preferences"
        noValidate
        className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 flex flex-col gap-6 shadow-sm"
      >
        {/* Diet preference */}
        <fieldset>
          <legend className="text-sm font-semibold text-stone-800 mb-3">
            Diet preference
          </legend>
          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            role="group"
            aria-required="true"
          >
            {DIET_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex flex-col gap-0.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-all ${dietPreference === opt.value
                    ? "border-amber-700 bg-amber-50 ring-1 ring-amber-700"
                    : "border-stone-200 hover:border-stone-300 bg-stone-50"
                  }`}
              >
                <input
                  type="radio"
                  name="dietPreference"
                  value={opt.value}
                  checked={dietPreference === opt.value}
                  onChange={() => setDietPreference(opt.value)}
                  className="sr-only"
                />
                <span className="text-base leading-none">{opt.emoji}</span>
                <span className="text-sm font-medium text-stone-800">
                  {opt.label}
                </span>
                <span className="text-[11px] text-stone-500">{opt.desc}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Meals needed */}
        <fieldset>
          <legend className="text-sm font-semibold text-stone-800 mb-3">
            Meals to plan
          </legend>
          <div className="flex gap-3 flex-wrap">
            {MEAL_OPTIONS.map((opt) => {
              const active = mealsNeeded.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 cursor-pointer transition-all ${active
                      ? "border-amber-700 bg-amber-50 ring-1 ring-amber-700"
                      : "border-stone-200 hover:border-stone-300 bg-stone-50"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleMeal(opt.value)}
                    className="sr-only"
                    aria-label={opt.label}
                  />
                  <span aria-hidden="true">{opt.emoji}</span>
                  <span className="text-sm font-medium text-stone-800">
                    {opt.label}
                  </span>
                  <span className="text-[11px] text-stone-500">{opt.time}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Budget */}
        <div>
          <label
            htmlFor="budget"
            className="block text-sm font-semibold text-stone-800 mb-1"
          >
            Daily grocery budget
          </label>
          <p className="text-xs text-stone-500 mb-2">
            We&apos;ll auto-swap meals to stay within this amount.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-stone-500">₹</span>
            <input
              id="budget"
              type="number"
              min={1}
              step={10}
              value={budget}
              onChange={(e) => setBudget(Math.max(1, Number(e.target.value)))}
              className="w-36 border border-stone-200 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:border-transparent"
              aria-label="Daily grocery budget in rupees"
            />
            <span className="text-sm text-stone-500">INR</span>
          </div>
        </div>

        {/* Avoid tags */}
        <TagInput
          id="avoid"
          label="Allergies or dislikes"
          hint="Type an ingredient and press Enter to add it."
          placeholder="e.g. nuts, coconut milk"
          tags={avoidTags}
          onAdd={(t) => setAvoidTags((p) => [...p, t])}
          onRemove={(t) => setAvoidTags((p) => p.filter((x) => x !== t))}
        />

        {/* Pantry tags */}
        <TagInput
          id="pantry"
          label="Already in your pantry"
          hint="These won't count toward your grocery cost."
          placeholder="e.g. rice, oil, onion"
          tags={pantryTags}
          onAdd={(t) => setPantryTags((p) => [...p, t])}
          onRemove={(t) => setPantryTags((p) => p.filter((x) => x !== t))}
        />

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || streaming}
          className="w-full sm:w-auto self-start bg-amber-800 text-white font-semibold rounded-xl px-6 py-3 hover:bg-amber-900 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2"
          aria-live="polite"
        >
          {loading
            ? "Planning your day…"
            : streaming
              ? "Writing your to-do list…"
              : "Generate my cooking plan"}
        </button>

        {error && (
          <p
            role="alert"
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
          >
            {error}
          </p>
        )}
      </form>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {result && (
        <ResultView
          result={result}
          summaryText={summaryText}
          summarySource={summarySource}
          streaming={streaming}
        />
      )}
    </div>
  );
}