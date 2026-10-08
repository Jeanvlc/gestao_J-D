import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export const middleware = (request: NextRequest) => updateSession(request)

export const config = {
  matcher: ['/((?!_next/static|_next/image|sw.js|manifest.webmanifest|icon-.*\.png|api/cron).*)'],
}
