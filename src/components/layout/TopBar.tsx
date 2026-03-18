"use client";

type OrgRole = "ORG_ADMIN" | "ANALYST" | "VIEWER";

interface TopBarProps {
  userName: string;
  userImage: string | null;
  orgSlug: string | null;
  role: OrgRole | null;
}

export default function TopBar({ userName, userImage, orgSlug, role }: TopBarProps) {
  return (
    <header
      className="flex items-center justify-between px-6 py-3 border-b border-[rgba(255,255,255,0.08)] flex-shrink-0"
      style={{ background: "rgba(10,10,20,0.6)", backdropFilter: "blur(20px)" }}
    >
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm font-medium text-white">
            {orgSlug ? `${orgSlug}` : "Analytics Copilot"}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
            <span className="text-xs text-muted">Live data</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Health status */}
        <a
          href="/api/health"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted hover:text-secondary-color transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          Health
        </a>

        {/* User avatar */}
        <div className="flex items-center gap-2.5">
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt={userName} className="w-8 h-8 rounded-full ring-1 ring-[rgba(255,255,255,0.15)]" />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
            >
              {userName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-white leading-none">{userName}</p>
            <p className="text-[10px] text-muted mt-0.5">{role ?? "—"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
