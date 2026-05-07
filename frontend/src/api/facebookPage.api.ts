import apiClient from "./client"
import type { ApiResponse } from "@/types/api.types"
import type { CreateFacebookPagePayload, FacebookPage } from "./types"

export async function getFacebookPages(viaAccountId?: number): Promise<FacebookPage[]> {
  const { data } = await apiClient.get<ApiResponse<Array<{ id: number; via_account_id: number; page_id: string; page_name: string; is_selected: boolean; is_active: boolean }>>>(
    "/facebook-pages",
    { params: viaAccountId ? { via_account_id: viaAccountId } : undefined }
  )

  return (data.data ?? []).map((item) => ({
    id: item.id,
    viaAccountId: item.via_account_id,
    pageId: item.page_id,
    pageName: item.page_name,
    isSelected: item.is_selected,
    isActive: item.is_active,
  }))
}

export async function createFacebookPage(payload: CreateFacebookPagePayload): Promise<FacebookPage> {
  const { data } = await apiClient.post<ApiResponse<{ id: number; via_account_id: number; page_id: string; page_name: string; is_selected: boolean; is_active: boolean }>>(
    "/facebook-pages",
    payload
  )

  return {
    id: data.data.id,
    viaAccountId: data.data.via_account_id,
    pageId: data.data.page_id,
    pageName: data.data.page_name,
    isSelected: data.data.is_selected,
    isActive: data.data.is_active,
  }
}
