import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n'
import App from './App.jsx'
import { AdminProvider } from './context/AdminContext'

const FALLBACK_API_BASE_URL = 'http://localhost:8000'
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').trim() || FALLBACK_API_BASE_URL

window.__API_BASE_URL__ = API_BASE_URL

const originalFetch = window.fetch.bind(window)
window.fetch = (input, init) => {
  if (typeof input === 'string' && input.startsWith(FALLBACK_API_BASE_URL)) {
    const relativePath = input.slice(FALLBACK_API_BASE_URL.length)
    input = `${API_BASE_URL}${relativePath}`
  }

  return originalFetch(input, init)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AdminProvider>
        <App />
      </AdminProvider>
    </BrowserRouter>
  </StrictMode>,
)
