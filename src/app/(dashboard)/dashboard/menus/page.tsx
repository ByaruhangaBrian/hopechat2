import { Metadata } from "next";
import { NodeBuilderScreen } from "@/components/menus/node-builder";

export const metadata: Metadata = {
  title: "Interactive Menus & Assessments | HopeChat",
  description: "Build nested WhatsApp interactive menus, quiz question banks, and subscreen flows for your customers.",
};

export default function MenusPage() {
  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
      <NodeBuilderScreen />
    </div>
  );
}
