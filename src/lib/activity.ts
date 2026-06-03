export type RecentActivity = {
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

export type ActivityPayload = {
  action: string;
  actionType?: string;
  tableName: string;
  recordId?: number | null;
  patientId?: number | null;
  details?: string | null;
};

export function formatActivityTime(iso: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

  return `${Math.floor(seconds / 86400)}d ago`;
}

export async function fetchRecentActivity(limit = 8) {
  try {
    const response = await fetch(`/api/activity/recent?limit=${limit}`);

    if (!response.ok) {
      return [] as RecentActivity[];
    }

    const payload = (await response.json()) as { activity?: RecentActivity[] };
    return payload.activity ?? [];
  } catch {
    return [] as RecentActivity[];
  }
}

export async function recordActivity(payload: ActivityPayload) {
  try {
    const response = await fetch("/api/activity/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return false;
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("medos:activity-created"));
    }

    return true;
  } catch {
    return false;
  }
}
