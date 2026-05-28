import React, { useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"

import { getViaAccounts, fetchPagesFromFacebook } from "@/api/viaAccount.api"
import {
  getInstagramAccounts,
  saveIgSelection,
  createInstagramAccount,
  patchIgAccount,
} from "@/api/instagramAccount.api"
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign } from "@/api/campaign.api"
import type { Campaign } from "@/api/types"

// ─── Types ────────────────────────────────────────────────────────────────────

type ScheduleMode = "daily_fixed_time" | "window_interval" | "flexible_make_like"

const SCHEDULE_MODES: { value: ScheduleMode; title: string; desc: string }[] = [
  { value: "daily_fixed_time", title: "Giờ cố định", desc: "Đăng vào các khung giờ cụ thể mỗi ngày" },
  { value: "window_interval", title: "Cửa sổ lặp", desc: "Lặp mỗi N giờ trong khung thời gian cho phép" },
  { value: "flexible_make_like", title: "Linh hoạt", desc: "Phân tán ngẫu nhiên, tối đa N lần mỗi ngày" },
]

const SCHEDULE_MODE_LABEL: Record<string, string> = {
  daily_fixed_time: "Giờ cố định",
  window_interval: "Cửa sổ lặp",
  flexible_make_like: "Linh hoạt",
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const addIgSchema = z.object({
  instagram_id: z.string().min(1, "Instagram ID không được để trống"),
  username: z.string().min(1, "Username không được để trống"),
  access_token: z.string().min(10, "Access token không hợp lệ"),
  via_account_id: z.string().optional(),
})
type AddIgForm = z.infer<typeof addIgSchema>

const campaignSchema = z.object({
  name: z.string().min(2, "Tên campaign phải có ít nhất 2 ký tự"),
  sheet_id: z.string().min(3, "Google Sheet ID không hợp lệ"),
  sheet_tab_name: z.string().min(1),
  rows_per_run: z.number().min(1).max(100),
  times: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  interval_hours: z.number().min(1).max(24).optional(),
  max_per_day: z.number().min(1).max(50).optional(),
})
type CampaignForm = z.infer<typeof campaignSchema>

// ─── Component ────────────────────────────────────────────────────────────────

export function IgDashboard() {
  const queryClient = useQueryClient()

  const [selectedViaId, setSelectedViaId] = useState<string | null>(null)
  const [igSelection, setIgSelection] = useState<Set<string>>(new Set())
  const [igSelectionDirty, setIgSelectionDirty] = useState(false)
  const [showAddIg, setShowAddIg] = useState(false)

  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("daily_fixed_time")
  const [showAddCampaign, setShowAddCampaign] = useState(false)
  const [campaignViaId, setCampaignViaId] = useState<string | null>(null)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [confirmDeleteCampaignId, setConfirmDeleteCampaignId] = useState<number | null>(null)

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: viaAccounts = [] } = useQuery({
    queryKey: ["via-accounts"],
    queryFn: getViaAccounts,
  })

  const { data: igAccounts = [], isLoading: igLoading } = useQuery({
    queryKey: ["instagram-accounts", selectedViaId],
    queryFn: () => getInstagramAccounts(selectedViaId),
    enabled: selectedViaId !== null,
  })

  // Standalone IG accounts (no via_account_id)
  const { data: allIgAccounts = [] } = useQuery({
    queryKey: ["instagram-accounts-all"],
    queryFn: () => getInstagramAccounts(),
  })
  const standaloneAccounts = allIgAccounts.filter((a) => !a.viaAccountId)

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: getCampaigns,
  })

  const { data: campaignIgAccounts = [] } = useQuery({
    queryKey: ["instagram-accounts", campaignViaId],
    queryFn: () => getInstagramAccounts(campaignViaId),
    enabled: campaignViaId !== null,
  })

  useEffect(() => {
    setIgSelection(new Set(igAccounts.filter((a) => a.isSelected).map((a) => a.id)))
    setIgSelectionDirty(false)
  }, [igAccounts])

  // ─── Mutations ────────────────────────────────────────────────────────────

  const addIgForm = useForm<AddIgForm>({
    resolver: zodResolver(addIgSchema),
    defaultValues: { instagram_id: "", username: "", access_token: "", via_account_id: "" },
  })

  const addIgMutation = useMutation({
    mutationFn: createInstagramAccount,
    onSuccess: (acc) => {
      queryClient.invalidateQueries({ queryKey: ["instagram-accounts-all"] })
      if (acc.viaAccountId) {
        queryClient.invalidateQueries({ queryKey: ["instagram-accounts", acc.viaAccountId] })
      }
      toast.success(`Đã thêm @${acc.username}`)
      addIgForm.reset()
      setShowAddIg(false)
    },
    onError: () => toast.error("Không thêm được IG account"),
  })

  const toggleStandaloneMutation = useMutation({
    mutationFn: ({ id, isSelected }: { id: string; isSelected: boolean }) =>
      patchIgAccount(id, { is_selected: isSelected }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram-accounts-all"] })
    },
    onError: () => toast.error("Không cập nhật được"),
  })

  const syncIgMutation = useMutation({
    mutationFn: (viaId: string) => fetchPagesFromFacebook(viaId as unknown as number),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instagram-accounts", selectedViaId] })
      toast.success("Đã đồng bộ Instagram accounts từ Facebook")
    },
    onError: () => toast.error("Không đồng bộ được IG accounts"),
  })

  const saveIgSelectionMutation = useMutation({
    mutationFn: ({ viaId, ids }: { viaId: string; ids: string[] }) => saveIgSelection(viaId, ids),
    onSuccess: (updated) => {
      queryClient.setQueryData(["instagram-accounts", selectedViaId], updated)
      setIgSelectionDirty(false)
      toast.success("Đã lưu tùy chọn Instagram")
    },
    onError: () => toast.error("Không lưu được tùy chọn Instagram"),
  })

  const campaignForm = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      sheet_id: "",
      sheet_tab_name: "Sheet1",
      rows_per_run: 5,
      times: "08:00,13:00,20:00",
      start_time: "09:00",
      end_time: "18:00",
      interval_hours: 2,
      max_per_day: 5,
    },
  })

  const addCampaignMutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: (c) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      toast.success(`Campaign "${c.name}" đã được tạo`)
      campaignForm.reset()
      setCampaignViaId(null)
      setShowAddCampaign(false)
    },
    onError: () => toast.error("Không tạo được campaign"),
  })

  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateCampaign>[1] }) =>
      updateCampaign(id, payload),
    onSuccess: (c) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      toast.success(`Campaign "${c.name}" đã được cập nhật`)
      setEditingCampaign(null)
    },
    onError: () => toast.error("Không cập nhật được campaign"),
  })

  const deleteCampaignMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      toast.success("Đã xóa campaign")
      setConfirmDeleteCampaignId(null)
    },
    onError: () => toast.error("Không xóa được campaign"),
  })

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const toggleIg = (id: string) => {
    setIgSelection((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setIgSelectionDirty(true)
  }

  const handleSaveIgSelection = () => {
    if (!selectedViaId) return
    saveIgSelectionMutation.mutate({ viaId: String(selectedViaId), ids: Array.from(igSelection) })
  }

  const onSubmitCampaign: import("react-hook-form").SubmitHandler<CampaignForm> = (data) => {
    let schedule_config: Record<string, unknown> = {}
    if (scheduleMode === "daily_fixed_time") {
      schedule_config = {
        times: (data.times ?? "").split(",").map((t) => t.trim()).filter(Boolean),
      }
    } else if (scheduleMode === "window_interval") {
      schedule_config = { start_time: data.start_time, end_time: data.end_time, interval_hours: data.interval_hours }
    } else {
      schedule_config = { max_per_day: data.max_per_day }
    }

    addCampaignMutation.mutate({
      name: data.name,
      schedule_mode: scheduleMode,
      schedule_config,
      sheet_id: data.sheet_id,
      sheet_tab_name: data.sheet_tab_name,
      rows_per_run: data.rows_per_run,
      via_account_id: campaignViaId ? String(campaignViaId) : null,
      instagram_account_ids: availableCampaignIgAccounts.map((a) => a.id),
    })
  }

  const selectedVia = viaAccounts.find((v) => String(v.id) === selectedViaId)
  const availableCampaignIgAccounts = campaignIgAccounts.filter((a) => a.isSelected)
  const igCampaigns = campaigns.filter((c) => c.instagramAccounts.length > 0)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="ops-grid">

        {/* ── IG Accounts panel ── */}
        <section className="glass-card panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Tài khoản Instagram</p>
              <h2>IG Accounts</h2>
            </div>
            {selectedViaId && (
              <div className="section-head-actions">
                {igSelectionDirty && (
                  <button
                    className="primary-button"
                    onClick={handleSaveIgSelection}
                    disabled={saveIgSelectionMutation.isPending}
                  >
                    {saveIgSelectionMutation.isPending ? "Đang lưu..." : `Lưu (${igSelection.size})`}
                  </button>
                )}
                <button
                  className="secondary-button"
                  onClick={() => selectedViaId && syncIgMutation.mutate(selectedViaId)}
                  disabled={syncIgMutation.isPending}
                >
                  {syncIgMutation.isPending ? "Đang sync..." : "Sync IG"}
                </button>
              </div>
            )}
          </div>

          {/* Via selector */}
          <div className="field" style={{ marginBottom: 16 }}>
            <span>Chọn Via Account</span>
            <select
              value={selectedViaId ? String(selectedViaId) : ""}
              onChange={(e) => setSelectedViaId(e.target.value || null)}
            >
              <option value="">-- Chọn via --</option>
              {viaAccounts.map((v) => (
                <option key={v.id} value={v.id}>{v.displayName}</option>
              ))}
            </select>
          </div>

          {!selectedViaId ? (
            <p className="empty-hint">Chọn Via Account để xem Instagram accounts.</p>
          ) : igLoading ? (
            <p className="empty-hint">Đang tải IG accounts...</p>
          ) : igAccounts.length === 0 ? (
            <div className="pages-empty-state">
              <p className="subtle">Via này chưa có IG account nào.</p>
              <p className="subtle" style={{ fontSize: 12, marginTop: 8 }}>
                Nhấn "Sync IG" hoặc "Load Pages" trên tab Facebook để đồng bộ.
              </p>
              <button
                className="primary-button"
                style={{ marginTop: 12 }}
                onClick={() => selectedViaId && syncIgMutation.mutate(selectedViaId)}
                disabled={syncIgMutation.isPending}
              >
                {syncIgMutation.isPending ? "Đang sync..." : "Sync IG Accounts"}
              </button>
            </div>
          ) : (
            <>
              <div className="pages-toolbar">
                <span className="subtle" style={{ fontSize: 13 }}>
                  {igSelection.size}/{igAccounts.length} account được chọn để đăng
                </span>
                {selectedVia && (
                  <span className="chip" style={{ fontSize: 12 }}>via: {selectedVia.displayName}</span>
                )}
              </div>

              <div className="list">
                {igAccounts.map((acc) => (
                  <label key={acc.id} className="row-card page-row-label">
                    <input
                      type="checkbox"
                      className="page-checkbox"
                      checked={igSelection.has(acc.id)}
                      onChange={() => toggleIg(acc.id)}
                    />
                    <div className="page-row-info">
                      <h3>@{acc.username}</h3>
                      <p>ID: {acc.instagramId}</p>
                    </div>
                    <span className={`status-chip ${acc.isActive ? "success" : "danger"}`}>
                      {acc.isActive ? "Active" : "Inactive"}
                    </span>
                  </label>
                ))}
              </div>

              {igSelectionDirty && (
                <div className="pages-save-bar">
                  <span className="subtle" style={{ fontSize: 13 }}>Có thay đổi chưa lưu</span>
                  <button
                    className="primary-button"
                    onClick={handleSaveIgSelection}
                    disabled={saveIgSelectionMutation.isPending}
                  >
                    {saveIgSelectionMutation.isPending
                      ? "Đang lưu..."
                      : `Lưu tùy chọn (${igSelection.size} account)`}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── IG Campaigns ── */}
        <section className="glass-card panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Lên lịch tự động · Instagram</p>
              <h2>IG Campaigns</h2>
            </div>
            <button
              className={showAddCampaign ? "secondary-button" : "primary-button ig-button"}
              onClick={() => {
                setShowAddCampaign((v) => !v)
                if (showAddCampaign) setCampaignViaId(null)
              }}
            >
              {showAddCampaign ? "Huỷ" : "+ Tạo IG Campaign"}
            </button>
          </div>

          {showAddCampaign && (
            <form className="add-form campaign-form ig-campaign-form" onSubmit={campaignForm.handleSubmit(onSubmitCampaign)} noValidate>
              <label className="field">
                <span>Tên Campaign</span>
                <input {...campaignForm.register("name")} placeholder="IG Morning Campaign" autoFocus />
                {campaignForm.formState.errors.name && (
                  <small className="field-error">{campaignForm.formState.errors.name.message}</small>
                )}
              </label>

              <div>
                <p className="field-label">Kiểu lịch đăng bài</p>
                <div className="mode-grid">
                  {SCHEDULE_MODES.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      className={`mode-card${scheduleMode === m.value ? " active" : ""}`}
                      onClick={() => setScheduleMode(m.value)}
                    >
                      <strong>{m.title}</strong>
                      <span>{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {scheduleMode === "daily_fixed_time" && (
                <label className="field">
                  <span>Khung giờ đăng (phân cách bằng dấu phẩy)</span>
                  <input {...campaignForm.register("times")} placeholder="08:00,13:00,20:00" />
                  <small className="subtle">Ví dụ: 08:00,13:00,20:00 → đăng 3 lần/ngày</small>
                </label>
              )}

              {scheduleMode === "window_interval" && (
                <div className="form-row">
                  <label className="field">
                    <span>Từ giờ</span>
                    <input {...campaignForm.register("start_time")} type="time" />
                  </label>
                  <label className="field">
                    <span>Đến giờ</span>
                    <input {...campaignForm.register("end_time")} type="time" />
                  </label>
                  <label className="field">
                    <span>Lặp mỗi (giờ)</span>
                    <input
                      {...campaignForm.register("interval_hours", { valueAsNumber: true })}
                      type="number" min={1} max={24} placeholder="2"
                    />
                  </label>
                </div>
              )}

              {scheduleMode === "flexible_make_like" && (
                <label className="field">
                  <span>Tối đa lần đăng mỗi ngày</span>
                  <input
                    {...campaignForm.register("max_per_day", { valueAsNumber: true })}
                    type="number" min={1} max={50} placeholder="5"
                  />
                </label>
              )}

              <div className="form-row">
                <label className="field" style={{ flex: 2 }}>
                  <span>Google Sheet ID</span>
                  <input
                    {...campaignForm.register("sheet_id")}
                    placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  />
                  {campaignForm.formState.errors.sheet_id && (
                    <small className="field-error">{campaignForm.formState.errors.sheet_id.message}</small>
                  )}
                </label>
                <label className="field">
                  <span>Tab name</span>
                  <input {...campaignForm.register("sheet_tab_name")} placeholder="Sheet1" />
                </label>
                <label className="field">
                  <span>Rows/lần chạy</span>
                  <input
                    {...campaignForm.register("rows_per_run", { valueAsNumber: true })}
                    type="number" min={1} max={100}
                  />
                </label>
              </div>

              {/* Via + IG Accounts selector */}
              <div className="campaign-via-section">
                <label className="field">
                  <span>Via Account đăng bài</span>
                  <select
                    value={campaignViaId ? String(campaignViaId) : ""}
                    onChange={(e) => setCampaignViaId(e.target.value || null)}
                  >
                    <option value="">-- Chọn via --</option>
                    {viaAccounts.map((v) => (
                      <option key={v.id} value={v.id}>{v.displayName}</option>
                    ))}
                  </select>
                </label>

                {campaignViaId && (
                  <div className="campaign-pages-section">
                    <span className="field-label">
                      Instagram Accounts ({availableCampaignIgAccounts.length})
                    </span>
                    {availableCampaignIgAccounts.length === 0 ? (
                      <p className="subtle" style={{ fontSize: 13, marginTop: 8 }}>
                        Via này chưa có IG account nào được chọn. Hãy tick accounts ở panel bên trái trước.
                      </p>
                    ) : (
                      <div className="campaign-pages-list">
                        {availableCampaignIgAccounts.map((acc) => (
                          <div key={acc.id} className="campaign-page-item">
                            <span className="status-chip ig-chip" style={{ fontSize: 11 }}>IG</span>
                            <span>@{acc.username}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button className="primary-button ig-button" type="submit" disabled={addCampaignMutation.isPending}>
                  {addCampaignMutation.isPending ? "Đang tạo..." : "Tạo IG Campaign"}
                </button>
              </div>
            </form>
          )}

          {igCampaigns.length > 0 ? (
            <div className="list" style={{ marginTop: showAddCampaign ? 20 : 0 }}>
              {igCampaigns.map((c) => (
                <article key={c.id} className="row-card">
                  {editingCampaign?.id === c.id ? (
                    <IgCampaignEditForm
                      campaign={c}
                      onSave={(payload) => updateCampaignMutation.mutate({ id: c.id, payload })}
                      onCancel={() => setEditingCampaign(null)}
                      isPending={updateCampaignMutation.isPending}
                      viaAccounts={viaAccounts}
                    />
                  ) : (
                    <>
                      <div className="row-card-header">
                        <div>
                          <h3>{c.name}</h3>
                          <p>
                            {SCHEDULE_MODE_LABEL[c.scheduleMode] ?? c.scheduleMode}
                            {" · "}Sheet: {c.sheetId.length > 20 ? c.sheetId.slice(0, 20) + "…" : c.sheetId}
                            {" · "}{c.rowsPerRun} rows/lần
                          </p>
                        </div>
                        <div className="row-card-actions">
                          <span className={`status-chip ${c.isActive ? "success" : "danger"}`}>
                            {c.isActive ? "Active" : "Inactive"}
                          </span>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditingCampaign(c)}
                          >
                            Sửa
                          </button>
                          {confirmDeleteCampaignId === c.id ? (
                            <>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => deleteCampaignMutation.mutate(c.id)}
                                disabled={deleteCampaignMutation.isPending}
                              >
                                {deleteCampaignMutation.isPending ? "Đang xóa..." : "Xác nhận xóa"}
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setConfirmDeleteCampaignId(null)}
                                disabled={deleteCampaignMutation.isPending}
                              >
                                Hủy
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setConfirmDeleteCampaignId(c.id)}
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>
                      {c.instagramAccounts.length > 0 && (
                        <div className="tag-list">
                          {c.instagramAccounts.map((a) => (
                            <span key={a.id} className="chip ig-chip-tag">@{a.username}</span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </article>
              ))}
            </div>
          ) : (
            !showAddCampaign && (
              <p className="empty-hint">
                Chưa có IG campaign nào. Chọn accounts ở bên trái rồi nhấn "+ Tạo IG Campaign".
              </p>
            )
          )}
        </section>
      </div>
    </>
  )
}

// ─── IG Campaign Edit Form ─────────────────────────────────────────────────────

const SCHEDULE_MODES_EDIT = [
  { value: "daily_fixed_time", title: "Giờ cố định" },
  { value: "window_interval", title: "Cửa sổ lặp" },
  { value: "flexible_make_like", title: "Linh hoạt" },
]

function IgCampaignEditForm({
  campaign,
  onSave,
  onCancel,
  isPending,
  viaAccounts,
}: {
  campaign: Campaign
  onSave: (payload: Parameters<typeof updateCampaign>[1]) => void
  onCancel: () => void
  isPending: boolean
  viaAccounts: import("@/api/types").ViaAccount[]
}) {
  const initialViaId: string | null = campaign.viaAccountId ?? null

  const [name, setName] = useState(campaign.name)
  const [sheetId, setSheetId] = useState(campaign.sheetId)
  const [sheetTabName, setSheetTabName] = useState(campaign.sheetTabName)
  const [rowsPerRun, setRowsPerRun] = useState(campaign.rowsPerRun)
  const [isActive, setIsActive] = useState(campaign.isActive)
  const [scheduleMode, setScheduleMode] = useState(campaign.scheduleMode)
  const [times, setTimes] = useState<string>(
    (campaign.scheduleConfig.times as string[] | undefined)?.join(",") ?? ""
  )
  const [startTime, setStartTime] = useState<string>(
    (campaign.scheduleConfig.start_time as string | undefined) ?? "09:00"
  )
  const [endTime, setEndTime] = useState<string>(
    (campaign.scheduleConfig.end_time as string | undefined) ?? "18:00"
  )
  const [intervalHours, setIntervalHours] = useState<number>(
    (campaign.scheduleConfig.interval_hours as number | undefined) ?? 2
  )
  const [maxPerDay, setMaxPerDay] = useState<number>(
    (campaign.scheduleConfig.max_per_day as number | undefined) ?? 5
  )
  const [viaId, setViaId] = useState<string | null>(initialViaId)

  const { data: viaIgAccounts = [] } = useQuery({
    queryKey: ["instagram-accounts", viaId],
    queryFn: () => getInstagramAccounts(viaId),
    enabled: viaId !== null,
  })
  const selectedIgAccounts = viaIgAccounts.filter((a) => a.isSelected)

  const buildScheduleConfig = (): Record<string, unknown> => {
    if (scheduleMode === "daily_fixed_time")
      return { times: times.split(",").map((t) => t.trim()).filter(Boolean) }
    if (scheduleMode === "window_interval")
      return { start_time: startTime, end_time: endTime, interval_hours: intervalHours }
    return { max_per_day: maxPerDay }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name,
      sheet_id: sheetId,
      sheet_tab_name: sheetTabName,
      rows_per_run: rowsPerRun,
      is_active: isActive,
      schedule_mode: scheduleMode,
      schedule_config: buildScheduleConfig(),
      via_account_id: viaId,
      instagram_account_ids: selectedIgAccounts.map((a) => a.id),
    })
  }

  return (
    <form className="add-form" onSubmit={handleSubmit} noValidate>
      <p className="eyebrow" style={{ margin: 0 }}>Chỉnh sửa IG campaign</p>

      <label className="field">
        <span>Tên Campaign</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>

      <div>
        <p className="field-label">Kiểu lịch đăng bài</p>
        <div className="mode-grid">
          {SCHEDULE_MODES_EDIT.map((m) => (
            <button
              key={m.value}
              type="button"
              className={`mode-card${scheduleMode === m.value ? " active" : ""}`}
              onClick={() => setScheduleMode(m.value)}
            >
              <strong>{m.title}</strong>
            </button>
          ))}
        </div>
      </div>

      {scheduleMode === "daily_fixed_time" && (
        <label className="field">
          <span>Khung giờ đăng (phân cách bằng dấu phẩy)</span>
          <input value={times} onChange={(e) => setTimes(e.target.value)} placeholder="08:00,13:00,20:00" />
        </label>
      )}
      {scheduleMode === "window_interval" && (
        <div className="form-row">
          <label className="field">
            <span>Từ giờ</span>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label className="field">
            <span>Đến giờ</span>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
          <label className="field">
            <span>Lặp mỗi (giờ)</span>
            <input
              type="number" min={1} max={24}
              value={intervalHours}
              onChange={(e) => setIntervalHours(Number(e.target.value))}
            />
          </label>
        </div>
      )}
      {scheduleMode === "flexible_make_like" && (
        <label className="field">
          <span>Tối đa lần đăng mỗi ngày</span>
          <input
            type="number" min={1} max={50}
            value={maxPerDay}
            onChange={(e) => setMaxPerDay(Number(e.target.value))}
          />
        </label>
      )}

      <div className="form-row">
        <label className="field" style={{ flex: 2 }}>
          <span>Google Sheet ID</span>
          <input value={sheetId} onChange={(e) => setSheetId(e.target.value)} required />
        </label>
        <label className="field">
          <span>Tab name</span>
          <input value={sheetTabName} onChange={(e) => setSheetTabName(e.target.value)} />
        </label>
        <label className="field">
          <span>Rows/lần chạy</span>
          <input
            type="number" min={1} max={100}
            value={rowsPerRun}
            onChange={(e) => setRowsPerRun(Number(e.target.value))}
          />
        </label>
      </div>

      <label className="field">
        <span>Via Account đăng bài</span>
        <select
          value={viaId ?? ""}
          onChange={(e) => setViaId(e.target.value || null)}
        >
          <option value="">-- Chọn via --</option>
          {viaAccounts.map((v) => (
            <option key={v.id} value={v.id}>{v.displayName}</option>
          ))}
        </select>
      </label>
      {viaId && (
        <div className="campaign-pages-section">
          <span className="field-label">Instagram Accounts ({selectedIgAccounts.length})</span>
          {selectedIgAccounts.length === 0 ? (
            <p className="subtle" style={{ fontSize: 13, marginTop: 8 }}>
              Via này chưa có IG account nào được chọn.
            </p>
          ) : (
            <div className="campaign-pages-list">
              {selectedIgAccounts.map((a) => (
                <div key={a.id} className="campaign-page-item">
                  <span className="status-chip ig-chip" style={{ fontSize: 11 }}>IG</span>
                  <span>@{a.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
        <span>Kích hoạt campaign</span>
      </label>

      <div className="form-actions">
        <button className="primary-button ig-button" type="submit" disabled={isPending}>
          {isPending ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
        <button className="secondary-button" type="button" onClick={onCancel} disabled={isPending}>
          Hủy
        </button>
      </div>
    </form>
  )
}
