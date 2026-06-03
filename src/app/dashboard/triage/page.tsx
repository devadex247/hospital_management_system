"use client";

import { useState } from "react";
import { recordActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/client";
import {
  BrainCircuit,
  Activity,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Info,
  CheckCircle2,
  Search,
} from "lucide-react";

type TriageResult = {
  mews_score: number;
  risk_level: string;
  probability: number;
  recommendation: string;
  baseline_recommendation?: string;
  observations?: string[];
  ai?: {
    generated: boolean;
    model: string | null;
  };
};

const RISK_CONFIG: Record<string, { color: string; bg: string; border: string; Icon: React.ElementType }> = {
  "Low Risk": {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    Icon: ShieldCheck,
  },
  "Moderate Risk": {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    Icon: Info,
  },
  "High Risk": {
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    Icon: ShieldAlert,
  },
  "Critical": {
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    Icon: AlertTriangle,
  },
};

export default function TriagePage() {
  const supabase = createClient();
  const [form, setForm] = useState({ patientSearch: "", patient_id: "", hr: "", spo2: "", temp: "" });
  const [patients, setPatients] = useState<{ id: number; name: string; personal_id: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const searchPatients = async (q: string) => {
    setSearching(true);
    const { data } = await supabase.from("patients").select("id, name, personal_id").ilike("name", `%${q}%`).limit(5);
    setPatients(data ?? []);
    setSearching(false);
  };

  const handleAnalyse = async () => {
    const hr = parseFloat(form.hr);
    const spo2 = parseFloat(form.spo2);
    const temp = parseFloat(form.temp);
    if (!form.patient_id || isNaN(hr) || isNaN(spo2) || isNaN(temp)) {
      setError("Please select a patient and enter all valid vitals.");
      return;
    }
    setLoading(true);
    setError("");
    setSaved(false);

    try {
      const response = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: Number(form.patient_id),
          heartRate: hr,
          spo2,
          temperature: temp,
        }),
      });

      const payload = (await response.json()) as TriageResult & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to run triage analysis.");
      }

      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run triage analysis.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result || !form.patient_id) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("users").select("username").eq("id", user?.id ?? "").single();

    const { error: saveError } = await supabase.from("patient_vitals").insert([{
      patient_id: Number(form.patient_id),
      doctor_username: prof?.username ?? "unknown",
      heart_rate: parseFloat(form.hr),
      spo2: parseFloat(form.spo2),
      temperature: parseFloat(form.temp),
      mews_score: result.mews_score,
      risk_level: result.risk_level,
      probability: result.probability,
      recommendation: result.recommendation,
      source: result.ai?.generated ? `api/ai/triage:${result.ai.model}` : "api/ai/triage:local-mews",
    }]);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    await recordActivity({
      action: `Saved ${result.risk_level} triage vitals for ${form.patientSearch || "patient"}.`,
      actionType: "create",
      tableName: "patient_vitals",
      patientId: Number(form.patient_id),
      details: `MEWS ${result.mews_score}, HR ${form.hr}, SpO2 ${form.spo2}, Temp ${form.temp}`,
    });

    setSaved(true);
  };

  const cfg = result ? (RISK_CONFIG[result.risk_level] ?? RISK_CONFIG["Low Risk"]) : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <BrainCircuit size={20} className="text-med-teal" /> AI Triage Engine
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          MEWS-based predictive triage — enter patient vitals to generate an instant risk assessment.
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-6 space-y-5">
        {/* patient search */}
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Select Patient</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name…"
              value={form.patientSearch}
              onChange={(e) => {
                setForm({ ...form, patientSearch: e.target.value, patient_id: "" });
                if (e.target.value.length >= 2) searchPatients(e.target.value);
                else setPatients([]);
              }}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 outline-none focus:border-med-teal transition-colors"
            />
            {searching && (
              <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 animate-spin" />
            )}
            {patients.length > 0 && !form.patient_id && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-white/10 rounded-xl overflow-hidden z-10 shadow-xl">
                {patients.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => {
                        setForm({ ...form, patientSearch: `${p.name} (${p.personal_id})`, patient_id: String(p.id) });
                        setPatients([]);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 transition-colors flex justify-between"
                    >
                      <span>{p.name}</span>
                      <span className="text-slate-500 font-mono text-xs">{p.personal_id}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* vitals */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Heart Rate (bpm)", key: "hr", placeholder: "e.g. 72", unit: "bpm" },
            { label: "SpO₂ (%)", key: "spo2", placeholder: "e.g. 98", unit: "%" },
            { label: "Temperature (°C)", key: "temp", placeholder: "e.g. 37.2", unit: "°C" },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-xs text-slate-400 mb-1.5">{f.label}</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder={f.placeholder}
                  value={(form as Record<string, string>)[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 outline-none focus:border-med-teal transition-colors pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{f.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

        <button
          onClick={handleAnalyse}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium bg-gradient-to-r from-med-teal to-med-accent text-white hover:opacity-90 transition-all duration-200 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
          {loading ? "Analysing…" : "Run Triage Analysis"}
        </button>
      </div>

      {/* Result */}
      {result && cfg && (
        <div className={`glass-panel rounded-2xl p-6 border ${cfg.border} space-y-5`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center`}>
              <cfg.Icon size={20} className={cfg.color} />
            </div>
            <div>
              <p className={`text-lg font-bold ${cfg.color}`}>{result.risk_level}</p>
              <p className="text-xs text-slate-500">MEWS-based clinical risk stratification</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "MEWS Score", value: result.mews_score, unit: "/ 12" },
              { label: "Risk Probability", value: `${(result.probability * 100).toFixed(1)}`, unit: "%" },
              { label: "Urgency Level", value: result.risk_level.split(" ")[0], unit: "" },
            ].map((s) => (
              <div key={s.label} className={`${cfg.bg} rounded-xl p-4 text-center`}>
                <p className={`text-2xl font-bold ${cfg.color} tabular-nums`}>{s.value}<span className="text-sm ml-0.5">{s.unit}</span></p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* MEWS bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>MEWS Score</span>
              <span>{result.mews_score} / 12</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${cfg.bg.replace("bg-", "bg-")}`}
                style={{
                  width: `${(result.mews_score / 12) * 100}%`,
                  background: result.risk_level === "Critical" ? "#f87171"
                    : result.risk_level === "High Risk" ? "#fb923c"
                    : result.risk_level === "Moderate Risk" ? "#fbbf24"
                    : "#34d399",
                }}
              />
            </div>
          </div>

          <div className={`${cfg.bg} rounded-xl p-4`}>
            <p className="text-xs font-semibold text-slate-400 mb-1.5">Clinical Recommendation</p>
            <p className="text-sm text-slate-200">{result.recommendation}</p>
            <p className="text-xs text-slate-500 mt-2">
              {result.ai?.generated
                ? `AI narrative generated with ${result.ai.model}.`
                : "Local MEWS guidance used because API AI is not configured or unavailable."}
            </p>
          </div>

          {result.observations && result.observations.length > 0 && (
            <div className="grid gap-2">
              {result.observations.map((observation) => (
                <div key={observation} className="flex items-start gap-2 text-xs text-slate-300">
                  <Info size={14} className={`${cfg.color} mt-0.5 flex-shrink-0`} />
                  <span>{observation}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            {saved ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle2 size={16} /> Vitals saved to patient record
              </div>
            ) : (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white transition-all"
              >
                Save to Patient Record
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
