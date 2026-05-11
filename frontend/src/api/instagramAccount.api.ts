import apiClient from "./client"
import type { ApiResponse } from "@/types/api.types"
import type { InstagramAccount } from "./types"

type RawIgAccount = {
  id: string
  via_account_id: string
  instagram_id: string
  username: string
  is_selected: boolean
  is_active: boolean
}

function mapIg(item: RawIgAccount): InstagramAccount {
  return {
    id: item.id,
    viaAccountId: item.via_account_id,
    instagramId: item.instagram_id,
    username: item.username,
    isSelected: item.is_selected,
    isActive: item.is_active,
  }
}

export async function getInstagramAccounts(viaAccountId?: unknown): Promise<InstagramAccount[]> {
  const { data } = await apiClient.get<ApiResponse<RawIgAccount[]>>("/instagram-accounts", {
    params: viaAccountId ? { via_account_id: viaAccountId } : undefined,
  })
  return (data.data ?? []).map(mapIg)
}

export async function saveIgSelection(viaId: unknown, selectedIgIds: unknown[]): Promise<InstagramAccount[]> {
  const { data } = await apiClient.post<ApiResponse<RawIgAccount[]>>(
    `/via-accounts/${viaId}/ig-accounts/selection`,
    { selected_ig_ids: selectedIgIds }
  )
  return (data.data ?? []).map(mapIg)
}
