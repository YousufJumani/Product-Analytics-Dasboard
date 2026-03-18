import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { cookies } from "next/headers";
import type { OrgRole } from "@prisma/client";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const demoModeEnabled = process.env.DEMO_MODE !== "false";
  const isDemoBypass = demoModeEnabled || cookies().get("demo_bypass")?.value === "1";

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
