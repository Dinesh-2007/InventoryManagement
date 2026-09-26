import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OperationCard({
  title,
  icon: Icon,
  stats,
  href,
  buttonLabel,
}: {
  title: string;
  icon: LucideIcon;
  stats: { label: string; value: number }[];
  href: string;
  buttonLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-semibold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
        <Button className="mt-4 w-full" variant="outline" render={<Link href={href} />} nativeButton={false}>
          {buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
