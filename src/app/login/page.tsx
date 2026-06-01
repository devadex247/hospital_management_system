'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Activity, Mail, Lock, Key, ClipboardList, Eye, EyeOff, Loader2, LogIn, ShieldAlert } from 'lucide-react'

type LoginRole = 'owner_admin' | 'doctor' | 'staff' | 'patient'

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected database error occurred.'
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const supabase = createClient()

  // Form Fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<LoginRole>('patient')
  const [accessToken, setAccessToken] = useState('')

  // State controls
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [infoMsg, setInfoMsg] = useState('')
  const inactivityInfoMsg =
    searchParams.get('reason') === 'inactivity'
      ? 'You have been logged out due to 15 minutes of inactivity.'
      : ''
  const displayInfoMsg = infoMsg || inactivityInfoMsg

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setInfoMsg('')

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.')
      setLoading(false)
      return
    }

    if (role !== 'patient' && !accessToken) {
      setErrorMsg('Hospital access token is required for workspace accounts.')
      setLoading(false)
      return
    }

    try {
      // 1. Sign In via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Invalid email or password.')
      }

      const user = authData.user
      const { data: profileData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      const userRole = profileData?.role || user.user_metadata?.role || 'patient'

      // 2. Validate Role Scoping Matches
      // Allow general matching for admins consistent with Flask
      const isAdminMatch = ['admin', 'owner_admin', 'hospital_admin'].includes(role) && ['admin', 'owner_admin', 'hospital_admin'].includes(userRole)
      if (userRole !== role && !isAdminMatch) {
        // Sign out since role didn't match selection
        await supabase.auth.signOut()
        throw new Error(`This account is registered as a ${userRole.replace('_', ' ')}, not a ${role.replace('_', ' ')}.`)
      }

      // 3. For workspace accounts, validate the Hospital Access Token
      if (role !== 'patient') {
        const cleanToken = accessToken.trim().toUpperCase()

        const { data: tokenData, error: tokenError } = await supabase
          .from('hospital_access_tokens')
          .select('*, hospitals(*)')
          .eq('access_token', cleanToken)
          .eq('is_active', true)
          .single()

        if (tokenError || !tokenData) {
          await supabase.auth.signOut()
          throw new Error('Hospital access token is invalid, rotated, or inactive.')
        }

        // Verify that the user has a membership at this specific hospital
        const { data: membershipData, error: membershipError } = await supabase
          .from('hospital_memberships')
          .select('*')
          .eq('hospital_id', tokenData.hospital_id)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (membershipError || !membershipData) {
          await supabase.auth.signOut()
          throw new Error(`Your account does not belong to the hospital workspace associated with token ${cleanToken}.`)
        }
      }

      // 4. Session established successfully. Redirect based on role.
      // Redirect parameter support included
      const redirectPath = searchParams.get('redirect')
      if (redirectPath) {
        router.push(redirectPath)
      } else {
        router.push(role === 'patient' ? '/dashboard/appointments' : '/dashboard')
      }
      router.refresh()
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-med-bg relative py-12 px-6 flex items-center justify-center overflow-hidden">
      {/* Glow Rings */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full glow-bg-teal -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full glow-bg-indigo -z-10" />

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
          <p className="text-slate-400 text-xs">Enter credentials to enter your medical workspace.</p>
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
            <label className="text-xs text-slate-400 font-semibold">Workspace Role *</label>
            <div className="relative">
              <ClipboardList className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as LoginRole)}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm appearance-none bg-slate-900/80 cursor-pointer"
              >
                <option value="patient">Patient Portal</option>
                <option value="doctor">Doctor Portal</option>
                <option value="staff">Staff Portal</option>
                <option value="owner_admin">Owner Administrator</option>
              </select>
            </div>
          </div>

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

          {/* Conditional Token Input based on selected Role */}
          {role !== 'patient' && (
            <div className="flex flex-col gap-1.5 animate-fadeIn">
              <label className="text-xs text-slate-400 font-semibold">Hospital Access Token *</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value.toUpperCase())}
                  placeholder="8-character invite code"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-mono tracking-widest text-med-teal font-bold placeholder:font-sans placeholder:tracking-normal placeholder:font-normal"
                />
              </div>
            </div>
          )}

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
