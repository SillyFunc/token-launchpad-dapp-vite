import { listBoard, type BoardListParams } from '@/api/board'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

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

const POPULAR_PAGE_SIZE = 10

export const usePopularTokens = () => {
  return useInfiniteQuery({
    queryKey: boardKeys.popular(),
    queryFn: ({ pageParam, signal }) =>
      listBoard(
        { pageNo: pageParam, pageSize: POPULAR_PAGE_SIZE, model: 1 },
        signal,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const reachedEnd =
        lastPage.last || lastPage.content.length < POPULAR_PAGE_SIZE
      return reachedEnd ? undefined : allPages.length + 1
    },
    staleTime: 30_000,
  })
}
