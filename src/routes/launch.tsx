import { getTokenById } from '@/api/token'
import { EditForm } from '@/components/launch/edit-form'
import { LaunchForm } from '@/components/launch/launch-form'
import { Spinner } from '@/components/ui/spinner'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

export const LaunchPage = () => {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')
  const isEditMode = useMemo(() => Boolean(editId), [editId])

  const query = useQuery({
    queryKey: ['tokenDetail', editId],
    queryFn: ({ signal }) => getTokenById(editId, signal),
    enabled: Boolean(editId),
  })

  if (query.isPending) {
    return (
      <div className="fixed inset-0 z-10 flex items-center justify-center">
        <Spinner className="size-8 text-[#FFA546]" />
      </div>
    )
  }

  if (isEditMode) {
    return <EditForm />
  } else {
    return <LaunchForm />
  }
}
