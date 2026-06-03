"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AutoLogoutHandler from "@/components/AutoLogoutHandler";
import {
  DASHBOARD_ROUTES,
  ROLE_COLORS,
  getAllowedDashboardRoutes,
  getDashboardRouteForPath,
  getRoleLabel,
  normalizeRole,
  type DashboardRouteKey,
  type Role,
} from "@/lib/rbac";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Pill,
  FlaskConical,
  Scan,
  DollarSign,
  UserCog,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronRight,
  BrainCircuit,
  Bell,
  Settings,
} from "lucide-react";

const NAV_ICONS: Record<DashboardRouteKey, React.ElementType> = {
  overview: LayoutDashboard,
  triage: BrainCircuit,
  patients: Users,
  appointments: CalendarDays,
  pharmacy: Pill,
  lab: FlaskConical,
  radiology: Scan,
  finance: DollarSign,
  staff: UserCog,
  audit: ShieldCheck,
  settings: Settings,
};

type Profile = {
  username: string;
  role: Role;
  full_name?: string;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("username, role, full_name")
        .eq("id", user.id)
        .single();
      if (!data) {
        await supabase.auth.signOut();
        router.push("/login?reason=profile");
        return;
      }

      setProfile({
        username: data.username,
        full_name: data.full_name ?? undefined,
        role: normalizeRole(data.role),
      });
      setLoading(false);
    };
    loadProfile();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const role = profile?.role ?? "patient";
  const allowedNav = getAllowedDashboardRoutes(role);
  const activeRoute = getDashboardRouteForPath(pathname) ?? DASHBOARD_ROUTES[0];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-med-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-med-teal border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading MedOS AI…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AutoLogoutHandler />
      <div className="flex h-screen overflow-hidden bg-med-bg">
        {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
        <aside
          className={`
            flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden
            border-r border-white/5
            ${sidebarOpen ? "w-64" : "w-16"}
          `}
          style={{ background: "linear-gradient(180deg, #0a1020 0%, #070a13 100%)" }}
        >
          {/* logo */}
          <div className="flex items-center gap-3 h-16 px-4 border-b border-white/5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-med-teal to-med-accent flex items-center justify-center flex-shrink-0">
              <BrainCircuit size={16} className="text-white" />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-white text-sm tracking-wide whitespace-nowrap">
                MedOS AI
              </span>
            )}
          </div>

          {/* nav links */}
          <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
            <ul className="space-y-0.5 px-2">
              {allowedNav.map((item) => {
                const Icon = NAV_ICONS[item.key];
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.label}
                      className={`
                        flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                        transition-all duration-200 group relative overflow-hidden
                        ${
                          active
                            ? "bg-med-teal/10 text-med-teal shadow-sm shadow-med-teal/10"
                            : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                        }
                      `}
                    >
                      {/* active indicator bar */}
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-med-teal rounded-r-full" />
                      )}
                      <Icon
                        size={18}
                        className={`flex-shrink-0 transition-transform duration-200 ${
                          active ? "text-med-teal" : "group-hover:scale-110"
                        }`}
                      />
                      {sidebarOpen && (
                        <span className="truncate">{item.label}</span>
                      )}
                      {active && sidebarOpen && (
                        <ChevronRight size={14} className="ml-auto text-med-teal/60" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* user block */}
          <div className="border-t border-white/5 p-3 flex-shrink-0">
            {sidebarOpen ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-med-teal/30 to-med-accent/30 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {profile?.full_name?.[0]?.toUpperCase() ??
                    profile?.username?.[0]?.toUpperCase() ??
                    "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-100 truncate">
                    {profile?.full_name ?? profile?.username}
                  </p>
                  <p
                    className={`text-xs truncate ${
                      ROLE_COLORS[role] ?? "text-slate-400"
                    }`}
                  >
                    {getRoleLabel(role)}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="w-full flex justify-center p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* top bar */}
          <header className="h-16 flex items-center gap-4 px-6 border-b border-white/5 bg-med-bg/80 backdrop-blur-sm flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all duration-200"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <span className="text-slate-600">MedOS</span>
              <ChevronRight size={14} className="text-slate-700" />
              <span className="text-slate-200 capitalize">
                {activeRoute.label}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* notification bell */}
              <button className="relative p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all duration-200">
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-med-teal rounded-full" />
              </button>

              {/* avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-med-teal/40 to-med-accent/40 flex items-center justify-center text-xs font-bold text-white">
                {profile?.full_name?.[0]?.toUpperCase() ??
                  profile?.username?.[0]?.toUpperCase() ??
                  "?"}
              </div>
            </div>
          </header>

          {/* page content */}
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </>
  );
}
