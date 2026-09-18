import {
  WagmiProvider,
  createConfig,
  fallback,
  http,
  injected,
  webSocket,
} from 'wagmi'
import { bsc } from 'wagmi/chains'
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { walletConnect } from 'wagmi/connectors'
import { Toaster } from '@/components/ui/toast'
import { env } from '@/env/client'
import { ApiError } from '@/lib/http/error'
import { DEFAULT_RPC_HTTP, DEFAULT_RPC_WS } from '@/lib/web3'
import { toast } from '@/lib/toast'
import { m } from '@/paraglide/messages.js'

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
      webSocket(env.VITE_APP_RPC_WS_URL ?? DEFAULT_RPC_WS),
      http(env.VITE_APP_RPC_URL ?? DEFAULT_RPC_HTTP),
    ]),
  },
})

function showApiError(error: Error) {
  if (!(error instanceof ApiError)) return

  toast.error(m.request_failed(), error.message)
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: showApiError }),
  mutationCache: new MutationCache({ onError: showApiError }),
})

export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider mode="dark" debugMode>
          <Toaster>{children}</Toaster>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
