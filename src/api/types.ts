export interface PageParams {
  pageNo: number
  pageSize: number
}

export interface PageResult<T = unknown> {
  content: T[]
  last: boolean
  first: boolean
  size: number
  number: number
  totalPages: number
  totalElements: number
  numberOfElements: number
  sort: {
    direction: 'DESC' | 'ASC'
    nullHandling: string
    property: string
    ignoreCase: boolean
    ascending: boolean
    descending: boolean
  }[]
}
