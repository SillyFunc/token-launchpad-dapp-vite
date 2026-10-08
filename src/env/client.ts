import z from 'zod'
import { createEnv } from '@t3-oss/env-core'

export const env = createEnv({
  clientPrefix: 'VITE_',
  server: {},
  client: {
    VITE_APP_API_BASE_URL: z.url(),
    VITE_APP_WALLETCONNECT_PROJECT_ID: z.string(),
  },
  runtimeEnv: import.meta.env,
})
