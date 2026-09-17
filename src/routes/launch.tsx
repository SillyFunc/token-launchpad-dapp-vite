import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'

import { getTokenById } from '@/api/token'
import { PageTitle } from '@/components/common/page-title'
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

  return (
    <div className="relative mx-auto flex w-full flex-col pt-6">
      <div className="mb-4">
        <PageTitle
          title={isEditMode ? m.launch_edit_title() : m.launch_create_title()}
        />
      </div>

      {isEditMode && query.isLoading ? (
        <LaunchState loading />
      ) : isEditMode && (query.isError || !query.data) ? (
        <LaunchState />
      ) : (
        <LaunchForm
          key={editId ?? 'create'}
          initialData={isEditMode ? query.data : undefined}
          editId={isEditMode ? editId : null}
        />
      )}
    </div>
  )
}

function LaunchState({ loading = false }: { loading?: boolean }) {
  return (
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
  )
}
