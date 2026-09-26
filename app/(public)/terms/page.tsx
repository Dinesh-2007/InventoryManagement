import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "The terms that govern use of StockSense.",
};

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Acceptance of Terms",
    body: (
      <p>
        By accessing or using StockSense (the &quot;Service&quot;), you agree to be bound by these
        Terms and Conditions (the &quot;Terms&quot;). If you are using the Service on behalf of an
        organization, you represent that you have the authority to bind that organization to
        these Terms, and &quot;you&quot; refers to both you and that organization. If you do not
        agree to these Terms, you must not access or use the Service.
      </p>
    ),
  },
  {
    title: "2. Use of the Service",
    body: (
      <>
        <p>
          StockSense is provided as an internal operational tool for inventory management,
          including but not limited to tracking products, warehouses, stock receipts, deliveries,
          internal transfers, and stock adjustments. Access is granted to individuals authorized
          by your organization, typically inventory managers and warehouse staff.
        </p>
        <p>
          You agree to use the Service only for its intended business purpose and in compliance
          with all applicable laws and your organization&apos;s internal policies.
        </p>
      </>
    ),
  },
  {
    title: "3. User Accounts & Responsibilities",
    body: (
      <>
        <p>
          Each user accesses the Service through an individual account tied to a login ID and
          email address. You are responsible for maintaining the confidentiality of your
          credentials and for all activity that occurs under your account.
        </p>
        <p>
          You agree to notify your organization&apos;s inventory manager or system administrator
          promptly if you suspect unauthorized use of your account, and to provide accurate
          information when creating or updating your profile.
        </p>
      </>
    ),
  },
  {
    title: "4. Data & Content Ownership",
    body: (
      <p>
        All operational data entered into the Service — including product records, stock
        movements, receipts, deliveries, transfers, adjustments, and related documents — remains
        the property of your organization. StockSense does not claim ownership over the data you
        create or store within the Service; it acts solely as the system through which that data
        is recorded and processed.
      </p>
    ),
  },
  {
    title: "5. Acceptable Use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Attempt to gain unauthorized access to accounts, data, or systems you are not permitted to access.</li>
          <li>Introduce malicious code, interfere with the Service&apos;s operation, or attempt to bypass access controls.</li>
          <li>Enter deliberately false inventory data with intent to misrepresent stock levels or financial records.</li>
          <li>Use the Service in any manner that violates applicable law or infringes the rights of others.</li>
        </ul>
      </>
    ),
  },
  {
    title: "6. Availability & Support",
    body: (
      <p>
        We aim to keep the Service available and performant, but do not guarantee uninterrupted
        access. The Service may be temporarily unavailable for maintenance, updates, or reasons
        outside our control. Support requests should be directed to your organization&apos;s
        inventory manager or system administrator, or through the channels described on the{" "}
        Contact page.
      </p>
    ),
  },
  {
    title: "7. Limitation of Liability",
    body: (
      <p>
        The Service is provided to support inventory operations, but stock levels, valuations, and
        other figures depend on data entered by users. To the fullest extent permitted by law, the
        Service and its operators are not liable for any indirect, incidental, or consequential
        losses — including lost inventory, lost revenue, or business decisions made in reliance on
        data recorded in the Service. See also the{" "}
        <a href="/disclaimer" className="text-primary underline underline-offset-4">
          Disclaimer
        </a>{" "}
        for further detail on accuracy and reliance.
      </p>
    ),
  },
  {
    title: "8. Changes to These Terms",
    body: (
      <p>
        These Terms may be updated from time to time to reflect changes to the Service or legal
        requirements. Material changes will be reflected by an updated revision on this page.
        Continued use of the Service after changes take effect constitutes acceptance of the
        revised Terms.
      </p>
    ),
  },
  {
    title: "9. Governing Law",
    body: (
      <p>
        These Terms are governed by the laws of the jurisdiction in which your organization
        operates, without regard to conflict-of-law principles, unless otherwise agreed in writing
        between your organization and the Service provider.
      </p>
    ),
  },
  {
    title: "10. Contact",
    body: (
      <p>
        Questions about these Terms can be directed through the{" "}
        <a href="/contact" className="text-primary underline underline-offset-4">
          Contact
        </a>{" "}
        page, or to your organization&apos;s inventory manager or system administrator.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Terms and Conditions"
        description="Please read these terms carefully before using StockSense."
      />

      <Card>
        <CardContent className="space-y-8 pt-2 text-sm leading-relaxed text-muted-foreground">
          {SECTIONS.map((section) => (
            <section key={section.title} className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
              <div className="space-y-2">{section.body}</div>
            </section>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
