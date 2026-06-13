"use client";

import { useState, FormEvent } from "react";

type DietPreference = "veg" | "vegan" | "non-veg" | "gluten-free" | "dairy-free";
type MealType = "breakfast" | "lunch" | "dinner";

interface PlanResponse {
  plan: Record<string, { name: string; totalCost: number; costTier: string }>;
  groceryList: { name: string; qty: number; unit: string; estCost: number; haveInPantry: boolean }[];
  groceryTotal: number;
  substitutions: { mealName: string; ingredient: string; alternative: string; reason: string }[];
  budget: {
    estimatedCost: number;
    budget: number;
    feasible: boolean;
    difference: number;
    swapsApplied: { mealType: string; from: string; to: string; savedAmount: number }[];
    message: string;
  };
  summary: string;
  summarySource: "groq" | "gemini" | "fallback";
}

const DIET_OPTIONS: { value: DietPreference; label: string }[] = [
  { value: "veg", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "non-veg", label: "Non-vegetarian" },
  { value: "gluten-free", label: "Gluten-free" },
  { value: "dairy-free", label: "Dairy-free" },
];

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
];

export default function PlannerApp() {
  const [dietPreference, setDietPreference] = useState<DietPreference>("veg");
  const [budget, setBudget] = useState<number>(200);
  const [mealsNeeded, setMealsNeeded] = useState<MealType[]>(["breakfast", "lunch", "dinner"]);
  const [avoidInput, setAvoidInput] = useState("");
  const [pantryInput, setPantryInput] = useState("");

  const [result, setResult] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleMeal(meal: MealType) {
    setMealsNeeded((prev) =>
      prev.includes(meal) ? prev.filter((m) => m !== meal) : [...prev, meal]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    if (mealsNeeded.length === 0) {
      setError("Select at least one meal to plan for.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dietPreference,
          budget,
          mealsNeeded,
          avoid: avoidInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          pantry: pantryInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setResult(data);
    } catch {
      setError("Could not reach the planner. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#E6DCC8] rounded-xl p-5 sm:p-6 flex flex-col gap-5"
        aria-label="Meal planning preferences"
      >
        <div>
          <label htmlFor="diet" className="block text-sm font-semibold mb-1.5">
            Diet preference
          </label>
          <select
            id="diet"
            value={dietPreference}
            onChange={(e) => setDietPreference(e.target.value as DietPreference)}
            className="w-full border border-[#D9CDB6] rounded-md px-3 py-2 bg-[#FBF6EE] focus:outline-none focus:ring-2 focus:ring-[#B5651D]"
          >
            {DIET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold mb-1.5">Meals to plan</legend>
          <div className="flex flex-wrap gap-3">
            {MEAL_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 border border-[#D9CDB6] rounded-md px-3 py-2 cursor-pointer bg-[#FBF6EE]"
              >
                <input
                  type="checkbox"
                  checked={mealsNeeded.includes(opt.value)}
                  onChange={() => toggleMeal(opt.value)}
                  className="accent-[#B5651D]"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="budget" className="block text-sm font-semibold mb-1.5">
            Daily grocery budget (₹)
          </label>
          <input
            id="budget"
            type="number"
            min={1}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full border border-[#D9CDB6] rounded-md px-3 py-2 bg-[#FBF6EE] focus:outline-none focus:ring-2 focus:ring-[#B5651D]"
          />
        </div>

        <div>
          <label htmlFor="avoid" className="block text-sm font-semibold mb-1.5">
            Ingredients to avoid (allergies or dislikes)
          </label>
          <input
            id="avoid"
            type="text"
            placeholder="e.g. coconut milk, nuts"
            value={avoidInput}
            onChange={(e) => setAvoidInput(e.target.value)}
            className="w-full border border-[#D9CDB6] rounded-md px-3 py-2 bg-[#FBF6EE] focus:outline-none focus:ring-2 focus:ring-[#B5651D]"
          />
          <p className="text-xs text-[#8A8270] mt-1">Separate multiple items with commas.</p>
        </div>

        <div>
          <label htmlFor="pantry" className="block text-sm font-semibold mb-1.5">
            Ingredients you already have
          </label>
          <input
            id="pantry"
            type="text"
            placeholder="e.g. rice, onion, oil"
            value={pantryInput}
            onChange={(e) => setPantryInput(e.target.value)}
            className="w-full border border-[#D9CDB6] rounded-md px-3 py-2 bg-[#FBF6EE] focus:outline-none focus:ring-2 focus:ring-[#B5651D]"
          />
          <p className="text-xs text-[#8A8270] mt-1">
            These won&apos;t be added to your grocery list cost.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-[#B5651D] text-white font-semibold rounded-md px-4 py-2.5 hover:bg-[#9A5418] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Planning your day…" : "Generate my cooking to-do list"}
        </button>

        {error && (
          <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}
      </form>

      {result && <ResultView result={result} />}
    </div>
  );
}

function ResultView({ result }: { result: PlanResponse }) {
  return (
    <div className="flex flex-col gap-6" aria-live="polite">
      <section className="bg-white border border-[#E6DCC8] rounded-xl p-5 sm:p-6">
        <h2 className="text-lg font-bold mb-3">Today&apos;s meal plan</h2>
        <ul className="flex flex-col gap-2">
          {Object.entries(result.plan).map(([type, meal]) => (
            <li key={type} className="flex items-baseline justify-between gap-4">
              <span className="capitalize text-sm font-medium text-[#5C5648] w-24">{type}</span>
              <span className="flex-1">{meal.name}</span>
              <span className="text-sm text-[#8A8270]">₹{meal.totalCost}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white border border-[#E6DCC8] rounded-xl p-5 sm:p-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold">Grocery list</h2>
          <span className="text-sm text-[#8A8270]">Total: ₹{result.groceryTotal}</span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {result.groceryList.map((item, i) => (
            <li key={i} className="flex items-baseline justify-between gap-4 text-sm">
              <span className={item.haveInPantry ? "line-through text-[#A8A096]" : ""}>
                {item.name} — {item.qty}{item.unit}
              </span>
              <span className="text-[#8A8270]">
                {item.haveInPantry ? "in pantry" : `₹${item.estCost}`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {result.substitutions.length > 0 && (
        <section className="bg-white border border-[#E6DCC8] rounded-xl p-5 sm:p-6">
          <h2 className="text-lg font-bold mb-3">Suggested substitutions</h2>
          <ul className="flex flex-col gap-2">
            {result.substitutions.map((sub, i) => (
              <li key={i} className="text-sm">
                In <span className="font-medium">{sub.mealName}</span>: swap{" "}
                <span className="font-medium">{sub.ingredient}</span> for{" "}
                <span className="font-medium">{sub.alternative}</span>{" "}
                <span className="text-[#8A8270]">({sub.reason})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        className={`rounded-xl p-5 sm:p-6 border ${
          result.budget.feasible
            ? "bg-[#EFF6E9] border-[#C8DEB8]"
            : "bg-[#FBEDEA] border-[#E8C2B8]"
        }`}
      >
        <h2 className="text-lg font-bold mb-2">Budget feasibility</h2>
        <p className="text-sm mb-2">{result.budget.message}</p>
        {result.budget.swapsApplied.length > 0 && (
          <ul className="flex flex-col gap-1 mt-2">
            {result.budget.swapsApplied.map((swap, i) => (
              <li key={i} className="text-sm text-[#5C5648]">
                {swap.mealType}: {swap.from} → {swap.to} (saved ₹{swap.savedAmount})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white border border-[#E6DCC8] rounded-xl p-5 sm:p-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold">Your cooking to-do list</h2>
          <span className="text-xs text-[#8A8270] uppercase tracking-wide">
            {result.summarySource === "fallback" ? "generated locally" : `via ${result.summarySource}`}
          </span>
        </div>
        <p className="text-sm whitespace-pre-line leading-relaxed">{result.summary}</p>
      </section>
    </div>
  );
}
