import { useState } from 'react'
import { supabase } from './supabase.js'

const UI_FONT = "'Barlow Condensed', sans-serif"

export default function Auth() {
  const [mode, setMode]       = useState('login')   // 'login' | 'signup'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [message, setMessage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Verifique seu e-mail para confirmar o cadastro.')
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    background: '#FFFFFF', border: '1px solid #C8C2B8',
    borderRadius: 5, outline: 'none',
    fontFamily: UI_FONT, fontSize: 15, color: '#1A1A1A',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; }
        button { border: none; outline: none; cursor: pointer; }
        input:focus { border-color: #888888 !important; }
      `}</style>

      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#2D5A3D',
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
          "<svg xmlns='http://www.w3.org/2000/svg' width='50' height='50'>" +
          "<path d='M10 0 L10 50 M20 0 L20 50 M30 0 L30 50 M40 0 L40 50 M0 10 L50 10 M0 20 L50 20 M0 30 L50 30 M0 40 L50 40' stroke='#3D7A52' stroke-width='0.4' opacity='0.55'/>" +
          "<rect x='0' y='0' width='50' height='50' fill='none' stroke='#4A9060' stroke-width='0.9' opacity='0.65'/>" +
          "</svg>"
        )}")`,
        backgroundSize: '50px 50px',
        fontFamily: UI_FONT,
      }}>
        {/* Card */}
        <div style={{
          width: 360,
          backgroundColor: '#EDE8DF',
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)',
          backgroundSize: '4px 4px',
          borderRadius: 8,
          padding: '36px 32px 32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '0.06em', color: '#1A1A1A' }}>
              jrnl
            </div>
            <div style={{ fontSize: 13, color: '#888888', marginTop: 4, letterSpacing: '0.04em' }}>
              {mode === 'login' ? 'entrar na sua conta' : 'criar nova conta'}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email"
              placeholder="e-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
            />

            {error && (
              <div style={{ fontSize: 13, color: '#C0392B', background: '#FEF0EE', border: '1px solid #F5C6C2', borderRadius: 4, padding: '8px 12px' }}>
                {error}
              </div>
            )}
            {message && (
              <div style={{ fontSize: 13, color: '#27AE60', background: '#EEFBF3', border: '1px solid #A8E6C1', borderRadius: 4, padding: '8px 12px' }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '11px 0', marginTop: 4,
                background: loading ? '#C8C2B8' : '#1A1A1A',
                color: '#FFFFFF',
                fontFamily: UI_FONT, fontSize: 15, fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                borderRadius: 5,
                transition: 'background 0.15s',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          {/* Toggle mode */}
          <div style={{ textAlign: 'center', fontSize: 13, color: '#888888' }}>
            {mode === 'login' ? (
              <>Não tem conta?{' '}
                <span onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
                  style={{ color: '#1A1A1A', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                  Criar conta
                </span>
              </>
            ) : (
              <>Já tem conta?{' '}
                <span onClick={() => { setMode('login'); setError(null); setMessage(null); }}
                  style={{ color: '#1A1A1A', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                  Entrar
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
