'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Activity,
  LayoutDashboard,
  Users,
  CalendarDays,
  Pill,
  FlaskConical,
  Scan,
  DollarSign,
  UserCog,
  ShieldCheck,
  Heart,
  ArrowRight,
  LogIn,
  UserPlus,
  ShieldAlert,
  Sparkles,
  Info,
  CheckCircle2,
  Award
} from 'lucide-react'

// MEWS Calculation helpers
function calcMEWS(hr: number, spo2: number, temp: number): number {
  let score = 0
  // Heart rate
  if (hr < 40 || hr > 130) score += 3
  else if (hr < 50 || hr > 110) score += 2
  else if (hr < 60 || hr > 100) score += 1

  // SpO2
  if (spo2 < 85) score += 3
  else if (spo2 < 90) score += 2
  else if (spo2 < 95) score += 1

  // Temperature
  if (temp < 35 || temp > 40) score += 2
  else if (temp < 36 || temp > 38.5) score += 1

  return score
}

function getMEWSRisk(score: number): { level: string; color: string; bg: string; border: string; text: string; rec: string } {
  if (score <= 2) {
    return {
      level: 'Low Risk',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      rec: 'Continue standard routine observation. Re-assess vitals in 4-6 hours.'
    }
  } else if (score <= 4) {
    return {
      level: 'Moderate Risk',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.1)',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      rec: 'Increase vitals monitoring frequency to every 2 hours. Inform the attending ward doctor.'
    }
  } else if (score <= 6) {
    return {
      level: 'High Risk',
      color: '#f97316',
      bg: 'rgba(249, 115, 22, 0.1)',
      border: 'border-orange-500/20',
      text: 'text-orange-400',
      rec: 'Urgent medical review required. Mobilize senior clinician and prepare resuscitation tray.'
    }
  } else {
    return {
      level: 'Critical Risk (Emergency)',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'border-red-500/20',
      text: 'text-red-400',
      rec: 'EMERGENCY: Immediate clinical escalation. Direct specialist assessment and prepare ICU pathway.'
    }
  }
}

