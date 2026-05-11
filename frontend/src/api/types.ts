export interface ViaAccount {
  id: number
  displayName: string
  tokenExpiresAt: string | null
  isActive: boolean
}

export interface FacebookPage {
  id: number
  viaAccountId: number
  pageId: string
  pageName: string
  isSelected: boolean
  isActive: boolean
}

export interface CreateViaAccountPayload {
  display_name: string
  access_token: string
  token_expires_at?: string | null
}

export interface CreateFacebookPagePayload {
  via_account_id: number
  page_id: string
  page_name: string
  page_access_token: string
  is_selected?: boolean
  is_active?: boolean
}

export interface CampaignPage {
  id: number
  viaAccountId: number
  pageId: string
  pageName: string
  isSelected: boolean
  isActive: boolean
}

export interface Campaign {
  id: number
  name: string
  description: string | null
  scheduleMode: string
  scheduleConfig: Record<string, unknown>
  sheetId: string
  sheetTabName: string
  rowsPerRun: number
  isActive: boolean
  viaAccountId: string | null
  nextRunAt: string | null
  pages: CampaignPage[]
}

export interface CreateCampaignPayload {
  name: string
  description?: string | null
  schedule_mode: string
  schedule_config: Record<string, unknown>
  sheet_id: string
  sheet_tab_name?: string
  rows_per_run?: number
  via_account_id?: string | null
  page_ids?: number[]
}

export interface UpdateCampaignPayload {
  name?: string
  description?: string | null
  schedule_mode?: string
  schedule_config?: Record<string, unknown>
  sheet_id?: string
  sheet_tab_name?: string
  rows_per_run?: number
  is_active?: boolean
  via_account_id?: string | null
  page_ids?: number[]
}
