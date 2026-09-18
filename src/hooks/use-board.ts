import { listBoard, type BoardListParams } from '@/api/board'
import { useQuery } from '@tanstack/react-query'

export const boardKeys = {
  all: ['board'] as const,
  list: (p: BoardListParams) => [...boardKeys.all, 'list', p] as const,
  popular: () => [...boardKeys.all, 'popular'] as const,
}

export const useBoardList = (
  params: Partial<BoardListParams> = {},
  options: { enabled?: boolean } = {},
) => {
  const query: BoardListParams = { pageNo: 1, pageSize: 10, ...params }
  return useQuery({
    queryKey: boardKeys.list(query),
    queryFn: ({ signal }) => listBoard(query, signal),
    enabled: options.enabled ?? Boolean(query.address),
    staleTime: 30_000,
  })
}

export const usePopularTokens = () => {
  const params: BoardListParams = { pageNo: 1, pageSize: 10, model: 1 }
  return useQuery({
    queryKey: boardKeys.popular(),
    queryFn: ({ signal }) => listBoard(params, signal),
    staleTime: 30_000,
  })
}