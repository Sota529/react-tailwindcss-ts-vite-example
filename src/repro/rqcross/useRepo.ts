import { useQuery } from '@tanstack/react-query'
import { repo } from './repo'

export const useRepo = () =>
  useQuery({ queryKey: ['repo'], queryFn: () => repo.get(), retry: false })
