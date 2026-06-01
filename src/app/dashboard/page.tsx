"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  CalendarDays,
  Pill,
  FlaskConical,
  BrainCircuit,
  TrendingUp,
  Activity,
  Clock,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────
type KPI = {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  color: string;
  href: string;
  trend?: string;
};

type RecentActivity = {
  id: number;
  action: string;
  username: string;
  table_name: string;
  created_at: string;
};

// ── Stat card component ────────────────────────────────────────────────────
function StatCard({ kpi, delay }: { kpi: KPI; delay: number }) {
  const Icon = kpi.icon;
  return (
    <Link
      href={kpi.href}
      className="glass-card rounded-2xl p-5 flex flex-col gap-4 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color} bg-current/10`}
          style={{ background: `color-mix(in srgb, currentColor 12%, transparent)` }}
        >
          <Icon size={20} className={kpi.color} />
        </div>
        <ArrowUpRight
          size={16}
          className="text-slate-600 group-hover:text-slate-300 transition-colors duration-200"
        />
      </div>
      <div>
        <p className="text-2xl font-bold text-white tabular-nums">{kpi.value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{kpi.label}</p>
      </div>
      <p className="text-xs text-slate-500">{kpi.sub}</p>
    </Link>
  );
}

// ── Activity icon helper ───────────────────────────────────────────────────
function activityIcon(table: string) {
  const map: Record<string, React.ReactElement> = {
    appointments: <CalendarDays size={14} className="text-med-teal" />,
    patients: <Users size={14} className="text-emerald-400" />,
    lab_orders: <FlaskConical size={14} className="text-amber-400" />,
    prescriptions: <Pill size={14} className="text-med-accent" />,
    patient_vitals: <Activity size={14} className="text-rose-400" />,
  };
  return map[table] ?? <CheckCircle2 size={14} className="text-slate-400" />;
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function DashboardOverview() {
  const supabase = createClient();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ role: string; full_name?: string; username: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, patientsRes, appointmentsRes, inventoryRes, labRes, auditRes] =
        await Promise.all([
          supabase.from("users").select("role, full_name, username").eq("id", user.id).single(),
          supabase.from("patients").select("id", { count: "exact", head: true }),
          supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "Scheduled"),
          supabase.from("inventories").select("id", { count: "exact", head: true }).lt("quantity", 10),
          supabase.from("lab_orders").select("id", { count: "exact", head: true }).eq("status", "Pending"),
          supabase.from("audit_logs").select("id, action, username, table_name, created_at").order("created_at", { ascending: false }).limit(8),
        ]);

      setProfile(profileRes.data);
      setActivity(auditRes.data ?? []);
      setKpis([
        {
          label: "Total Patients",
          value: patientsRes.count ?? 0,
          sub: "Registered in MedOS",
          icon: Users,
          color: "text-emerald-400",
          href: "/dashboard/patients",
          trend: "+4 this week",
        },
        {
          label: "Scheduled Appointments",
          value: appointmentsRes.count ?? 0,
          sub: "Active bookings today",
          icon: CalendarDays,
          color: "text-med-teal",
          href: "/dashboard/appointments",
        },
        {
          label: "Low Stock Drugs",
          value: inventoryRes.count ?? 0,
          sub: "Items below threshold",
          icon: Pill,
          color: "text-amber-400",
          href: "/dashboard/pharmacy",
        },
        {
          label: "Pending Lab Tests",
          value: labRes.count ?? 0,
          sub: "Awaiting results",
          icon: FlaskConical,
          color: "text-med-accent",
          href: "/dashboard/lab",
        },
      ]);
      setLoading(false);
    };
    load();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const quickActions = [
    { label: "Run AI Triage", href: "/dashboard/triage", icon: BrainCircuit, color: "from-med-teal to-sky-600" },
    { label: "New Appointment", href: "/dashboard/appointments", icon: CalendarDays, color: "from-med-accent to-violet-600" },
    { label: "Add Patient", href: "/dashboard/patients", icon: Users, color: "from-emerald-500 to-teal-600" },
    { label: "View Reports", href: "/dashboard/finance", icon: TrendingUp, color: "from-amber-500 to-orange-600" },
  ];

  return (
    <div className="space-y-8">
      {/* ── Greeting ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">
          {greeting()},{" "}
          <span className="text-med-teal">
            {profile?.full_name?.split(" ")[0] ?? profile?.username ?? "User"}
          </span>{" "}
          👋
        </h1>
        <p className="text-slate-400 text-sm">
          Here&apos;s what&apos;s happening in your hospital today.
        </p>
      </div>

      {/* ── KPI Grid ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 h-36 animate-pulse bg-slate-800/30" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <StatCard key={k.label} kpi={k} delay={i * 60} />
          ))}
        </div>
      )}

      {/* ── Quick Actions ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="relative overflow-hidden rounded-xl p-4 flex flex-col gap-3 group hover:scale-[1.02] transition-transform duration-200"
                style={{ background: "rgba(15,22,38,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center`}>
                  <Icon size={18} className="text-white" />
                </div>
                <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                  {a.label}
                </span>
                <span
                  className={`absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br ${a.color} opacity-10 group-hover:opacity-20 transition-opacity`}
                />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Recent Activity ────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Recent Activity
        </h2>
        <div className="glass-panel rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading activity…</span>
            </div>
          ) : activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
              <AlertCircle size={24} />
              <p className="text-sm">No recent activity found.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                    {activityIcon(a.table_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{a.action}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {a.username} · {a.table_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                    <Clock size={12} />
                    {timeAgo(a.created_at)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
