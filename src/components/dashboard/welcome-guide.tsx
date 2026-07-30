"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Users,
  Cpu,
  Bot,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

const GUIDE_KEY = "hopechat_welcome_dismissed";

const steps = [
  {
    icon: MessageSquare,
    title: "Inbox — Your Command Center",
    description:
      "All customer conversations land here. Reply to messages, assign chats to teammates, and never miss a lead.",
    href: "/inbox",
  },
  {
    icon: Users,
    title: "Contacts — Know Your Customers",
    description:
      "View contact details, conversation history, and segment your audience for targeted messaging.",
    href: "/contacts",
  },
  {
    icon: Bot,
    title: "AI Assistant — Automate Replies",
    description:
      "Let AI handle common questions automatically. Train it on your business info for accurate, on-brand responses.",
    href: "/settings/ai",
  },
  {
    icon: Cpu,
    title: "Automations — Work Smarter",
    description:
      "Set up triggers and actions to automate follow-ups, welcome messages, and more.",
    href: "/automations",
  },
];

export function WelcomeGuide() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(GUIDE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(GUIDE_KEY, "true");
    setOpen(false);
  };

  const handleNavigate = (href: string) => {
    handleDismiss();
    router.push(href);
  };

  const current = steps[step];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-lg gap-0 p-0 overflow-hidden">
        <div className="p-6 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
                <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Welcome to HopeChat!</DialogTitle>
                <DialogDescription className="text-muted-foreground mt-1">
                  Your account is ready. Here&apos;s where to start:
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex gap-1.5 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="min-h-[120px]">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <current.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-foreground">{current.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {current.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between p-4 pt-2 border-t border-border/50 bg-muted/20">
          <Button variant="ghost" onClick={handleDismiss} className="text-muted-foreground">
            Skip guide
          </Button>
          <div className="flex gap-2">
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Next
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => handleNavigate(current.href)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Go to {current.title.split("—")[0].trim()}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
