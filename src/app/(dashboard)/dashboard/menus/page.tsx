import { Metadata } from "next";
import { TestBuilderScreen } from "@/components/tests/test-builder";

export const metadata: Metadata = {
  title: "Tests & Practice | HopeChat",
  description: "Create practice drills or timed tests for your customers via WhatsApp.",
};

export default function MenusPage() {
  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
      <TestBuilderScreen />
    </div>
  );
}
