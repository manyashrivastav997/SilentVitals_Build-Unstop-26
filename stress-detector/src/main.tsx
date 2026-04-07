import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UserProvider } from './contexts/UserContext'
import { seedMockDataIfNeeded } from './db/indexedDb'

void seedMockDataIfNeeded().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <UserProvider>
        <App />
      </UserProvider>
    </StrictMode>,
  )
})
