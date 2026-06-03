"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchRecentActivity, formatActivityTime, type RecentActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/client";
import {
  getAllowedDashboardRoutes,
  getRoleLabel,
  normalizeRole,
  type DashboardRouteKey,
  type Role,
} from "@/lib/rbac";
import {
  Users,
  CalendarDays,
  Pill,
  FlaskConical,
  BrainCircuit,
  Activity,
  Clock,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Settings,
  Scan,
  DollarSign,
  UserCog,
  ShieldCheck,
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

type Profile = {
  role: Role;
  full_name?: string;
  username: string;
};

type PatientRecord = {
  id: number;
  name: string;
  personal_id: string;
};

const ACTION_ICONS: Record<DashboardRouteKey, React.ElementType> = {
  overview: Activity,
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

const ACTION_COLORS: Record<DashboardRouteKey, string> = {
  overview: "from-slate-600 to-slate-800",
  triage: "from-med-teal to-sky-600",
  patients: "from-emerald-500 to-teal-600",
  appointments: "from-cyan-500 to-blue-600",
  pharmacy: "from-amber-500 to-orange-600",
  lab: "from-med-accent to-violet-600",
  radiology: "from-fuchsia-500 to-indigo-600",
  finance: "from-green-500 to-emerald-700",
  staff: "from-slate-500 to-slate-700",
  audit: "from-rose-500 to-red-700",
  settings: "from-slate-600 to-slate-800",
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

function buildRoleKpis(
  role: Role,
  counts: {
    patients: number;
    appointments: number;
    lowStock: number;
    pendingLabs: number;
    highRiskVitals: number;
  }
): KPI[] {
  const clinicalRisk: KPI = {
    label: "High-risk Vitals",
    value: counts.highRiskVitals,
    sub: "High or critical MEWS records",
    icon: BrainCircuit,
    color: "text-rose-400",
    href: "/dashboard/triage",
  };

  const patients: KPI = {
    label: "Total Patients",
    value: counts.patients,
    sub: "Registered in MedOS",
    icon: Users,
    color: "text-emerald-400",
    href: "/dashboard/patients",
  };

  const appointments: KPI = {
    label: "Scheduled Appointments",
    value: counts.appointments,
    sub: "Active bookings today",
    icon: CalendarDays,
    color: "text-med-teal",
    href: "/dashboard/appointments",
  };

  const lowStock: KPI = {
    label: "Low Stock Drugs",
    value: counts.lowStock,
    sub: "Items below threshold",
    icon: Pill,
    color: "text-amber-400",
    href: "/dashboard/pharmacy",
  };

  const pendingLabs: KPI = {
    label: "Pending Lab Tests",
    value: counts.pendingLabs,
    sub: "Awaiting results",
    icon: FlaskConical,
    color: "text-med-accent",
    href: "/dashboard/lab",
  };

  if (role === "doctor") {
    return [patients, appointments, clinicalRisk, pendingLabs];
  }

  if (role === "staff") {
    return [patients, appointments, lowStock, pendingLabs];
  }

  return [patients, appointments, lowStock, pendingLabs];
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function DashboardOverview() {
  const supabase = useMemo(() => createClient(), []);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [patientRecord, setPatientRecord] = useState<PatientRecord | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, patientsRes, appointmentsRes, inventoryRes, labRes, vitalsRes, recentActivity] =
        await Promise.all([
          supabase.from("users").select("role, full_name, username").eq("id", user.id).single(),
          supabase.from("patients").select("id", { count: "exact", head: true }),
          supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "Scheduled"),
          supabase.from("inventories").select("id", { count: "exact", head: true }).lt("quantity", 10),
          supabase.from("lab_orders").select("id", { count: "exact", head: true }).eq("status", "Pending"),
          supabase.from("patient_vitals").select("id", { count: "exact", head: true }).in("risk_level", ["High Risk", "Critical"]),
          fetchRecentActivity(8),
        ]);

      const role = normalizeRole(profileRes.data?.role);
      const loadedProfile = profileRes.data
        ? {
            role,
            full_name: profileRes.data.full_name ?? undefined,
            username: profileRes.data.username,
          }
        : null;

      setProfile(loadedProfile);
      setActivity(recentActivity);

      if (role === "patient") {
        const { data: patient } = await supabase
          .from("patients")
          .select("id, name, personal_id")
          .eq("user_id", user.id)
          .maybeSingle();

        setPatientRecord(patient ?? null);

        if (!patient) {
          setKpis([
            {
              label: "Care Profile",
              value: "Pending",
              sub: "Your patient file is not linked yet",
              icon: AlertCircle,
              color: "text-amber-400",
              href: "/dashboard/settings",
            },
            {
              label: "Portal Role",
              value: getRoleLabel(role),
              sub: "Profile-only access is active",
              icon: CheckCircle2,
              color: "text-emerald-400",
              href: "/dashboard/settings",
            },
          ]);
        } else {
          const [patientAppointments, patientPrescriptions, patientBills, latestVitals] =
            await Promise.all([
              supabase.from("appointments").select("id", { count: "exact", head: true }).eq("patient_id", patient.id).eq("status", "Scheduled"),
              supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("patient_id", patient.id).eq("status", "Active"),
              supabase.from("bills").select("id", { count: "exact", head: true }).eq("patient_id", patient.id).neq("status", "Paid"),
              supabase.from("patient_vitals").select("risk_level, mews_score").eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
            ]);

          setKpis([
            {
              label: "Patient ID",
              value: patient.personal_id,
              sub: patient.name,
              icon: Users,
              color: "text-emerald-400",
              href: "/dashboard/settings",
            },
            {
              label: "Scheduled Visits",
              value: patientAppointments.count ?? 0,
              sub: "Upcoming appointments",
              icon: CalendarDays,
              color: "text-med-teal",
              href: "/dashboard",
            },
            {
              label: "Active Prescriptions",
              value: patientPrescriptions.count ?? 0,
              sub: "Current medication records",
              icon: Pill,
              color: "text-amber-400",
              href: "/dashboard",
            },
            {
              label: "Latest Risk",
              value: latestVitals.data?.risk_level ?? "No vitals",
              sub: latestVitals.data ? `MEWS ${latestVitals.data.mews_score}` : `${patientBills.count ?? 0} open bill(s)`,
              icon: Activity,
              color: latestVitals.data?.risk_level === "Critical" ? "text-red-400" : "text-med-accent",
              href: "/dashboard",
            },
          ]);
        }

        setLoading(false);
        return;
      }

      setPatientRecord(null);
      setKpis(buildRoleKpis(role, {
        patients: patientsRes.count ?? 0,
        appointments: appointmentsRes.count ?? 0,
        lowStock: inventoryRes.count ?? 0,
        pendingLabs: labRes.count ?? 0,
        highRiskVitals: vitalsRes.count ?? 0,
      }));
      setLoading(false);
    };
    load();
  }, [supabase]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const role = profile?.role ?? "patient";
  const quickActions = getAllowedDashboardRoutes(role)
    .filter((route) => route.key !== "overview")
    .slice(0, 4)
    .map((route) => ({
      label: route.key === "settings" && role === "patient" ? "Update Profile" : route.label,
      href: route.href,
      icon: ACTION_ICONS[route.key],
      color: ACTION_COLORS[route.key],
    }));

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
          {role === "patient"
            ? patientRecord
              ? `Your care profile is linked to ${patientRecord.personal_id}.`
              : "Your patient file is waiting to be linked by the hospital team."
            : `${getRoleLabel(role)} workspace summary for today's hospital operations.`}
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
                    {formatActivityTime(a.created_at)}
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
