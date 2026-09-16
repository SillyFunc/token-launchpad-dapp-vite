import {
  WagmiProvider,
  createConfig,
  fallback,
  http,
  injected,
  webSocket,
} from 'wagmi'
import { bsc } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { walletConnect } from 'wagmi/connectors'
import { env } from '@/env/client'

const config = createConfig({
  chains: [bsc],
  connectors: [
    injected(),
    walletConnect({
      projectId: env.VITE_APP_WALLETCONNECT_PROJECT_ID,
      showQrModal: false,
    }),
  ],
  transports: {
    [bsc.id]: fallback([
      webSocket('wss://bsc-rpc.publicnode.com'),
      http('https://bsc-rpc.publicnode.com'),
    ]),
  },
})

const queryClient = new QueryClient()

export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider mode="dark" debugMode>
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
