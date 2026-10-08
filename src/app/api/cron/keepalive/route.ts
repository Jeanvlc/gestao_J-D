// Vercel Cron diário: uma consulta leve para o Supabase gratuito não pausar por inatividade
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET
  if (!segredo || req.headers.get('authorization') !== `Bearer ${segredo}`) return new Response('Não autorizado', { status: 401 })
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })
  const { error } = await sb.from('va_tanques').select('id').limit(1)
  return Response.json({ ok: !error, erro: error?.message }, { status: error ? 500 : 200 })
}
