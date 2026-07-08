import { createClient } from '@supabase/supabase-js'

// Projeto Supabase compartilhado (Apps) entre PontoAPP, Preço Certo e Centavus.
// A chave anon/publishable é pública por design (já vai exposta no bundle).
const supabaseUrl = 'https://lyunxbgqodhbqrvdqmqz.supabase.co'
const supabaseKey = 'sb_publishable_l8QAPbi-ioY-gAdsofDs4A_HuQOqIwe'

export const supabase = createClient(supabaseUrl, supabaseKey)
