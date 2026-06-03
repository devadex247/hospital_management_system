"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getRoleLabel } from "@/lib/rbac";
import { Settings, User, Lock, LogOut, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<{ username: string; full_name: string; email: string; phone_number: string; role: string } | null>(null);
  const [form, setForm] = useState({ full_name: "", phone_number: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("users").select("username, full_name, email, phone_number, role").eq("id", user.id).single();
      if (data) {
        setProfile(data);
        setForm({ full_name: data.full_name ?? "", phone_number: data.phone_number ?? "" });
      }
    };
    load();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true); setSaved(false); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error: err } = await supabase.from("users").update({ full_name: form.full_name, phone_number: form.phone_number, updated_at: new Date().toISOString() }).eq("id", user.id);
    if (err) setError(err.message);
    else setSaved(true);
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    setChangingPw(true); setPwSaved(false); setError("");
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    if (err) setError(err.message);
    else { setPwSaved(true); setNewPassword(""); }
    setChangingPw(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2"><Settings size={20} className="text-slate-400" /> Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage your profile and security preferences</p>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-3">{error}</p>}

      {/* Profile */}
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-white/5">
          <User size={18} className="text-med-teal" />
          <h2 className="text-sm font-semibold text-slate-200">Profile Information</h2>
        </div>

        {profile && (
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-med-teal/30 to-med-accent/30 flex items-center justify-center text-xl font-bold text-white">
              {profile.full_name?.[0]?.toUpperCase() ?? profile.username[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{profile.full_name || profile.username}</p>
              <p className="text-xs text-slate-400">@{profile.username} · {getRoleLabel(profile.role)}</p>
              <p className="text-xs text-slate-500 mt-0.5">{profile.email}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Full Name</label>
            <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 outline-none focus:border-med-teal transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Phone Number</label>
            <input type="tel" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 outline-none focus:border-med-teal transition-colors" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          {saved && <div className="flex items-center gap-1.5 text-sm text-emerald-400"><CheckCircle2 size={14} /> Profile updated</div>}
          <button onClick={handleSaveProfile} disabled={saving}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-med-teal hover:bg-sky-400 text-white transition-all disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="glass-panel rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-white/5">
          <Lock size={18} className="text-med-accent" />
          <h2 className="text-sm font-semibold text-slate-200">Security</h2>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1.5">New Password</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters"
            className="w-full max-w-sm px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 placeholder-slate-600 outline-none focus:border-med-teal transition-colors" />
        </div>

        <div className="flex items-center gap-4">
          {pwSaved && <div className="flex items-center gap-1.5 text-sm text-emerald-400"><CheckCircle2 size={14} /> Password changed</div>}
          <button onClick={handleChangePassword} disabled={changingPw || !newPassword}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-med-accent hover:opacity-90 text-white transition-all disabled:opacity-40">
            {changingPw && <Loader2 size={14} className="animate-spin" />}
            {changingPw ? "Updating…" : "Change Password"}
          </button>
        </div>

        <div className="border-t border-white/5 pt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-300">Auto-logout</p>
            <p className="text-xs text-slate-500 mt-0.5">Session expires after 15 minutes of inactivity</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">Active</span>
        </div>
      </div>

      {/* Sign Out */}
      <button onClick={handleSignOut}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  );
}
