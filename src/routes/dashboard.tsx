import { useBoardList } from '@/hooks/use-board'
import { m } from '@/paraglide/messages.js'
import {  useConnection } from 'wagmi'

export const DashboardPage = () => {
  const {address} = useConnection()
  useBoardList({
    model: 0,
    address,
  })
  return <div>{m.dashboard_page()}</div>
}
