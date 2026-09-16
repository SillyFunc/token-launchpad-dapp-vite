import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { router } from '@/router/index.ts'
import { Auth } from '@/components/common/auth.tsx'
import { Web3Provider } from '@/providers/web3-provider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Web3Provider>
      <Auth />
      <RouterProvider router={router} />
    </Web3Provider>
  </StrictMode>,
)
