import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './state/AuthContext'
import { inject } from '@vercel/analytics'
import { bootstrapNotificationChannel } from './utils/notificationClient'

inject()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWithServices />
  </React.StrictMode>
)

function AppWithServices() {
  useEffect(() => {
    bootstrapNotificationChannel()
  }, [])

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  )
}
