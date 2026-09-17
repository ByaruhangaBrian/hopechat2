import {
  BookOpen,
  Mail,
  MessageSquare,
  Users,
  Tags,
  Workflow,
  Brain,
  ClipboardList,
  Megaphone,
  Coins,
  HelpCircle,
  Building2,
  type LucideIcon,
} from "lucide-react";

export interface DocsGroup {
  label: string;
  items: DocsItem[];
}

export interface DocsItem {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
}

export const docsGroups: DocsGroup[] = [
  {
    label: "Getting Started",
    items: [
      {
        title: "Overview",
        href: "/docs",
        description: "What HopeChat is and the setup path in order.",
        icon: BookOpen,
      },
      {
        title: "Create account & workspace",
        href: "/docs/account",
        description: "Sign up, name your workspace, and enter the dashboard.",
        icon: Building2,
      },
      {
        title: "Connect WhatsApp",
        href: "/docs/whatsapp",
        description: "Link your official WhatsApp Business number.",
        icon: MessageSquare,
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        title: "Team & permissions",
        href: "/docs/team",
        description: "Add members and control what each role can do.",
        icon: Users,
      },
      {
        title: "Message templates",
        href: "/docs/templates",
        description: "Create Meta-approved templates for broadcasts.",
        icon: Mail,
      },
      {
        title: "Contacts",
        href: "/docs/contacts",
        description: "Import and organise your contacts.",
        icon: Tags,
      },
    ],
  },
  {
    label: "Features",
    items: [
      {
        title: "Automations",
        href: "/docs/automations",
        description: "Reply automatically with no-code workflows.",
        icon: Workflow,
      },
      {
        title: "AI assistant",
        href: "/docs/ai",
        description: "Train the AI on your business documents.",
        icon: Brain,
      },
      {
        title: "Tests & Practice",
        href: "/docs/tests",
        description: "Run practice drills and timed exams on WhatsApp.",
        icon: ClipboardList,
      },
      {
        title: "Broadcasts",
        href: "/docs/broadcasts",
        description: "Send bulk WhatsApp and SMS campaigns.",
        icon: Megaphone,
      },
    ],
  },
  {
    label: "Plan & Support",
    items: [
      {
        title: "Billing & credits",
        href: "/docs/billing",
        description: "Plans, payments, and how credits are used.",
        icon: Coins,
      },
      {
        title: "FAQ & troubleshooting",
        href: "/docs/faq",
        description: "Answers to common setup questions.",
        icon: HelpCircle,
      },
    ],
  },
];

export const docsLinks = docsGroups.flatMap((group) => group.items);