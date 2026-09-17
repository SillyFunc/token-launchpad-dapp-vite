import { listBoard, type BoardListParams } from '@/api/board'
import { useQuery } from '@tanstack/react-query'

export const boardKeys = {
  all: ['board'] as const,
  list: (p: BoardListParams) => [...boardKeys.all, 'list', p] as const,
}

export const useBoardList = (params: Partial<BoardListParams> = {}) => {
  const query: BoardListParams = { pageNo: 1, pageSize: 10, ...params }
  return useQuery({
    queryKey: boardKeys.list(query),
    queryFn: ({ signal }) => listBoard(query, signal),
  })
}
