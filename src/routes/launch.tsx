import { m } from '@/paraglide/messages.js'
import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

export const LaunchPage = () => {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id') || searchParams.get('edit')
  const isEditMode = useMemo(() => Boolean(editId), [editId])
  return <div>{m.launch_page()}</div>
}
