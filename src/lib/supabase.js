import { createClient } from '@supabase/supabase-js'

// A chave anon/publishable do Supabase é pública por design — ela sempre fica
// visível no bundle do navegador (toda variável VITE_ é exposta no build).
// Por isso deixamos os valores direto no código, usando o projeto Supabase
// compartilhado (Apps) entre PontoAPP, Preço Certo e Centavus.
const supabaseUrl = 'https://lyunxbgqodhbqrvdqmqz.supabase.co'
const supabaseKey = 'sb_publishable_l8QAPbi-ioY-gAdsofDs4A_HuQOqIwe'

export const supabase = createClient(supabaseUrl, supabaseKey)
