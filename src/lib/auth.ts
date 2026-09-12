// src/lib/auth.ts
import { createClient } from '@/lib/supabase/server'

export async function getUsuarioAtual() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}
