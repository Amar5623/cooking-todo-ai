# Daily Cooking Planner

An AI-assisted micro-app that generates a personalized cooking to-do list for
a day: a breakfast/lunch/dinner plan, a consolidated grocery list, ingredient
substitutions based on diet and allergies, and a budget feasibility check
that automatically adjusts the plan if it's too expensive.

Built for the PromptWars Ahmedabad warm-up challenge ("A cooking to-do list").

## Chosen vertical

**Budget-conscious home cook** — someone planning their day's meals around a
diet preference (vegetarian, vegan, non-vegetarian, gluten-free, dairy-free),
a daily grocery budget, allergies/dislikes, and ingredients already in their
pantry.

## Approach and logic

The app is split into a **deterministic logic core** and an **optional AI
summarization layer**, so the core feature works correctly and instantly
even without any API keys.

### 1. Meal planning (`src/lib/mealPlanner.ts`)
A small curated meal dataset (`src/lib/data.ts`) is filtered by diet
compatibility and by ingredients the user wants to avoid. For each requested
meal slot (breakfast/lunch/dinner), the cheapest compatible meal is selected
by default.

### 2. Grocery list (`src/lib/groceryList.ts`)
Ingredients across all planned meals are aggregated (quantities and costs
merged for repeated ingredients), and items the user already has in their
pantry are flagged so they're excluded from the cost total.

### 3. Substitutions (`src/lib/substitutions.ts`)
A rule-based engine checks each ingredient in the plan against the user's
diet preference and avoid-list (e.g. paneer → tofu for vegan, wheat flour →
gluten-free flour for gluten-free, milk → almond/soy milk for dairy-free).
Each suggestion includes the meal it applies to and the reason.

### 4. Budget feasibility (`src/lib/budget.ts`)
This is the core "logical decision making" piece. The engine:
1. Computes the total grocery cost of the initial plan (minus pantry items).
2. If the cost exceeds the user's budget, it repeatedly finds the most
   expensive meal in the plan and swaps it for the cheapest compatible
   alternative of the same meal type (respecting diet preference and
   avoid-list).
3. Stops when the plan fits the budget, or when no cheaper alternative
   exists — in which case it reports the shortfall and suggests next steps
   (increase budget, use more pantry items, or reduce meal count).
4. Returns a full log of every swap made, so the user can see exactly what
   changed and why.

### 5. AI summary (`src/lib/llm.ts`)
The structured plan/grocery/substitution/budget data is sent to **Groq**
(primary, fast Llama 3.1 model) to generate a friendly, conversational
to-do list. If Groq is unavailable, it falls back to **Gemini**. If both are
unavailable (e.g. no API keys configured), a deterministic template-based
summary is generated locally — the app never breaks due to missing AI
credentials.

## How the solution works (end to end)

1. User fills in diet preference, meals needed, daily budget, ingredients to
   avoid, and pantry items already on hand.
2. `POST /api/plan` validates input, then runs: meal planning → budget
   evaluation (with automatic swaps if needed) → grocery list generation →
   substitution suggestions → AI summary generation.
3. The UI renders the final plan, grocery list (with pantry items struck
   through), substitution suggestions, a budget feasibility verdict (with
   any swaps explained), and a natural-language to-do list.

## Running locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

To enable AI-generated summaries, copy `.env.example` to `.env.local` and
add a `GROQ_API_KEY` and/or `GEMINI_API_KEY`. The app works fully without
these — it falls back to a local template-based summary.

## Running tests

```bash
npm test
```

Covers meal planning (diet filtering, avoid-list handling, cheaper
alternative selection), grocery list aggregation, substitution rules, and
budget feasibility (including the swap-until-feasible loop).

## Deployment

Deployed on Vercel. Push to GitHub and import the repo on Vercel — no
configuration needed beyond optionally adding `GROQ_API_KEY` /
`GEMINI_API_KEY` as environment variables for AI summaries.

## Assumptions

- All costs are illustrative single-serving estimates in ₹ (INR), based on a
  small fixed meal/ingredient dataset rather than live grocery prices.
- "Non-vegetarian" diet preference is treated as unrestricted (can eat any
  meal, including vegetarian ones); "vegetarian", "vegan", "gluten-free",
  and "dairy-free" require the meal to carry that specific tag.
- The budget feasibility loop only swaps within the same meal type (e.g. a
  lunch is only swapped for another lunch), and only if the alternative is
  strictly cheaper and still respects diet/avoid constraints.
- Pantry items are matched by exact (case-insensitive) ingredient name and
  are excluded from cost, not from the displayed grocery list (so the user
  still sees what they need, but isn't charged for it).
- AI summary generation is an enhancement layer only; the app's correctness
  does not depend on any external API being available.

## Security and accessibility notes

- API keys are read from environment variables only, never hardcoded or
  exposed to the client.
- API input is validated server-side (diet preference, budget, meal types,
  and array fields are type- and value-checked before use).
- The form uses semantic HTML (`label`, `fieldset`/`legend`, `aria-live` for
  results), visible focus states, and sufficient color contrast.
