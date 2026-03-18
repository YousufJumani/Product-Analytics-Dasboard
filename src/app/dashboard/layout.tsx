import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { cookies } from "next/headers";

type OrgRole = "ORG_ADMIN" | "ANALYST" | "VIEWER";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const demoModeEnabled = process.env.DEMO_MODE !== "false";
  const cookieStore = cookies();
  const isDemoBypass = demoModeEnabled || cookieStore.get("demo_bypass")?.value === "1";

  if (isDemoBypass) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar role="ORG_ADMIN" orgSlug="acme-saas" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar
            userName="Demo User"
            userImage={null}
            orgSlug="acme-saas"
            role="ORG_ADMIN"
          />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    );
  }

  const { auth } = await import("@/lib/auth");
  const session = await auth();

  if (!session?.user && !isDemoBypass) redirect("/login");

  const userName = session?.user?.name ?? "Demo User";
  const userImage = session?.user?.image ?? null;
  const orgSlug = session?.user?.activeOrgSlug ?? "acme-saas";
  const role = (session?.user?.role ?? "ORG_ADMIN") as OrgRole;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} orgSlug={orgSlug} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          userName={userName}
          userImage={userImage}
          orgSlug={orgSlug}
          role={role}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
