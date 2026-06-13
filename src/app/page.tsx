import PlannerApp from "@/components/PlannerApp";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FBF6EE] text-[#2E2A24]">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <header className="mb-8">
          <p className="text-sm font-medium tracking-wide uppercase text-[#B5651D]">
            Daily Cooking Planner
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold mt-2 leading-tight">
            What&apos;s on the stove today?
          </h1>
          <p className="mt-3 text-[#5C5648] max-w-xl">
            Tell us your diet, budget, and what&apos;s already in your kitchen.
            We&apos;ll plan your meals, build your grocery list, suggest
            substitutions, and check if it fits your budget.
          </p>
        </header>

        <PlannerApp />
      </div>
    </main>
  );
}
