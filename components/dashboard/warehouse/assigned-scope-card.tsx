import { Warehouse as WarehouseIcon, MapPin, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess, getAuthenticatedUser } from "@/lib/auth/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export async function AssignedScopeCard() {
  const [user, access] = await Promise.all([
    getAuthenticatedUser(),
    getCurrentUserAccess(),
  ]);
  const supabase = createClient();

  const [{ data: warehouses }, { data: locations }] = await Promise.all([
    supabase
      .from("warehouses")
      .select("id, name, short_code")
      .in("id", access.warehouseIds),
    supabase
      .from("locations")
      .select("id, name, warehouse_id")
      .in("id", access.locationIds),
  ]);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <CardTitle className="text-base font-semibold">Assigned Scope & Permissions</CardTitle>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary">
            Warehouse Staff
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 text-sm">
        <p className="text-xs text-muted-foreground">
          You are operating with restricted access. You can only view stock and perform operations in your assigned facilities.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-card p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <WarehouseIcon className="size-3.5" />
              <span>Assigned Warehouses ({warehouses?.length ?? 0})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(warehouses ?? []).length > 0 ? (
                warehouses?.map((wh) => (
                  <Badge key={wh.id} variant="secondary" className="font-normal">
                    {wh.name} ({wh.short_code})
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No warehouses assigned</span>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MapPin className="size-3.5" />
              <span>Assigned Locations ({locations?.length ?? 0})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(locations ?? []).length > 0 ? (
                locations?.map((loc) => (
                  <Badge key={loc.id} variant="secondary" className="font-normal">
                    {loc.name}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No specific locations assigned</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
