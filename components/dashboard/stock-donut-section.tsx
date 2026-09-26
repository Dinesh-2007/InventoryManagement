import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StockDonutChart, type DonutDatum } from "./stock-donut-chart";

const COLORS = { in_stock: "#10b981", low_stock: "#f59e0b", out_of_stock: "#f43f5e", inactive: "#94a3b8" };

type StockRow = { free_to_use: number | string; reorder_point: number | string; active: boolean };

export async function StockDonutSection() {
  const supabase = createClient();
  const { data, error } = await supabase.from("stock_overview").select("free_to_use,reorder_point,active");
  if (error) console.error("[dashboard] stock_overview unavailable for donut", error);
  const rows = (data ?? []) as StockRow[];

  let inStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let inactive = 0;
  for (const r of rows) {
    if (!r.active) {
      inactive++;
      continue;
    }
    const free = Number(r.free_to_use);
    const reorder = Number(r.reorder_point);
    if (free <= 0) outOfStock++;
    else if (free <= reorder) lowStock++;
    else inStock++;
  }

  const chartData: DonutDatum[] = [
    { name: "In Stock", value: inStock, color: COLORS.in_stock },
    { name: "Low Stock", value: lowStock, color: COLORS.low_stock },
    { name: "Out of Stock", value: outOfStock, color: COLORS.out_of_stock },
    { name: "Inactive", value: inactive, color: COLORS.inactive },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Status</CardTitle>
      </CardHeader>
      <CardContent>
        <StockDonutChart data={chartData} />
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          {chartData.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-muted-foreground">{d.name}</span>
              <span className="ml-auto font-medium">{d.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
