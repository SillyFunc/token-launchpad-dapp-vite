import { PageTitle } from '@/components/common/page-title'
import { useBoardList } from '@/hooks/use-board'
import { useConnection } from 'wagmi'

export const DashboardPage = () => {
  const { address } = useConnection()
  useBoardList({
    model: 0,
    address,
  })
  return (
    <div className="flex flex-col pt-6 relative">
      <PageTitle
        title="控制台"
        description="管理您创建的代币，发起预售或修改相关配置"
      />
    </div>
  )
}
