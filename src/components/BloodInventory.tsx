import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Database, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

interface InventoryItem {
  id?: string;
  blood_group: string;
  units_available: number;
}

export function BloodInventory({ hospitalId }: { hospitalId: string }) {
  const [inventory, setInventory] = useState<Record<string, InventoryItem>>({});
  const [loading, setLoading] = useState(true);

  const loadInventory = async () => {
    const { data, error } = await supabase
      .from("blood_inventory")
      .select("*")
      .eq("hospital_id", hospitalId);

    if (error) {
      toast.error("Failed to load blood inventory");
    } else {
      const invMap: Record<string, InventoryItem> = {};
      BLOOD_GROUPS.forEach((g) => {
        invMap[g] = { blood_group: g, units_available: 0 };
      });
      (data || []).forEach((item) => {
        invMap[item.blood_group] = item;
      });
      setInventory(invMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadInventory();
  }, [hospitalId]);

  const updateUnits = async (bloodGroup: string, change: number) => {
    const current = inventory[bloodGroup]?.units_available || 0;
    const newUnits = Math.max(0, current + change); // Prevent negative stock

    // Optimistic UI update
    setInventory((prev) => ({
      ...prev,
      [bloodGroup]: { ...prev[bloodGroup], units_available: newUnits },
    }));

    // Check if record exists
    const id = inventory[bloodGroup]?.id;

    let error;
    if (id) {
      // Update
      const res = await supabase
        .from("blood_inventory")
        .update({ units_available: newUnits })
        .eq("id", id);
      error = res.error;
    } else {
      // Insert
      const res = await supabase
        .from("blood_inventory")
        .insert({
          hospital_id: hospitalId,
          blood_group: bloodGroup,
          units_available: newUnits,
        })
        .select()
        .single();
      
      if (!res.error && res.data) {
        setInventory((prev) => ({
          ...prev,
          [bloodGroup]: res.data,
        }));
      }
      error = res.error;
    }

    if (error) {
      toast.error(error.message);
      loadInventory(); // Revert on failure
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading inventory...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-red-500" />
            Blood Bank Inventory
          </CardTitle>
          <CardDescription>Manage available blood units in your hospital's blood bank.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {BLOOD_GROUPS.map((group) => {
              const units = inventory[group]?.units_available || 0;
              const isLow = units < 5;
              const isCritical = units === 0;

              return (
                <div 
                  key={group} 
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border transition-colors",
                    isCritical ? "bg-destructive/10 border-destructive/30" : isLow ? "bg-orange-500/10 border-orange-500/30" : "bg-surface/50 border-border"
                  )}
                >
                  <div className="text-2xl font-bold text-red-500 mb-1">{group}</div>
                  <div className="text-3xl font-light text-foreground mb-4">{units} <span className="text-sm text-muted-foreground font-normal">units</span></div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 rounded-full bg-surface border-border hover:bg-surface-elevated hover:text-red-400"
                      onClick={() => updateUnits(group, -1)}
                      disabled={units === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 rounded-full bg-surface border-border hover:bg-surface-elevated hover:text-green-400"
                      onClick={() => updateUnits(group, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {isCritical && <span className="text-[10px] uppercase font-bold text-red-500 mt-3 tracking-wider">Out of Stock</span>}
                  {isLow && !isCritical && <span className="text-[10px] uppercase font-bold text-orange-500 mt-3 tracking-wider">Low Stock</span>}
                  {!isLow && !isCritical && <span className="text-[10px] uppercase font-bold text-green-500 mt-3 tracking-wider">Healthy</span>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
