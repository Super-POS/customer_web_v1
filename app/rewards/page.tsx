import { redirect } from "next/navigation";
import { AccountPageHeader } from "@/components/account-page-header";
import { CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY } from "@/lib/customer-web-flags";

export default function RewardsPage() {
  if (CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY) redirect("/");

  return (
    <div className="brand-page max-w-3xl">
      <AccountPageHeader title="Rewards" subtitle="Coming soon." />
      <div className="brand-card mt-8 rounded-[1.75rem] px-6 py-16 text-center sm:py-20">
        <p className="font-[family-name:var(--font-oswald)] text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl">
          Coming soon
        </p>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--text-muted)]">
          Loyalty perks are on the way. Check back later.
        </p>
      </div>
    </div>
  );
}
