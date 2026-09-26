import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How StockSense collects, uses, and protects your data.",
};

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Data We Collect",
    body: (
      <>
        <p>We collect two broad categories of data:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong className="text-foreground">Account information</strong> — your full name,
            email address, login ID, role, and optionally a phone number or avatar image, used to
            identify you and control access within your organization.
          </li>
          <li>
            <strong className="text-foreground">Operational data</strong> — the inventory records
            and documents you create or interact with while using the Service, including product
            and category records, warehouse and location data, receipts, deliveries, internal
            transfers, stock adjustments, and the resulting stock movement ledger.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "2. How We Use This Data",
    body: (
      <p>
        Account information is used to authenticate you, apply role-based access control, and
        attribute actions (such as who created or completed a document) within the audit trail.
        Operational data is used to power the core functionality of the Service — tracking stock
        levels, generating reports, and maintaining a reliable history of inventory movement across
        your organization. We do not use your data for advertising, and we do not sell data to
        third parties.
      </p>
    ),
  },
  {
    title: "3. Data Storage & Security",
    body: (
      <p>
        Data is stored in a managed PostgreSQL database provided by Supabase. Data is encrypted in
        transit (via TLS) and at rest. Access to data is restricted by row-level security policies
        so that users can only see and modify data appropriate to their role and organization.
        While we take reasonable technical measures to protect your data, no system can be
        guaranteed to be completely secure.
      </p>
    ),
  },
  {
    title: "4. Data Retention",
    body: (
      <p>
        Account information and operational data are retained for as long as your account remains
        active and as needed to preserve the integrity of the audit ledger (for example, completed
        receipts, deliveries, transfers, and adjustments are retained even after a related product
        or user becomes inactive, so historical records stay accurate). Data associated with an
        account may be retained for a reasonable period after deactivation to satisfy operational,
        legal, or audit requirements before deletion.
      </p>
    ),
  },
  {
    title: "5. Your Rights",
    body: (
      <p>
        You may request access to the personal account information we hold about you, request a
        copy of it in a portable format, or request correction of inaccurate information, by
        contacting your organization&apos;s inventory manager or system administrator, or through
        the{" "}
        <a href="/contact" className="text-primary underline underline-offset-4">
          Contact
        </a>{" "}
        page. Requests to delete account information will be honored where doing so does not
        conflict with the need to preserve the audit ledger of operational records tied to your
        organization&apos;s inventory history.
      </p>
    ),
  },
  {
    title: "6. Cookies",
    body: (
      <p>
        StockSense uses session cookies solely for authentication — to keep you signed in and to
        verify your identity on each request. These cookies are essential to the Service and are
        not used for advertising, tracking across other sites, or analytics profiling.
      </p>
    ),
  },
  {
    title: "7. Third-Party Services",
    body: (
      <p>
        The Service relies on{" "}
        <a
          href="https://supabase.com"
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary underline underline-offset-4"
        >
          Supabase
        </a>{" "}
        for database hosting, authentication, and storage. Supabase processes data on our behalf
        under its own security and privacy commitments. We do not share your data with any other
        third party except as necessary to operate the Service or as required by law.
      </p>
    ),
  },
  {
    title: "8. Contact",
    body: (
      <p>
        For questions about this Privacy Policy or to make a data request, reach out through the{" "}
        <a href="/contact" className="text-primary underline underline-offset-4">
          Contact
        </a>{" "}
        page or your organization&apos;s inventory manager or system administrator.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Privacy Policy"
        description="How we collect, use, and protect data within StockSense."
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
