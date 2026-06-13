import PlannerApp from "@/components/PlannerApp";

export default function Home() {
  return (
    <>
      {/* Skip-to-content for keyboard / screen-reader users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <main
        id="main-content"
        className="min-h-screen bg-[#FBF6EE] text-stone-900"
      >
        <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
          {/* Header */}
          <header className="mb-8">
            <p className="text-xs font-semibold tracking-widest uppercase text-amber-800">
              Daily Cooking Planner
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold mt-2 leading-tight text-stone-900">
              What&apos;s cooking today?
            </h1>
            <p className="mt-3 text-stone-500 max-w-lg text-sm leading-relaxed">
              Tell us your diet, budget, and what&apos;s already in your
              kitchen — we&apos;ll build a personalised meal plan, grocery list,
              and step-by-step cooking to-do list in seconds.
            </p>
          </header>

          <PlannerApp />

          {/* Footer */}
          <footer className="mt-12 text-center text-xs text-stone-400">
            Costs are illustrative single-serving estimates in ₹ (INR).
          </footer>
        </div>
      </main>
    </>
  );
}