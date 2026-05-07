import apiClient from "./client"
import type { ApiResponse } from "@/types/api.types"
import type { Campaign, CampaignPage, CreateCampaignPayload, UpdateCampaignPayload } from "./types"

interface RawCampaignPage {
  id: number
  via_account_id: number
  page_id: string
  page_name: string
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
  next_run_at: string | null
  pages: RawCampaignPage[]
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
    nextRunAt: c.next_run_at,
    pages: (c.pages ?? []).map(mapPage),
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
