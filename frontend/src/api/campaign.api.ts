import apiClient from "./client"
import type { ApiResponse } from "@/types/api.types"
import type { Campaign, CampaignIgAccount, CampaignPage, CreateCampaignPayload, UpdateCampaignPayload } from "./types"

interface RawCampaignPage {
  id: number
  via_account_id: number
  page_id: string
  page_name: string
  is_selected: boolean
  is_active: boolean
}

interface RawIgAccount {
  id: string
  via_account_id: string
  instagram_id: string
  username: string
  is_selected: boolean
  is_active: boolean
}

interface RawCampaign {
  id: number
  name: string
  description: string | null
  schedule_mode: string
  schedule_config: Record<string, unknown>
  sheet_id: string
  sheet_tab_name: string
  rows_per_run: number
  is_active: boolean
  via_account_id: string | null
  next_run_at: string | null
  pages: RawCampaignPage[]
  instagram_accounts: RawIgAccount[]
}

function mapPage(p: RawCampaignPage): CampaignPage {
  return {
    id: p.id,
    viaAccountId: p.via_account_id,
    pageId: p.page_id,
    pageName: p.page_name,
    isSelected: p.is_selected,
    isActive: p.is_active,
  }
}

function mapIgAccount(a: RawIgAccount): CampaignIgAccount {
  return {
    id: a.id,
    viaAccountId: a.via_account_id,
    instagramId: a.instagram_id,
    username: a.username,
    isSelected: a.is_selected,
    isActive: a.is_active,
  }
}

function mapCampaign(c: RawCampaign): Campaign {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    scheduleMode: c.schedule_mode,
    scheduleConfig: c.schedule_config,
    sheetId: c.sheet_id,
    sheetTabName: c.sheet_tab_name,
    rowsPerRun: c.rows_per_run,
    isActive: c.is_active,
    viaAccountId: c.via_account_id ?? null,
    nextRunAt: c.next_run_at,
    pages: (c.pages ?? []).map(mapPage),
    instagramAccounts: (c.instagram_accounts ?? []).map(mapIgAccount),
  }
}

export async function getCampaigns(): Promise<Campaign[]> {
  const { data } = await apiClient.get<ApiResponse<RawCampaign[]>>("/campaigns")
  return (data.data ?? []).map(mapCampaign)
}

export async function createCampaign(payload: CreateCampaignPayload): Promise<Campaign> {
  const { data } = await apiClient.post<ApiResponse<RawCampaign>>("/campaigns", payload)
  return mapCampaign(data.data)
}

export async function updateCampaign(campaignId: number, payload: UpdateCampaignPayload): Promise<Campaign> {
  const { data } = await apiClient.put<ApiResponse<RawCampaign>>(`/campaigns/${campaignId}`, payload)
  return mapCampaign(data.data)
}

export async function deleteCampaign(campaignId: number): Promise<void> {
  await apiClient.delete(`/campaigns/${campaignId}`)
}
