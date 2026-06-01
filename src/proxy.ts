import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const path = request.nextUrl.pathname

  // 1. Protect all dashboard routes
  if (path.startsWith('/dashboard')) {
    if (!user) {
      // User is not authenticated, redirect to login page
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', path)
      return NextResponse.redirect(url)
    }

    const role = user.user_metadata?.role || 'patient'
    
    // 2. Perform RBAC routing checks
    if (role === 'patient') {
      // Patients are restricted to: appointments, finance (bills), pharmacy (prescriptions)
      const allowedPaths = ['/dashboard/appointments', '/dashboard/finance', '/dashboard/pharmacy']
      const isAllowed = allowedPaths.some(p => path.startsWith(p))
      if (!isAllowed) {
        // Redirect patients back to appointments homepage
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard/appointments'
        return NextResponse.redirect(url)
      }
    } else if (role === 'doctor') {
      // Doctors are clinical and cannot access finance, staff management, or audit logs
      const forbiddenPaths = ['/dashboard/finance', '/dashboard/staff', '/dashboard/audit']
      const isForbidden = forbiddenPaths.some(p => path.startsWith(p))
      if (isForbidden) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    } else if (role === 'staff') {
      // Staff are operational and cannot access physician diagnostics, finance (bills/claims), or audit logs
      const forbiddenPaths = ['/dashboard/diagnostics', '/dashboard/finance', '/dashboard/audit']
      const isForbidden = forbiddenPaths.some(p => path.startsWith(p))
      if (isForbidden) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    } else if (['owner_admin', 'hospital_admin', 'admin'].includes(role)) {
      // Admins have unrestricted access to all dashboard routes
    }
  }

  // 3. Prevent logged-in users from hitting login or signup landing pages
  if ((path === '/login' || path.startsWith('/signup')) && user) {
    const url = request.nextUrl.clone()
    const role = user.user_metadata?.role || 'patient'
    url.pathname = role === 'patient' ? '/dashboard/appointments' : '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
