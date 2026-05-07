import apiClient from "./client"
import type { ApiResponse } from "@/types/api.types"
import type { CreateViaAccountPayload, FacebookPage, ViaAccount } from "./types"

type RawVia = { id: number; display_name: string; token_expires_at: string | null; is_active: boolean }
type RawPage = { id: number; via_account_id: number; page_id: string; page_name: string; is_selected: boolean; is_active: boolean }

function mapVia(item: RawVia): ViaAccount {
  return {
    id: item.id,
    displayName: item.display_name,
    tokenExpiresAt: item.token_expires_at,
    isActive: item.is_active,
  }
}

function mapPage(item: RawPage): FacebookPage {
  return {
    id: item.id,
    viaAccountId: item.via_account_id,
    pageId: item.page_id,
    pageName: item.page_name,
    isSelected: item.is_selected,
    isActive: item.is_active,
  }
}

export async function getViaAccounts(): Promise<ViaAccount[]> {
  const { data } = await apiClient.get<ApiResponse<RawVia[]>>("/via-accounts")
  return (data.data ?? []).map(mapVia)
}

export async function createViaAccount(payload: CreateViaAccountPayload): Promise<ViaAccount> {
  const { data } = await apiClient.post<ApiResponse<RawVia>>("/via-accounts", payload)
  return mapVia(data.data)
}

export async function fetchPagesFromFacebook(viaId: number): Promise<FacebookPage[]> {
  const { data } = await apiClient.post<ApiResponse<RawPage[]>>(`/via-accounts/${viaId}/fetch-pages`)
  return (data.data ?? []).map(mapPage)
}

export async function deleteViaAccount(viaId: number): Promise<void> {
  await apiClient.delete(`/via-accounts/${viaId}`)
}

export async function savePageSelection(viaId: number, selectedPageIds: number[]): Promise<FacebookPage[]> {
  const { data } = await apiClient.post<ApiResponse<RawPage[]>>(
    `/via-accounts/${viaId}/pages/selection`,
    { selected_page_ids: selectedPageIds }
  )
  return (data.data ?? []).map(mapPage)
}
