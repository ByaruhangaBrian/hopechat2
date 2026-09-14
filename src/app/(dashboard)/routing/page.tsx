import { Metadata } from "next";
import { FlowBuilderScreen } from "@/components/routing/flow-builder";

export const metadata: Metadata = {
  title: "Routing Flows | HopeChat",
  description: "Build multi-level screening flows that route customers to the right test via WhatsApp.",
};

export default function RoutingFlowsPage() {
  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
      <FlowBuilderScreen />
    </div>
  );
}