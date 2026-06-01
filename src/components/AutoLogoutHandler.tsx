'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const INACTIVITY_TIMEOUT = 15 * 60 * 1000 // 15 minutes in milliseconds

export default function AutoLogoutHandler() {
  const router = useRouter()
  const supabase = createClient()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleLogout = async () => {
      // Clear Supabase session on serverless function backend as well
      await supabase.auth.signOut()
      router.push('/login?reason=inactivity')
      router.refresh()
    }

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT)
    }

    // Set initial timer
    resetTimer()

    // Monitor standard user interaction events to refresh active status
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach(event => {
      window.addEventListener(event, resetTimer)
    })

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      events.forEach(event => {
        window.removeEventListener(event, resetTimer)
      })
    }
  }, [router, supabase.auth])

  return null
}
