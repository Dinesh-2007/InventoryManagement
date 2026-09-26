import { WarehouseArt } from "@/components/brand/warehouse-art";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top_left,oklch(0.96_0.03_20),transparent_60%)] p-4 sm:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-xl shadow-primary/5 md:grid-cols-2">
        <div className="flex flex-col justify-center px-6 py-10 sm:px-12">{children}</div>
        <div className="relative hidden md:block">
          <WarehouseArt />
        </div>
      </div>
    </main>
  );
}
