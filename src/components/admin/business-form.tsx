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
import { Building2, User, Phone, CheckCircle2, ChevronRight, ChevronLeft, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SubscriptionTier {
  id: string;
  name: string;
  price_ugx: number;
  base_credits_monthly: number;
  max_team_seats: number;
  allow_broadcasts: boolean;
  allow_flows: boolean;
  allow_multimodal: boolean;
}

interface BusinessFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  tiers?: SubscriptionTier[];
  title: string;
  description: string;
}

export function BusinessForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  tiers = [],
  title,
  description,
}: BusinessFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Business
  const [name, setName] = useState(initialData?.name ?? "");
  const [status, setStatus] = useState(initialData?.status ?? "active");
  const [tierId, setTierId] = useState(initialData?.tier_id ?? "bronze");

  // Reset form when initialData changes or dialog opens
  useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "");
      setStatus(initialData?.status ?? "active");
      setTierId(initialData?.tier_id ?? "bronze");
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
      const selectedTier = tiers.find(t => t.id === tierId);
      const data = isEdit 
        ? { 
            name, 
            status, 
            tier_id: tierId,
            plan_tier: tierId,
            features: {
              ai_enabled: true,
              inbox_enabled: true,
              contacts_enabled: true,
              broadcasts_enabled: selectedTier?.allow_broadcasts ?? false,
              flows_enabled: selectedTier?.allow_flows ?? false,
              multimodal_enabled: selectedTier?.allow_multimodal ?? false,
              automations_enabled: true,
              pipelines_enabled: true,
            }
          }
        : {
            business_name: name,
            tier_id: tierId,
            plan_tier: tierId,
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

  const selectedTier = tiers.find(t => t.id === tierId);

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) setTimeout(resetForm, 300);
    }}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        {!isEdit && (
          <div className="flex items-center justify-between mb-8 px-2">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  step === s.id ? "border-primary bg-primary/10 text-primary" :
                  step > s.id ? "border-emerald-500 bg-emerald-500 text-white" : "border-border text-muted-foreground/60"
                )}>
                  {step > s.id ? <CheckCircle2 className="h-5 w-5" /> : <s.icon className="h-4 w-4" />}
                </div>
                {i < steps.length - 1 && (
                  <div className={cn(
                    "h-0.5 flex-1 mx-2",
                    step > s.id ? "bg-emerald-500" : "bg-muted"
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
                <Label htmlFor="name" className="text-muted-foreground">Business Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kampala Retail Shop"
                  required
                  className="bg-muted border-border text-foreground focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="bg-muted border-border text-foreground">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border text-foreground">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="trialing">Trialing</SelectItem>
                      <SelectItem value="past_due">Past Due</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Subscription Tier</Label>
                  <Select value={tierId} onValueChange={setTierId}>
                    <SelectTrigger className="bg-muted border-border text-foreground">
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent className="bg-muted border-border text-foreground">
                      {tiers.length > 0 ? tiers.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-2">
                            <Zap className="h-3 w-3" />
                            {t.name}
                            <span className="text-xs text-muted-foreground">UGX {t.price_ugx.toLocaleString()}/mo</span>
                          </div>
                        </SelectItem>
                      )) : (
                        <>
                          <SelectItem value="bronze">Bronze (UGX 65,000/mo)</SelectItem>
                          <SelectItem value="silver">Silver (UGX 180,000/mo)</SelectItem>
                          <SelectItem value="gold">Gold (UGX 450,000/mo)</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tier Preview */}
              {selectedTier && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      selectedTier.id === "bronze" ? "bg-amber-600" :
                      selectedTier.id === "silver" ? "bg-slate-400" : "bg-yellow-500"
                    )} />
                    <span className="text-sm font-bold text-foreground">{selectedTier.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">UGX {selectedTier.price_ugx.toLocaleString()}/mo</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div><span className="font-semibold text-foreground">{selectedTier.base_credits_monthly.toLocaleString()}</span> credits/mo</div>
                    <div><span className="font-semibold text-foreground">{selectedTier.max_team_seats}</span> seats</div>
                    <div className="flex gap-1">
                      {selectedTier.allow_broadcasts && <span className="px-1 py-0.5 rounded bg-primary/10 text-primary text-[9px]">Broadcasts</span>}
                      {selectedTier.allow_flows && <span className="px-1 py-0.5 rounded bg-primary/10 text-primary text-[9px]">Flows</span>}
                      {selectedTier.allow_multimodal && <span className="px-1 py-0.5 rounded bg-primary/10 text-primary text-[9px]">Multimodal</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label htmlFor="ownerName" className="text-muted-foreground">Full Name</Label>
                <Input
                  id="ownerName"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Nnalubega Sarah"
                  required
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerEmail" className="text-muted-foreground">Email Address</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="sarah@example.com"
                  required
                  className="bg-muted border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerPass" className="text-muted-foreground">Password</Label>
                <Input
                  id="ownerPass"
                  type="password"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-muted border-border text-foreground"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-400">
                Optional: You can provision WhatsApp credentials now or let the tenant configure them later from their dashboard.
              </div>
              <div className="space-y-2">
                <Label htmlFor="waPhone" className="text-muted-foreground">Phone Number ID</Label>
                <Input
                  id="waPhone"
                  value={waPhoneId}
                  onChange={(e) => setWaPhoneId(e.target.value)}
                  placeholder="e.g. 1029384756..."
                  className="bg-muted border-border text-foreground font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waWaba" className="text-muted-foreground">WABA ID</Label>
                <Input
                  id="waWaba"
                  value={waWabaId}
                  onChange={(e) => setWaWabaId(e.target.value)}
                  placeholder="e.g. 5647382910..."
                  className="bg-muted border-border text-foreground font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waToken" className="text-muted-foreground">Permanent Access Token</Label>
                <Input
                  id="waToken"
                  type="password"
                  value={waToken}
                  onChange={(e) => setWaToken(e.target.value)}
                  placeholder="EAAB..."
                  className="bg-muted border-border text-foreground font-mono text-xs"
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
                  className="border-border text-muted-foreground hover:text-foreground"
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
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-primary text-white min-w-[100px]"
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
