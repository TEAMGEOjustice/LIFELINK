import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MapPin, Award, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface DonorResponse {
  id: string;
  user_id: string;
  status: string;
  distance_km: number | null;
}

interface DonationConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emergencyId: string;
  hospitalId: string;
  acceptedDonors: DonorResponse[];
  donorNames: Record<string, string>;
  onConfirmed: () => void;
}

export function DonationConfirmDialog({
  open,
  onOpenChange,
  emergencyId,
  hospitalId,
  acceptedDonors,
  donorNames,
  onConfirmed,
}: DonationConfirmDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const toggle = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selected.size === 0) {
      return toast.error("Select at least one donor who donated, or close without selecting.");
    }
    setSubmitting(true);

    try {
      // Use the secure RPC to handle everything in one transaction
      const { error } = await supabase.rpc("confirm_hospital_donation", {
        _emergency_id: emergencyId,
        _donor_ids: Array.from(selected),
      });

      if (error) throw error;

      toast.success(`Emergency closed — ${selected.size} donor(s) credited with points, badges & certificates!`);
      onOpenChange(false);
      onConfirmed();
    } catch (err: any) {
      console.error("Confirmation error:", err);
      toast.error(err?.message || "Failed to confirm donation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseWithout = async () => {
    setSubmitting(true);
    const { error } = await supabase
      .from("emergency_requests")
      .update({ status: "closed" })
      .eq("id", emergencyId);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Emergency closed (no donations recorded)");
    onOpenChange(false);
    onConfirmed();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Award className="size-5 text-primary" />
            Confirm donations
          </DialogTitle>
          <DialogDescription className="text-sm">
            Select donors who actually donated blood. They will receive reward points, badges, and a certificate automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-3">
          {acceptedDonors.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No donors accepted this emergency.
            </p>
          )}
          {acceptedDonors.map((d, i) => (
            <motion.label
              key={d.user_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                selected.has(d.user_id)
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border/40 bg-surface hover:border-border"
              }`}
            >
              <Checkbox
                checked={selected.has(d.user_id)}
                onCheckedChange={() => toggle(d.user_id)}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {donorNames[d.user_id] || "Donor"}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="size-3 shrink-0" />
                  {d.distance_km?.toFixed(1) ?? "—"} km
                </div>
              </div>
              {selected.has(d.user_id) && (
                <CheckCircle2 className="size-5 text-primary shrink-0" />
              )}
              <Badge variant="default" className="shrink-0">accepted</Badge>
            </motion.label>
          ))}
        </div>

        {selected.size > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
            <p className="font-medium text-primary">
              {selected.size} donor{selected.size > 1 ? "s" : ""} will receive:
            </p>
            <ul className="mt-1 space-y-0.5 text-muted-foreground text-xs">
              <li>✓ +50 reward points each</li>
              <li>✓ Donation certificate (PDF downloadable)</li>
              <li>✓ Badge upgrade (if milestone reached)</li>
              <li>✓ 90-day availability cooldown</li>
            </ul>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleCloseWithout}
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            Close without credit
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting || selected.size === 0}
            className="w-full sm:w-auto"
          >
            {submitting ? "Processing…" : `Confirm ${selected.size} donation${selected.size !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
