import { createHashRouter, redirect } from 'react-router'
import { MainLayout } from '@/layouts/main-layout'
import { BoardPage } from '@/routes/board'
import { LaunchPage } from '@/routes/launch'
import { DashboardPage } from '@/routes/dashboard'
import { PrelaunchPage } from '@/routes/prelaunch'
import { PresalePage } from '@/routes/presale'
import { TokenPage } from '@/routes/token'
import { SubscriptionPage } from '@/routes/subscription'

export const router = createHashRouter([
  {
    path: '/',
    Component: MainLayout,
    children: [
      {
        index: true,
        loader: () => redirect('/board'),
      },
      {
        path: 'board',
        Component: BoardPage,
      },
      {
        path: 'launch',
        Component: LaunchPage,
      },
      {
        path: 'prelaunch',
        Component: PrelaunchPage,
      },
      {
        path: 'dashboard',
        Component: DashboardPage,
      },
      {
        path: 'presale',
        Component: PresalePage,
      },
      {
        path: 'subscription',
        Component: SubscriptionPage,
      },
    ],
  },
  {
    path: '/token/:address',
    Component: TokenPage,
  },
])
