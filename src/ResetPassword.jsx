import { useState, useEffect } from 'react'
import { supabase } from './supabase.js'

const UI_FONT = "'Barlow Condensed', sans-serif"

export default function ResetPassword() {
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [done, setDone]           = useState(false)
  const [ready, setReady]         = useState(false)
  const [expired, setExpired]     = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // Cobre o caso em que a sessão já foi estabelecida antes do mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    const timeout = setTimeout(() => {
      setExpired(prev => { if (!prev) return true; return prev })
    }, 4000)
    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  // Cancela o timeout de expiração ao ficar ready
  useEffect(() => {
    if (ready) setExpired(false)
  }, [ready])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      await supabase.auth.signOut()
      setDone(true)
      setTimeout(() => {
        window.location.href = '/?reset=ok'
      }, 1800)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    background: '#FFFFFF', border: '1px solid #C8C2B8',
    borderRadius: 5, outline: 'none',
    fontFamily: UI_FONT, fontSize: 15, color: '#1A1A1A',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }

  const renderBody = () => {
    if (done) return (
      <div style={{
        background: '#EEFBF3', border: '1px solid #A8E6C1', borderRadius: 5,
        padding: '12px 14px', fontSize: 14, color: '#27AE60',
        lineHeight: 1.5, textAlign: 'center',
      }}>
        Senha atualizada com sucesso!<br />
        <span style={{ fontSize: 12, color: '#888888' }}>Redirecionando para o login…</span>
      </div>
    )

    if (expired && !ready) return (
      <>
        <div style={{
          background: '#FEF0EE', border: '1px solid #F5C6C2', borderRadius: 5,
          padding: '10px 12px', fontSize: 13, color: '#C0392B', lineHeight: 1.5,
        }}>
          Link inválido ou expirado. Solicite um novo link de redefinição.
        </div>
        <a href="/" style={{
          display: 'block', textAlign: 'center', fontSize: 13,
          color: '#888888', textDecoration: 'none', transition: 'color 0.12s',
        }}
          onMouseEnter={e => { e.currentTarget.style.color = '#1A1A1A' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#888888' }}
        >
          ← voltar para o login
        </a>
      </>
    )

    if (!ready) return (
      <div style={{ textAlign: 'center', fontSize: 13, color: '#888888', padding: '8px 0' }}>
        Verificando link…
      </div>
    )

    return (
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          type="password" placeholder="nova senha (mín. 6 caracteres)"
          value={password} required minLength={6}
          onChange={e => setPassword(e.target.value)} style={inputStyle}
          onFocus={e => { e.target.style.borderColor = '#888888' }}
          onBlur={e => { e.target.style.borderColor = '#C8C2B8' }}
          autoFocus
        />
        {error && (
          <div style={{
            background: '#FEF0EE', border: '1px solid #F5C6C2', borderRadius: 5,
            padding: '8px 12px', fontSize: 13, color: '#C0392B',
          }}>
            {error}
          </div>
        )}
        <button
          type="submit" disabled={loading}
          style={{
            marginTop: 4, padding: '11px 0',
            background: loading ? '#C8C2B8' : '#1A1A1A',
            color: '#FFFFFF', fontFamily: UI_FONT, fontSize: 15, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase', borderRadius: 5,
            transition: 'background 0.15s', cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '…' : 'Salvar nova senha'}
        </button>
      </form>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; background: #2D5A3D; }
      `}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(45, 90, 61, 0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: UI_FONT,
      }}>
        <div style={{
          width: 360,
          backgroundColor: '#EDE8DF',
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)',
          backgroundSize: '4px 4px',
          borderRadius: 8, padding: '32px 28px 28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '0.06em', color: '#1A1A1A' }}>
              jrnl
            </div>
            <div style={{ fontSize: 13, color: '#888888', marginTop: 4 }}>
              {done ? 'tudo certo!' : 'nova senha'}
            </div>
          </div>
          {renderBody()}
        </div>
      </div>
    </>
  )
}
