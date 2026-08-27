import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

function showError(msg: string, stack?: string) {
  document.getElementById('root')!.innerHTML =
    `<div style="padding:20px;color:#ff4444;font-family:monospace;background:#111;min-height:100vh;white-space:pre-wrap;">` +
    `<h2>⚠ Runtime Error</h2><pre>${msg}\n${stack || ''}</pre></div>`
}

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
} catch (err: any) {
  showError(err?.message || String(err), err?.stack)
}
