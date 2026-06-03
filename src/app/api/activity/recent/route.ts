import { NextResponse, type NextRequest } from "next/server";

import { normalizeRole } from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ActivityRow = {
  id: number;
  action: string;
  action_type: string | null;
  username: string;
  table_name: string;
  record_id: number | null;
  patient_id: number | null;
  details: string | null;
  created_at: string;
};

const SELECT_FIELDS =
  "id, username, action, action_type, table_name, record_id, patient_id, details, created_at";

function getLimit(request: NextRequest) {
  const rawLimit = Number(new URL(request.url).searchParams.get("limit") ?? 8);
  if (!Number.isFinite(rawLimit)) return 8;
  return Math.min(Math.max(Math.floor(rawLimit), 1), 20);
}

function uniqueAndSort(rows: ActivityRow[], limit: number) {
  const byId = new Map<number, ActivityRow>();
  rows.forEach((row) => byId.set(row.id, row));

  return [...byId.values()]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export async function GET(request: NextRequest) {
  const limit = getLimit(request);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("username, role, account_status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "User profile could not be found." }, { status: 404 });
  }

  if (profile.account_status !== "active") {
    return NextResponse.json({ error: "This account is inactive." }, { status: 403 });
  }

  const role = normalizeRole(profile.role);

  try {
    const admin = createAdminClient();

    if (role === "owner_admin" || role === "hospital_admin") {
      const { data, error } = await admin
        .from("audit_logs")
        .select(SELECT_FIELDS)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return NextResponse.json({ activity: data ?? [] });
    }

    const queries = [
      admin
        .from("audit_logs")
        .select(SELECT_FIELDS)
        .eq("username", profile.username)
        .order("created_at", { ascending: false })
        .limit(limit),
    ];

    if (role === "patient") {
      const { data: patient } = await admin
        .from("patients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (patient?.id) {
        queries.push(
          admin
            .from("audit_logs")
            .select(SELECT_FIELDS)
            .eq("patient_id", patient.id)
            .order("created_at", { ascending: false })
            .limit(limit)
        );
      }
    }

    const results = await Promise.all(queries);
    const rows = results.flatMap((result) => result.data ?? []) as ActivityRow[];
    const firstError = results.find((result) => result.error)?.error;

    if (firstError) throw firstError;

    return NextResponse.json({ activity: uniqueAndSort(rows, limit) });
  } catch {
    if (role === "owner_admin" || role === "hospital_admin") {
      const { data } = await supabase
        .from("audit_logs")
        .select(SELECT_FIELDS)
        .order("created_at", { ascending: false })
        .limit(limit);

      return NextResponse.json({ activity: data ?? [] });
    }

    return NextResponse.json({ activity: [] });
  }
}