export default function LandingPage() {
  // Interactive Triage Demo States
  const [hr, setHr] = useState(75)
  const [spo2, setSpo2] = useState(98)
  const [temp, setTemp] = useState(36.8)
  const [mewsScore, setMewsScore] = useState(0)

  useEffect(() => {
    setMewsScore(calcMEWS(hr, spo2, temp))
  }, [hr, spo2, temp])

  const risk = getMEWSRisk(mewsScore)

  return (
    <div className="relative min-h-screen bg-med-bg overflow-hidden flex flex-col justify-between">
      {/* Background Decorative Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full glow-bg-teal -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full glow-bg-indigo -z-10" />

      {/* Navigation Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-med-teal to-med-accent text-slate-900 shadow-lg shadow-med-teal/20">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">
              MedOS <span className="text-med-teal font-extrabold">AI</span>
            </h1>
            <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Nigerian Clinical OS</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-slate-950/40 hover:bg-slate-900/60 text-slate-200 text-sm font-semibold tracking-wide transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </Link>
          <Link
            href="/signup/admin"
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-med-teal hover:bg-med-teal/85 text-slate-950 text-sm font-extrabold tracking-wide transition-all shadow-lg shadow-med-teal/15 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Register Hospital
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-7xl mx-auto px-6 py-10 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10 flex-grow">
        {/* Hero Copy */}
        <div className="lg:col-span-6 flex flex-col gap-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-med-teal/10 border border-med-teal/20 text-med-teal text-xs font-semibold uppercase tracking-wider w-fit">
            <Award className="w-3.5 h-3.5" /> 100% Nigerian Compliance & Roster Frameworks
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
            Next-gen clinical workflows, <span className="text-transparent bg-clip-text bg-gradient-to-r from-med-teal to-med-accent">precision triage.</span>
          </h2>

          <p className="text-base md:text-lg text-slate-400 leading-relaxed max-w-xl">
            A premium, localized hospital registry and predictive clinical assistant custom-tailored for Nigerian healthcare facilities. Track diagnostics, automate pharmacy inventory, manage Naira invoicing, and maintain compliance seamlessly.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-2">
            <Link
              href="/signup/admin"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-med-teal to-med-accent hover:opacity-90 text-slate-950 font-extrabold tracking-wide transition-all shadow-xl shadow-med-teal/15 cursor-pointer"
            >
              Setup Admin Workspace
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </Link>
            <Link
              href="/signup/join"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/15 bg-slate-900/30 hover:bg-slate-900/60 text-slate-200 font-semibold tracking-wide transition-all cursor-pointer"
            >
              Join with Token
            </Link>
          </div>
        </div>

        {/* Live Interactive MEWS Triage Simulation Widget */}
        <div className="lg:col-span-6 glass-panel p-6 sm:p-8 rounded-2xl relative shadow-2xl overflow-hidden border border-white/10 flex flex-col gap-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-med-teal/5 rounded-full blur-2xl" />
          
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 animate-pulse" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Live Clinical Simulator</span>
            </div>
            <span className="text-xs font-mono text-slate-500">triage_assistant.sys</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-300 font-bold mb-1">
              <Sparkles className="w-4 h-4 text-med-teal" /> Adjust Patient Vitals below:
            </div>

            {/* HR Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-400">Heart Rate (HR)</span>
                <span className="text-white font-mono">{hr} bpm</span>
              </div>
              <input
                type="range"
                min="35"
                max="150"
                value={hr}
                onChange={(e) => setHr(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-med-teal"
              />
            </div>

            {/* SpO2 Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-400">Oxygen Saturation (SpO₂)</span>
                <span className="text-white font-mono">{spo2} %</span>
              </div>
              <input
                type="range"
                min="80"
                max="100"
                value={spo2}
                onChange={(e) => setSpo2(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-med-teal"
              />
            </div>

            {/* Temp Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-400">Body Temperature</span>
                <span className="text-white font-mono">{temp.toFixed(1)} °C</span>
              </div>
              <input
                type="range"
                min="34"
                max="41"
                step="0.1"
                value={temp}
                onChange={(e) => setTemp(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-med-teal"
              />
            </div>
          </div>

          {/* MEWS Dynamic Results Panel */}
          <div
            className="rounded-xl p-5 border transition-all duration-300 flex flex-col gap-4 mt-2"
            style={{
              backgroundColor: risk.bg,
              borderColor: risk.color + '20'
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: risk.color }}
                />
                <div>
                  <h4 className="text-sm font-bold text-white leading-none">{risk.level}</h4>
                  <span className="text-xxs text-slate-400">MEWS Score Algorithm</span>
                </div>
              </div>
              <div className="text-right">
                <span
                  className="text-2xl font-black font-mono tracking-tight"
                  style={{ color: risk.color }}
                >
                  {mewsScore}
                </span>
                <span className="text-xs text-slate-500 font-bold"> / 12</span>
              </div>
            </div>

            {/* Progress indicator bar */}
            <div>
              <div className="h-1.5 w-full bg-slate-950/40 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(mewsScore / 12) * 100}%`,
                    backgroundColor: risk.color
                  }}
                />
              </div>
            </div>

            {/* Clinical Recommendation Text */}
            <div className="text-xs text-slate-300 bg-slate-950/30 rounded-lg p-3 border border-white/5 flex gap-2">
              <Info className="w-4 h-4 text-med-teal flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">{risk.rec}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Modules Section */}
      <section className="w-full max-w-7xl mx-auto px-6 py-12 md:py-20 border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto mb-16 flex flex-col gap-3">
          <span className="text-xs uppercase text-med-teal font-extrabold tracking-widest">
            Core Modules
          </span>
          <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            Integrated Workspace for Clinical Excellence
          </h3>
          <p className="text-sm md:text-base text-slate-400">
            A comprehensive operational dashboard connecting clinicians, laboratory experts, radiologists, and administrative staff under one portal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: LayoutDashboard,
              title: 'Overview & Operational KPIs',
              desc: 'Real-time monitoring of active patients, consult schedules, low stock notifications, and pending laboratory orders.'
            },
            {
              icon: Activity,
              title: 'MEWS Triage Engine',
              desc: 'Stratify emergency patient queues using the Modified Early Warning Score protocol to optimize ward priorities.'
            },
            {
              icon: Users,
              title: 'Electronic Health Records',
              desc: 'Seamless, comprehensive patient charts, consult logs, prescription indexing, and diagnostic histories.'
            },
            {
              icon: CalendarDays,
              title: 'Appointment Calendars',
              desc: 'Intelligent booking scheduler for consultants and doctors, managing clinic session availability efficiently.'
            },
            {
              icon: Pill,
              title: 'Smart Pharmacy Inventory',
              desc: 'Log medicines, monitor batch expiries, manage restocking requests, and track real-time dispensing logs.'
            },
            {
              icon: FlaskConical,
              title: 'LOINC Lab Operations',
              desc: 'Order pathology/chemistry panels, upload diagnostic results, and track patient values against standards.'
            },
            {
              icon: Scan,
              title: 'Radiology (PACS) Archivist',
              desc: 'Archive scans, catalog body parts, save diagnostic predictions, and record physician review notes.'
            },
            {
              icon: DollarSign,
              title: 'Finance & Invoicing (₦)',
              desc: 'Generate medical bills in Nigerian Naira (₦), track collections, log waivers, and log NHIA HMO coverage details.'
            },
            {
              icon: ShieldCheck,
              title: 'Secure Audit trail',
              desc: 'Immutable, cryptographically validated activity records logs detailing all patient file read/write actions.'
            }
          ].map((m, idx) => (
            <div key={idx} className="glass-card p-6 rounded-2xl flex flex-col gap-4 border border-white/5 hover:border-med-teal/20 transition-all">
              <div className="p-3 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-950 border border-white/5 text-med-teal w-fit">
                <m.icon className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">{m.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance Section */}
      <section className="w-full max-w-7xl mx-auto px-6 py-12 md:py-20 border-t border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 flex flex-col gap-5">
            <span className="text-xs uppercase text-med-teal font-extrabold tracking-widest">
              Regulatory Standards
            </span>
            <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
              100% Compliant with Nigerian Health Guidelines
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Designed from the ground up to respect local administrative frameworks, data sovereignty rules, and medical council guidelines.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg w-fit border border-emerald-500/20 font-mono text-xs font-bold">
                NDPR
              </div>
              <h4 className="text-sm font-bold text-white">Data Privacy</h4>
              <p className="text-xxs text-slate-400 leading-relaxed">
                Adheres strictly to the Nigeria Data Protection Regulation. All patient health records are encrypted at rest with local audit trail validations.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col gap-3">
              <div className="p-2 bg-med-teal/10 text-med-teal rounded-lg w-fit border border-med-teal/20 font-mono text-xs font-bold">
                MDCN
              </div>
              <h4 className="text-sm font-bold text-white">Practice Audits</h4>
              <p className="text-xxs text-slate-400 leading-relaxed">
                Follows the Medical and Dental Council of Nigeria clinical registers standards, requiring credentials-backed validation of all diagnostic logs.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col gap-3">
              <div className="p-2 bg-med-accent/10 text-med-accent rounded-lg w-fit border border-med-accent/20 font-mono text-xs font-bold">
                NHIA
              </div>
              <h4 className="text-sm font-bold text-white">Insurance Tariff</h4>
              <p className="text-xxs text-slate-400 leading-relaxed">
                Tariffs aligned with the National Health Insurance Authority guidelines to ensure HMO coverage claims match standardized tables.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-8 text-center text-xs text-slate-500 z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="flex items-center gap-1.5">
            Made with <Heart className="w-3.5 h-3.5 text-med-teal fill-med-teal" /> for digital health operations in Nigeria.
          </p>
          <p>
            MedOS AI &copy; 2026. Custom-tailored workspace. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
