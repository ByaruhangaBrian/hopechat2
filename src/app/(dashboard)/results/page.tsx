import { Metadata } from "next";
import { ResultsDashboard } from "@/components/results/results-dashboard";

export const metadata: Metadata = {
  title: "Results & Insights | HopeChat",
  description: "Track tests taken and which subjects or questions need attention.",
};

export default function ResultsPage() {
  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
      <ResultsDashboard />
    </div>
  );
}