import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  listSubscription,
  type SubscriptionListParams,
} from '@/api/subscription'

export const subscriptionKeys = {
  all: ['subscription'] as const,
  list: (params: SubscriptionListParams) =>
    [...subscriptionKeys.all, 'list', params] as const,
}

export function useSubscriptionList(params: SubscriptionListParams) {
  return useQuery({
    queryKey: subscriptionKeys.list(params),
    queryFn: ({ signal }) => listSubscription(params, signal),
    enabled: Boolean(params.address || params.presaleAddress),
    placeholderData: keepPreviousData,
  })
}
