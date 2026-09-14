import { Metadata } from "next";
import { TestCenterScreen } from "@/components/tests/test-center";

export const metadata: Metadata = {
  title: "Tests & Practice | HopeChat",
  description: "Practice drills, timed tests, routing flows and results analytics via WhatsApp.",
};

export default function MenusPage() {
  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
      <TestCenterScreen />
    </div>
  );
}
