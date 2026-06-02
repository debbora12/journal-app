import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ResetPassword from './ResetPassword.jsx'

const isResetPage = window.location.pathname === '/reset-password'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isResetPage ? <ResetPassword /> : <App />}
  </StrictMode>,
)
