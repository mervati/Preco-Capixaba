import { useState, useEffect } from 'react'

const DURATION = 1400

export default function SplashScreen() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const start = performance.now()
    let raf

    function tick(now) {
      const elapsed = now - start
      const p = Math.min((elapsed / DURATION) * 100, 100)
      setProgress(p)
      if (p < 100) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16, zIndex: 100,
    }}>
      <img
        src="/logo.png"
        alt="Preço Certo"
        style={{ width: 88, height: 88, borderRadius: 22, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
      />

      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>
          Preço Certo
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Lista de compras inteligente
        </p>
      </div>

      <div style={{ width: 200, marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue-700)' }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            background: 'var(--blue-700)',
            width: `${progress}%`,
            transition: 'width 0.05s linear',
          }} />
        </div>
      </div>
    </div>
  )
}
