import { useQuery } from '@tanstack/react-query';

import { fetchVaultSnapshot, type VaultSnapshot } from '@api';

const VAULT_KEY = ['vault-snapshot'];

export const useVaultSnapshot = () =>
  useQuery<VaultSnapshot>({
    queryKey: VAULT_KEY,
    queryFn: fetchVaultSnapshot,
    staleTime: 1000 * 30,
  });
