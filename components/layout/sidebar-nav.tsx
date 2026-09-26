"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Boxes,
  Building2,
  ClipboardList,
  History,
  LayoutDashboard,
  MapPin,
  Package,
  PackageCheck,
  Settings2,
  Tags,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { href: "/operations/receipts", label: "Receipts", icon: PackageCheck },
      { href: "/operations/deliveries", label: "Deliveries", icon: Truck },
      { href: "/operations/transfers", label: "Internal Transfers", icon: ArrowLeftRight },
      { href: "/operations/adjustments", label: "Stock Adjustments", icon: ClipboardList },
      { href: "/move-history", label: "Move History", icon: History },
    ],
  },
  {
    label: "Products",
    items: [
      { href: "/products", label: "Products", icon: Package },
      { href: "/products/categories", label: "Categories", icon: Tags },
      { href: "/stock", label: "Stock", icon: Boxes },
      { href: "/products/reorder-rules", label: "Reorder Rules", icon: Settings2 },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/settings/warehouses", label: "Warehouses", icon: Warehouse },
      { href: "/settings/locations", label: "Locations", icon: MapPin },
      { href: "/settings/suppliers", label: "Suppliers", icon: Users },
      { href: "/settings/customers", label: "Customers", icon: Building2 },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const linkClass = (active: boolean) =>
  cn(
    "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );

export function SidebarNav({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4", className)}>
      <Link href="/dashboard" onClick={onNavigate} className={linkClass(isActive(pathname, "/dashboard"))}>
        <LayoutDashboard className="size-4" />
        Dashboard
      </Link>

      {GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <div className="px-2.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{group.label}</div>
          {group.items.map((item) => (
            <Link key={item.href} href={item.href} onClick={onNavigate} className={linkClass(isActive(pathname, item.href))}>
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
