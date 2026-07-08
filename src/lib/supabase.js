import { createClient } from '@supabase/supabase-js'

// Projeto Supabase próprio do Preço Certo (onde estão os dados reais).
// A chave anon/publishable é pública por design (já vai exposta no bundle).
const supabaseUrl = 'https://dppjsrqohvuiektzbbnu.supabase.co'
const supabaseKey = 'sb_publishable_7_jBiNzuqNsAcGqajwVP6w_upUiozxd'

export const supabase = createClient(supabaseUrl, supabaseKey)
