"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, User, Phone, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BusinessFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  title: string;
  description: string;
}

export function BusinessForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  title,
  description,
}: BusinessFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Business
  const [name, setName] = useState(initialData?.name ?? "");
  const [status, setStatus] = useState(initialData?.status ?? "active");
  const [planTier, setPlanTier] = useState(initialData?.plan_tier ?? "basic");

  // Reset form when initialData changes or dialog opens
  useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "");
      setStatus(initialData?.status ?? "active");
      setPlanTier(initialData?.plan_tier ?? "basic");
      setStep(1);
    }
  }, [initialData, open]);

  // Step 2: Owner (only for new businesses)
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  // Step 3: WhatsApp (optional)
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waWabaId, setWaWabaId] = useState("");
  const [waToken, setWaToken] = useState("");

  const isEdit = !!initialData;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < (isEdit ? 1 : 3) && !isEdit) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    try {
      const data = isEdit 
        ? { 
            name, 
            status, 
            plan_tier: planTier
          }
        : {
            business_name: name,
            plan_tier: planTier,
            owner_name: ownerName,
            owner_email: ownerEmail,
            owner_password: ownerPassword,
            whatsapp: waPhoneId ? {
              phone_number_id: waPhoneId,
              waba_id: waWabaId,
              access_token: waToken
            } : null
          };

      await onSubmit(data);
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setName("");
    setOwnerName("");
    setOwnerEmail("");
    setOwnerPassword("");
    setWaPhoneId("");
    setWaWabaId("");
    setWaToken("");
  };

  const steps = isEdit ? [
    { id: 1, title: "Business Details", icon: Building2 }
  ] : [
    { id: 1, title: "Business", icon: Building2 },
    { id: 2, title: "Owner", icon: User },
    { id: 3, title: "WhatsApp", icon: Phone },
  ];

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) setTimeout(resetForm, 300);
    }}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">{title}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {description}
          </DialogDescription>
        </DialogHeader>

        {!isEdit && (
          <div className="flex items-center justify-between mb-8 px-2">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  step === s.id ? "border-violet-500 bg-violet-500/10 text-violet-500" :
                  step > s.id ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-800 text-slate-500"
                )}>
                  {step > s.id ? <CheckCircle2 className="h-5 w-5" /> : <s.icon className="h-4 w-4" />}
                </div>
                {i < steps.length - 1 && (
                  <div className={cn(
                    "h-0.5 flex-1 mx-2",
                    step > s.id ? "bg-emerald-500" : "bg-slate-800"
                  )} />
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">Business Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  required
                  className="bg-slate-800 border-slate-700 text-white focus:ring-violet-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trialing">Trialing</SelectItem>
                      <SelectItem value="past_due">Past Due</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Plan Tier</Label>
                  <Select value={planTier} onValueChange={setPlanTier}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label htmlFor="ownerName" className="text-slate-300">Full Name</Label>
                <Input
                  id="ownerName"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerEmail" className="text-slate-300">Email Address</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerPass" className="text-slate-300">Password</Label>
                <Input
                  id="ownerPass"
                  type="password"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-400">
                Optional: You can provision WhatsApp credentials now or let the tenant do it later.
              </div>
              <div className="space-y-2">
                <Label htmlFor="waPhone" className="text-slate-300">Phone Number ID</Label>
                <Input
                  id="waPhone"
                  value={waPhoneId}
                  onChange={(e) => setWaPhoneId(e.target.value)}
                  placeholder="e.g. 1029384756..."
                  className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waWaba" className="text-slate-300">WABA ID</Label>
                <Input
                  id="waWaba"
                  value={waWabaId}
                  onChange={(e) => setWaWabaId(e.target.value)}
                  placeholder="e.g. 5647382910..."
                  className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waToken" className="text-slate-300">Permanent Access Token</Label>
                <Input
                  id="waToken"
                  type="password"
                  value={waToken}
                  onChange={(e) => setWaToken(e.target.value)}
                  placeholder="EAAB..."
                  className="bg-slate-800 border-slate-700 text-white font-mono text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-6 flex justify-between sm:justify-between items-center w-full">
            <div className="flex gap-2">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="border-slate-800 text-slate-400 hover:text-white"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-violet-600 hover:bg-violet-500 text-white min-w-[100px]"
              >
                {loading ? "Processing..." : (
                  step < (isEdit ? 1 : 3) ? (
                    <>
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </>
                  ) : isEdit ? "Update Business" : "Create Environment"
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
