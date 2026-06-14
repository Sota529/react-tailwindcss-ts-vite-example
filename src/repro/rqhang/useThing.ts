import { useQuery } from '@tanstack/react-query'

export const useThing = () =>
  useQuery({
    queryKey: ['thing'],
    queryFn: async () => {
      return 'OK'   // 即 resolve（promise は確実に settle する）
    },
    retry: false
  })
