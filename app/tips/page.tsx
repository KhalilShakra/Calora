import { TipsFeed } from "@/components/tips/TipsFeed";

export default function TipsPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold">Coach</h1>
        <p className="text-sm text-ff-dim">
          Tips update with your goal, BMI, and what you have logged today.
        </p>
      </header>
      <TipsFeed />
    </div>
  );
}
