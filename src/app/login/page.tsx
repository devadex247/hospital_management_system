'use client'

import { useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getDashboardRedirectPath, getRoleLabel, normalizeRole } from '@/lib/rbac'
import { Activity, Mail, Lock, Eye, EyeOff, Loader2, LogIn, ShieldAlert } from 'lucide-react'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected database error occurred.'
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const supabase = useMemo(() => createClient(), [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const inactivityInfoMsg =
    searchParams.get('reason') === 'inactivity'
      ? 'You have been logged out due to 15 minutes of inactivity.'
      : ''
  const profileInfoMsg =
    searchParams.get('reason') === 'profile'
      ? 'Your session profile could not be loaded. Please sign in again.'
      : ''
  const displayInfoMsg = inactivityInfoMsg || profileInfoMsg

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.')
      setLoading(false)
      return
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Invalid email or password.')
      }

      const user = authData.user
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('role, account_status')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError || !profileData) {
        await supabase.auth.signOut()
        throw new Error('Your user profile could not be found. Contact your hospital administrator.')
      }

      if (profileData.account_status !== 'active') {
        await supabase.auth.signOut()
        throw new Error('This account is inactive. Contact your hospital administrator.')
      }

      const userRole = normalizeRole(profileData.role ?? user.user_metadata?.role)
      const { data: membershipData, error: membershipError } = await supabase
        .from('hospital_memberships')
        .select('id, status, hospitals(name, is_active)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)

      const membership = membershipData?.[0]
      const hospital = Array.isArray(membership?.hospitals)
        ? membership?.hospitals[0]
        : membership?.hospitals

      if (membershipError || !membership) {
        await supabase.auth.signOut()
        throw new Error(`${getRoleLabel(userRole)} accounts must belong to an active hospital workspace.`)
      }

      if (hospital && hospital.is_active === false) {
        await supabase.auth.signOut()
        throw new Error('This hospital workspace is inactive. Contact the workspace owner.')
      }

      const redirectPath = searchParams.get('redirect')
      router.push(getDashboardRedirectPath(userRole, redirectPath))
      router.refresh()
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-med-bg relative py-12 px-6 flex items-center justify-center overflow-hidden">
      <div className="glass-panel max-w-md w-full p-8 rounded-2xl relative shadow-2xl border border-white/5 flex flex-col gap-6">
        {/* Logo and Header */}
        <div className="flex flex-col gap-2.5 text-center items-center">
          <Link href="/" className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-med-teal/10 text-med-teal">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-slate-300">MedOS AI</span>
          </Link>
          <h2 className="text-2xl font-black text-white tracking-tight leading-none">Sign In</h2>
          <p className="text-slate-400 text-xs">Enter your credentials to enter your medical workspace.</p>
        </div>

        {/* Display Alert Messages */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {displayInfoMsg && (
          <div className="p-3.5 rounded-xl bg-med-teal/10 border border-med-teal/20 text-med-teal text-xs font-semibold leading-relaxed">
            {displayInfoMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-semibold">Email Address *</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-semibold">Password *</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 rounded-xl text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-xl bg-med-teal hover:bg-med-teal/85 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-med-teal/15 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Authorizing Session...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Authenticate
              </>
            )}
          </button>
        </form>

        {/* Signup redirection links */}
        <div className="text-center text-xs text-slate-500 flex flex-col gap-2 mt-2">
          <span>
            Don&apos;t have a clinic account?{' '}
            <Link href="/signup/join" className="text-med-teal hover:underline font-semibold transition-colors">
              Join Hospital Workspace
            </Link>
          </span>
          <span>
            Or register a new hospital?{' '}
            <Link href="/signup/admin" className="text-med-teal hover:underline font-semibold transition-colors">
              Register Hospital Workspace
            </Link>
          </span>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-med-bg flex items-center justify-center text-slate-400 font-semibold">
        Loading MedOS Portal...
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
