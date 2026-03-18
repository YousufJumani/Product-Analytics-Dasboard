/**
 * Settings Page (ORG_ADMIN only — enforced by middleware + RBAC)
 */
import { redirect } from "next/navigation";
import { format } from "date-fns";

export default async function SettingsPage() {
  const demoModeEnabled = process.env.DEMO_MODE !== "false";

  if (demoModeEnabled) {
    const now = new Date();
    const demoOrg = {
      name: "Acme SaaS",
      slug: "acme-saas",
      plan: "PRO",
      createdAt: new Date(now.getFullYear(), now.getMonth() - 8, 3),
    };

    const demoMembers = [
      {
        id: "m1",
        role: "ORG_ADMIN",
        joinedAt: new Date(now.getFullYear(), now.getMonth() - 7, 11),
        user: { name: "Demo Admin", email: "admin@demo.com", image: null },
      },
      {
        id: "m2",
        role: "ANALYST",
        joinedAt: new Date(now.getFullYear(), now.getMonth() - 6, 17),
        user: { name: "Demo Analyst", email: "analyst@demo.com", image: null },
      },
      {
        id: "m3",
        role: "VIEWER",
        joinedAt: new Date(now.getFullYear(), now.getMonth() - 5, 9),
        user: { name: "Demo Viewer", email: "viewer@demo.com", image: null },
      },
    ] as const;

    return (
      <div className="space-y-6 max-w-2xl animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-secondary-color text-sm mt-1">Organization and team management (demo mode)</p>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-base font-semibold text-white mb-4">Organization</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted text-xs mb-1">Name</p>
              <p className="text-white font-medium">{demoOrg.name}</p>
            </div>
            <div>
              <p className="text-muted text-xs mb-1">Slug</p>
              <code className="text-brand">{demoOrg.slug}</code>
            </div>
            <div>
              <p className="text-muted text-xs mb-1">Plan</p>
              <span className="badge badge-info">{demoOrg.plan}</span>
            </div>
            <div>
              <p className="text-muted text-xs mb-1">Created</p>
              <p className="text-secondary-color">{format(demoOrg.createdAt, "MMM d, yyyy")}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-base font-semibold text-white mb-4">Team Members ({demoMembers.length})</h2>
          <div className="space-y-3">
            {demoMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between py-3 px-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
                  >
                    {member.user.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{member.user.name}</p>
                    <p className="text-xs text-muted">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`badge ${
                      member.role === "ORG_ADMIN"
                        ? "badge-info"
                        : member.role === "ANALYST"
                        ? "badge-success"
                        : "badge-warning"
                    }`}
                  >
                    {member.role}
                  </span>
                  <p className="text-xs text-muted hidden sm:block">Joined {format(member.joinedAt, "MMM d")}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted mt-4">Demo mode is read-only and does not require DB or env variables.</p>
        </div>
      </div>
    );
  }

  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.activeOrgId) redirect("/login");
  if (session.user.role !== "ORG_ADMIN") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="glass-card p-8 text-center max-w-sm">
          <p className="text-2xl mb-3">🔒</p>
          <h2 className="text-lg font-semibold text-white mb-2">Access Restricted</h2>
          <p className="text-sm text-secondary-color">
            Settings require ORG_ADMIN role. Your current role is{" "}
            <span className="text-warning font-medium">{session.user.role}</span>.
          </p>
        </div>
      </div>
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const [org, members] = await Promise.all([
    prisma.organization.findUnique({ where: { id: session.user.activeOrgId } }),
    prisma.orgMember.findMany({
      where: { orgId: session.user.activeOrgId },
      include: { user: { select: { name: true, email: true, image: true } } },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-secondary-color text-sm mt-1">Organization and team management</p>
      </div>

      {/* Org Info */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-white mb-4">Organization</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted text-xs mb-1">Name</p>
            <p className="text-white font-medium">{org?.name}</p>
          </div>
          <div>
            <p className="text-muted text-xs mb-1">Slug</p>
            <code className="text-brand">{org?.slug}</code>
          </div>
          <div>
            <p className="text-muted text-xs mb-1">Plan</p>
            <span className="badge badge-info">{org?.plan}</span>
          </div>
          <div>
            <p className="text-muted text-xs mb-1">Created</p>
            <p className="text-secondary-color">
              {org?.createdAt ? format(org.createdAt, "MMM d, yyyy") : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="glass-card p-6">
        <h2 className="text-base font-semibold text-white mb-4">
          Team Members ({members.length})
        </h2>
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between py-3 px-4 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div className="flex items-center gap-3">
                {member.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.user.image}
                    alt={member.user.name ?? ""}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
                  >
                    {(member.user.name ?? member.user.email ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white">{member.user.name ?? "—"}</p>
                  <p className="text-xs text-muted">{member.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`badge ${
                    member.role === "ORG_ADMIN"
                      ? "badge-info"
                      : member.role === "ANALYST"
                      ? "badge-success"
                      : "badge-warning"
                  }`}
                >
                  {member.role}
                </span>
                <p className="text-xs text-muted hidden sm:block">
                  Joined {format(member.joinedAt, "MMM d")}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-4">
          Role changes require direct DB update or admin API. This view is read-only for demo safety.
        </p>
      </div>

      {/* RBAC explanation */}
      <div className="glass-card p-6" style={{ border: "1px solid rgba(99,102,241,0.2)" }}>
        <h2 className="text-base font-semibold text-white mb-3">🔐 RBAC Role Definitions</h2>
        <div className="space-y-3">
          {[
            { role: "ORG_ADMIN", desc: "Full access: manage members, connect integrations, trigger jobs, use AI copilot, view all dashboards.", color: "badge-info" },
            { role: "ANALYST", desc: "Can view all dashboards, run AI copilot conversations, but cannot manage team or integrations.", color: "badge-success" },
            { role: "VIEWER", desc: "Read-only dashboard access. Cannot use AI copilot or trigger any mutations.", color: "badge-warning" },
          ].map(({ role, desc, color }) => (
            <div key={role} className="flex gap-3">
              <span className={`badge ${color} flex-shrink-0 mt-0.5`}>{role}</span>
              <p className="text-xs text-secondary-color">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
