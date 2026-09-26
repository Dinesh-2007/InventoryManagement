import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach support for StockSense.",
};

const SUPPORT_EMAIL = "support@stocksense.app";

export default function ContactPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Contact / Support" description="We're here to help with issues using StockSense." />

      <Card>
        <CardHeader>
          <CardTitle>Get in touch</CardTitle>
          <CardDescription>
            The fastest way to reach us is by email. We don&apos;t have an in-app ticketing system
            yet, so messages sent here go straight to a real inbox — this page is not a form and
            nothing is submitted automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button size="lg" render={<a href={`mailto:${SUPPORT_EMAIL}`} />}>
            <Mail />
            Email {SUPPORT_EMAIL}
          </Button>

          <p className="text-sm leading-relaxed text-muted-foreground">
            For account access, billing, or organization-level issues, please contact your
            organization&apos;s inventory manager or system administrator first — they can resolve
            most access and permissions questions directly, without needing to go through support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
