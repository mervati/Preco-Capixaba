import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password)
      } else {
        await signUpWithEmail(email, password)
        setDone(true)
      }
    } catch (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : err.message || 'Ocorreu um erro. Tente novamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
          <h2 style={{ ...styles.heading, marginBottom: 8 }}>Confirme seu e-mail</h2>
          <p style={styles.sub}>Enviamos um link de confirmação para <strong>{email}</strong>. Acesse e volte aqui para entrar.</p>
          <button style={styles.linkBtn} onClick={() => setDone(false)}>Voltar para o login</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <img
            src="/logo.png"
            alt="Preço Capixaba"
            style={{ width: 88, height: 88, objectFit: 'contain' }}
            onError={e => { e.target.replaceWith(Object.assign(document.createElement('div'), { textContent: '🛒', style: 'font-size:56px' })) }}
          />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--text)', letterSpacing: '-0.4px' }}>Preço Capixaba</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', letterSpacing: '0.4px', textTransform: 'uppercase', fontWeight: 500, marginTop: 2 }}>
              Lista de compras · ES
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }} onClick={() => { setMode('login'); setError('') }}>
            Entrar
          </button>
          <button style={{ ...styles.tab, ...(mode === 'signup' ? styles.tabActive : {}) }} onClick={() => { setMode('signup'); setError('') }}>
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="E-mail"
            required
            style={styles.input}
            onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Senha"
            required
            minLength={6}
            style={styles.input}
            onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />

          {error && (
            <div style={{ fontSize: 13, color: 'var(--rose-600)', background: 'var(--rose-50)', padding: '10px 14px', borderRadius: 8 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={styles.btnPrimary}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', padding: '0 10px', background: 'var(--surface)' }}>ou</span>
          <span style={styles.dividerLine} />
        </div>

        <button onClick={signInWithGoogle} style={styles.btnGoogle}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continuar com Google
        </button>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100dvh',
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 20px',
  },
  card: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius-lg)',
    padding: '32px 28px 36px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 4px 32px rgba(0,0,0,0.07)',
    border: '1px solid var(--border)',
  },
  heading: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text)',
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: 'var(--text-muted)',
    textAlign: 'center',
    lineHeight: 1.6,
    marginBottom: 20,
  },
  tabs: {
    display: 'flex',
    background: 'var(--bg)',
    borderRadius: 'var(--radius-sm)',
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  tab: {
    flex: 1, padding: '9px 0',
    background: 'none', border: 'none',
    borderRadius: 8, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
    color: 'var(--text-muted)',
    transition: 'all 0.15s',
  },
  tabActive: {
    background: 'var(--surface)',
    color: 'var(--text)',
    fontWeight: 700,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  input: {
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 16px',
    fontSize: 15,
    fontFamily: 'inherit',
    color: 'var(--text)',
    background: 'var(--bg)',
    outline: 'none',
    transition: 'border-color 0.15s',
    width: '100%',
  },
  btnPrimary: {
    background: 'var(--blue-700)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '13px',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    marginTop: 4,
    transition: 'background 0.15s',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '20px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'var(--border)',
  },
  btnGoogle: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%',
    padding: '12px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--surface)',
    fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
    color: 'var(--text)',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  linkBtn: {
    background: 'none', border: 'none',
    color: 'var(--blue-700)', fontSize: 14, fontWeight: 600,
    fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'underline',
  },
}
