import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'

import { getTokenById } from '@/api/token'
import BackArrow from '@/assets/svgs/back-arrow.svg'
import { LaunchForm } from '@/components/launch/launch-form'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { m } from '@/paraglide/messages.js'

export const LaunchPage = () => {
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')
  const isEditMode = Boolean(editId)

  const query = useQuery({
    queryKey: ['tokenDetail', editId],
    queryFn: ({ signal }) => getTokenById(editId!, signal),
    enabled: isEditMode,
  })

  if (isEditMode && query.isLoading) {
    return <LaunchState loading />
  }

  if (isEditMode && (query.isError || !query.data)) {
    return <LaunchState />
  }

  return <LaunchForm initialData={query.data} editId={editId} />
}

function LaunchState({ loading = false }: { loading?: boolean }) {
  return (
    <div className="relative mx-auto flex w-full flex-col pb-28 pt-6">
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/"
          aria-label="返回"
          className="flex size-6 shrink-0 items-center justify-center rounded-xs hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FE810B]"
        >
          <img
            src={BackArrow}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
          />
        </Link>
        <span className="text-lg font-semibold tracking-wide text-white">
          {m.launch_edit_title()}
        </span>
      </div>
      <Empty className="rounded border border-[#484b51] bg-[#131516] p-8">
        <EmptyHeader>
          {loading && <Spinner className="size-8 text-[#FFA546]" />}
          <EmptyTitle className="text-base font-semibold text-white">
            {loading ? m.launch_loading() : m.launch_load_error_title()}
          </EmptyTitle>
          {!loading && (
            <EmptyDescription className="max-w-sm text-xs text-neutral-400">
              {m.launch_load_error_description()}
            </EmptyDescription>
          )}
        </EmptyHeader>
        {!loading && (
          <EmptyContent>
            <Link
              to="/dashboard"
              className="rounded-md bg-linear-to-r from-[#FE810B] via-[#FFA546] to-[#FE810B] px-6 py-2 text-sm font-semibold text-white shadow-[0_3px_0_0_#963000]"
            >
              {m.launch_go_dashboard()}
            </Link>
          </EmptyContent>
        )}
      </Empty>
    </div>
  )
}
