// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

// sinal fraco no campo: sem timeout uma requisição pode ficar pendurada e travar o envio
const fetchComTimeout: typeof fetch = (url, init) =>
  fetch(url, init?.signal ? init : { ...init, signal: AbortSignal.timeout(20_000) })

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { global: { fetch: fetchComTimeout } }
  )
}
