import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Important information about the accuracy and use of StockSense.",
};

export default function DisclaimerPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Disclaimer" description="Please read before relying on data from the Service." />

      <Card>
        <CardContent className="space-y-8 pt-2 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Stock & Data Accuracy</h2>
            <p>
              StockSense is a tool for recording and tracking inventory — it is not a guarantee of
              accuracy. Stock levels, valuations, and reports reflect the data entered by users of
              your organization: receipts, deliveries, transfers, and adjustments. If a physical
              count is not recorded, a document is entered incorrectly, or a movement is missed,
              the figures shown in the Service will not match reality until corrected. We strongly
              recommend periodic physical stock counts and prompt correction of discrepancies
              through the adjustment workflow.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">&quot;As Is&quot; and &quot;As Available&quot;</h2>
            <p>
              The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis,
              without warranties of any kind, whether express, implied, or statutory, including but
              not limited to implied warranties of merchantability, fitness for a particular
              purpose, or non-infringement. We do not warrant that the Service will be
              uninterrupted, error-free, or free of defects.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Limitation of Liability for Business Decisions</h2>
            <p>
              Any decisions made on the basis of data shown in StockSense — including
              purchasing, fulfillment, staffing, or financial decisions — are made at your own
              risk and the risk of your organization. To the fullest extent permitted by law, we
              are not liable for any loss, damage, or business impact arising from reliance on
              inventory data, reports, or figures produced by the Service, including losses caused
              by human data-entry error, delayed entry, or system downtime.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Further Detail</h2>
            <p>
              This Disclaimer should be read alongside our{" "}
              <a href="/terms" className="text-primary underline underline-offset-4">
                Terms and Conditions
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-primary underline underline-offset-4">
                Privacy Policy
              </a>
              , which contain additional information on liability, data handling, and acceptable
              use of the Service.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
