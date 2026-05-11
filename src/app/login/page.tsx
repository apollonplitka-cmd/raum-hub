'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { createClient } = await import('@/lib/supabase')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Неверный email или пароль')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0d0d12',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        input { outline: none; transition: border-color 0.15s; }
        input:focus { border-color: #7c5cfc !important; }
      `}</style>
      <div style={{
        width: 380, background: '#13131a',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20, padding: '40px 36px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, background: '#7c5cfc',
            borderRadius: 14, display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: 20, color: 'white',
            boxShadow: '0 0 30px rgba(124,92,252,0.4)',
          }}>R</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#f0eeff' }}>RAUM HUB</div>
          <div style={{ fontSize: 13, color: 'rgba(240,238,255,0.4)', marginTop: 4 }}>Командный центр</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: 'rgba(240,238,255,0.5)', display: 'block', marginBottom: 6 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="your@email.com"
              style={{
                width: '100%', padding: '10px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, color: '#f0eeff', fontSize: 14,
                fontFamily: 'DM Sans, sans-serif',
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'rgba(240,238,255,0.5)', display: 'block', marginBottom: 6 }}>Пароль</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, color: '#f0eeff', fontSize: 14,
                fontFamily: 'DM Sans, sans-serif',
              }}
            />
          </div>
          {error && <div style={{ color: '#f43f5e', fontSize: 13, marginBottom: 14, textAlign: 'center' }}>{error}</div>}
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '11px 0',
              background: loading ? 'rgba(124,92,252,0.5)' : '#7c5cfc',
              border: 'none', borderRadius: 10,
              color: 'white', fontSize: 15,
              fontFamily: 'Syne, sans-serif', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              boxShadow: loading ? 'none' : '0 0 20px rgba(124,92,252,0.3)',
            }}
          >
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  )
}
