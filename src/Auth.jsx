import { useState } from 'react'
import { supabase } from './supabase.js'

const UI_FONT = "'Barlow Condensed', sans-serif"

/**
 * Modal de autenticação.
 * Props:
 *  onClose   – chamado para fechar (se omitido, não mostra o "continuar sem login")
 *  message   – texto de contexto exibido no topo (ex: "Login necessário para baixar")
 */
export default function Auth({ onClose, message }) {
  const [mode, setMode]         = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [info, setInfo]         = useState(null)   // mensagem informativa (ex: confirmação de email)

  const reset = (nextMode) => {
    setMode(nextMode)
    setError(null)
    setInfo(null)
    setEmail('')
    setPassword('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(
          error.message === 'Invalid login credentials'
            ? 'E-mail ou senha incorretos.'
            : error.message
        )
      }
      // Se ok, onAuthStateChange atualiza `user` → App fecha o modal
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      })

      if (error) {
        setError(
          error.message.includes('already registered')
            ? 'Este e-mail já está cadastrado. Tente fazer login.'
            : error.message
        )
      } else if (data.user && !data.session) {
        // Email de confirmação foi enviado
        setInfo('Cadastro realizado! Verifique seu e-mail e clique no link de confirmação para ativar sua conta.')
      }
      // Se confirmação desabilitada no Supabase, data.session existe → App fecha o modal
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    background: '#FFFFFF', border: '1px solid #C8C2B8',
    borderRadius: 5, outline: 'none',
    fontFamily: UI_FONT, fontSize: 15, color: '#1A1A1A',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }

  return (
    /* Overlay */
    <div
      onClick={onClose ?? undefined}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(45, 90, 61, 0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(3px)',
        fontFamily: UI_FONT,
      }}
    >
      {/* Card — stopPropagation para não fechar ao clicar dentro */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 360,
          backgroundColor: '#EDE8DF',
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)',
          backgroundSize: '4px 4px',
          borderRadius: 8, padding: '32px 28px 28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', gap: 18,
          animation: 'fadeDropdown 0.18s ease',
        }}
      >
        {/* Logo + título */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '0.06em', color: '#1A1A1A' }}>
            jrnl
          </div>
          <div style={{ fontSize: 13, color: '#888888', marginTop: 4 }}>
            {mode === 'login' ? 'entrar na sua conta' : 'criar nova conta'}
          </div>
        </div>

        {/* Mensagem de contexto (ex: "login para baixar") */}
        {message && !info && (
          <div style={{
            background: '#F0EBE3', border: '1px solid #D8D2C8', borderRadius: 5,
            padding: '8px 12px', fontSize: 13, color: '#555555', textAlign: 'center',
          }}>
            {message}
          </div>
        )}

        {/* Mensagem de sucesso/info */}
        {info && (
          <div style={{
            background: '#EEFBF3', border: '1px solid #A8E6C1', borderRadius: 5,
            padding: '10px 12px', fontSize: 13, color: '#27AE60', lineHeight: 1.5,
          }}>
            {info}
          </div>
        )}

        {/* Formulário */}
        {!info && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="email" placeholder="e-mail" value={email} required
              onChange={e => setEmail(e.target.value)} style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#888888'; }}
              onBlur={e => { e.target.style.borderColor = '#C8C2B8'; }}
            />
            <input
              type="password" placeholder="senha (mín. 6 caracteres)" value={password} required minLength={6}
              onChange={e => setPassword(e.target.value)} style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#888888'; }}
              onBlur={e => { e.target.style.borderColor = '#C8C2B8'; }}
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
              {loading ? '...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>
        )}

        {/* Toggle modo */}
        {!info && (
          <div style={{ textAlign: 'center', fontSize: 13, color: '#888888' }}>
            {mode === 'login' ? (
              <>Não tem conta?{' '}
                <span onClick={() => reset('signup')}
                  style={{ color: '#1A1A1A', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                  Criar conta
                </span>
              </>
            ) : (
              <>Já tem conta?{' '}
                <span onClick={() => reset('login')}
                  style={{ color: '#1A1A1A', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                  Entrar
                </span>
              </>
            )}
          </div>
        )}

        {/* Continuar sem login */}
        {onClose && (
          <div
            onClick={onClose}
            style={{
              textAlign: 'center', fontSize: 12, color: '#AAAAAA',
              cursor: 'pointer', paddingTop: 2,
              transition: 'color 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#555555'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#AAAAAA'; }}
          >
            continuar sem login
          </div>
        )}
      </div>
    </div>
  )
}
