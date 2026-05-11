import React, { useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import axios from "axios"

import { getViaAccounts, createViaAccount, fetchPagesFromFacebook, savePageSelection, deleteViaAccount } from "@/api/viaAccount.api"
import { getFacebookPages } from "@/api/facebookPage.api"
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign } from "@/api/campaign.api"
import type { Campaign } from "@/api/types"
import { useAuthStore } from "@/store/auth.store"

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

const addViaSchema = z.object({
  display_name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
  access_token: z.string().min(10, "Access token không hợp lệ"),
  token_expires_at: z.string().optional(),
})
type AddViaForm = z.infer<typeof addViaSchema>

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

export function DashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const [selectedViaId, setSelectedViaId] = useState<number | null>(null)
  const [showAddVia, setShowAddVia] = useState(false)
  const [confirmDeleteViaId, setConfirmDeleteViaId] = useState<number | null>(null)
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("daily_fixed_time")
  const [showAddCampaign, setShowAddCampaign] = useState(false)
  const [campaignViaId, setCampaignViaId] = useState<number | null>(null)
  const [campaignPageSelection, setCampaignPageSelection] = useState<Set<unknown>>(new Set())
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [confirmDeleteCampaignId, setConfirmDeleteCampaignId] = useState<number | null>(null)

  // Page selection for the Pages panel (save is_selected to DB)
  const [pageSelection, setPageSelection] = useState<Set<number>>(new Set())
  const [selectionDirty, setSelectionDirty] = useState(false)

  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: viaAccounts = [] } = useQuery({
    queryKey: ["via-accounts"],
    queryFn: getViaAccounts,
  })

  const { data: pages = [], isLoading: pagesLoading } = useQuery({
    queryKey: ["facebook-pages", selectedViaId],
    queryFn: () => getFacebookPages(selectedViaId ?? undefined),
    enabled: selectedViaId !== null,
  })

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: getCampaigns,
  })

  // Pages for the campaign form (filtered by is_selected=true in that via)
  const { data: campaignViaPages = [] } = useQuery({
    queryKey: ["facebook-pages", campaignViaId],
    queryFn: () => getFacebookPages(campaignViaId!),
    enabled: campaignViaId !== null,
  })

  // Sync Pages-panel local selection when data loads
  useEffect(() => {
    setPageSelection(new Set(pages.filter((p) => p.isSelected).map((p) => p.id)))
    setSelectionDirty(false)
  }, [pages])

  // Init campaign page selection when via pages load (default to all)
  useEffect(() => {
    setCampaignPageSelection(new Set(campaignViaPages.map((p) => p.id)))
  }, [campaignViaPages])

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const viaForm = useForm<AddViaForm>({
    resolver: zodResolver(addViaSchema),
    defaultValues: { display_name: "", access_token: "", token_expires_at: "" },
  })

  const addViaMutation = useMutation({
    mutationFn: createViaAccount,
    onSuccess: (via) => {
      queryClient.invalidateQueries({ queryKey: ["via-accounts"] })
      toast.success(`Đã thêm via "${via.displayName}"`)
      viaForm.reset()
      setShowAddVia(false)
    },
    onError: () => toast.error("Không thêm được via account"),
  })

  const deleteViaMutation = useMutation({
    mutationFn: deleteViaAccount,
    onSuccess: (_, viaId) => {
      queryClient.invalidateQueries({ queryKey: ["via-accounts"] })
      if (selectedViaId === viaId) setSelectedViaId(null)
      setConfirmDeleteViaId(null)
      toast.success("Đã xóa via account")
    },
    onError: () => toast.error("Không xóa được via account"),
  })

  const loadPagesMutation = useMutation({
    mutationFn: fetchPagesFromFacebook,
    onSuccess: (fetched) => {
      queryClient.setQueryData(["facebook-pages", selectedViaId], fetched)
      toast.success(`Đã load ${fetched.length} page từ Facebook`)
    },
    onError: (err: unknown) => {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message
        : null
      toast.error(msg ?? "Không load được pages từ Facebook")
    },
  })

  const saveSelectionMutation = useMutation({
    mutationFn: ({ viaId, ids }: { viaId: number; ids: number[] }) =>
      savePageSelection(viaId, ids),
    onSuccess: (updated) => {
      queryClient.setQueryData(["facebook-pages", selectedViaId], updated)
      setSelectionDirty(false)
      toast.success("Đã lưu tùy chọn page")
    },
    onError: () => toast.error("Không lưu được tùy chọn"),
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
      setCampaignPageSelection(new Set())
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

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const onSubmitVia = (data: AddViaForm) => {
    addViaMutation.mutate({
      display_name: data.display_name,
      access_token: data.access_token,
      token_expires_at: data.token_expires_at || null,
    })
  }

  const handleViaClick = (id: number) => {
    setSelectedViaId((prev) => (prev === id ? null : id))
  }

  const togglePage = (pageId: number) => {
    setPageSelection((prev) => {
      const next = new Set(prev)
      next.has(pageId) ? next.delete(pageId) : next.add(pageId)
      return next
    })
    setSelectionDirty(true)
  }

  const handleSaveSelection = () => {
    if (!selectedViaId) return
    saveSelectionMutation.mutate({ viaId: selectedViaId, ids: Array.from(pageSelection) })
  }

  const handleSelectAll = () => {
    setPageSelection(new Set(pages.map((p) => p.id)))
    setSelectionDirty(true)
  }

  const handleDeselectAll = () => {
    setPageSelection(new Set())
    setSelectionDirty(true)
  }

  const toggleCampaignPage = (pageId: unknown) => {
    setCampaignPageSelection((prev) => {
      const next = new Set(prev)
      next.has(pageId) ? next.delete(pageId) : next.add(pageId)
      return next
    })
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
      via_account_id: campaignViaId?.toString() ?? null,
      page_ids: Array.from(campaignPageSelection) as number[],
    })
  }

  const selectedVia = viaAccounts.find((v) => v.id === selectedViaId)
  const selectedCount = pageSelection.size
  const campaignVia = viaAccounts.find((v) => v.id === campaignViaId)

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page-shell">
      <div className="ops-layout">

        {/* Topbar */}
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">A</div>
            <div>
              <p className="eyebrow">Auto Posting Studio</p>
              <h1 className="ops-title">Quản lý Via & Automation</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <span className="chip">{user?.displayName ?? "User"}</span>
            <button className="secondary-button" onClick={handleLogout}>Đăng xuất</button>
          </div>
        </header>

        {/* Main grid: Via | Pages */}
        <div className="ops-grid">

          {/* ── Via Accounts ── */}
          <section className="glass-card panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Kết nối Facebook</p>
                <h2>Via Accounts</h2>
              </div>
              <div className="section-head-actions">
                {selectedViaId && (
                  <button className="chip ghost" onClick={() => setSelectedViaId(null)}>
                    Bỏ chọn
                  </button>
                )}
                <button
                  className={showAddVia ? "secondary-button" : "primary-button"}
                  onClick={() => setShowAddVia((v) => !v)}
                >
                  {showAddVia ? "Huỷ" : "+ Thêm Via"}
                </button>
              </div>
            </div>

            {showAddVia && (
              <form className="add-form" onSubmit={viaForm.handleSubmit(onSubmitVia)} noValidate>
                <p className="eyebrow" style={{ margin: 0 }}>Thêm via mới</p>
                <label className="field">
                  <span>Tên hiển thị</span>
                  <input {...viaForm.register("display_name")} placeholder="Via Kim Anh" autoFocus />
                  {viaForm.formState.errors.display_name && (
                    <small className="field-error">{viaForm.formState.errors.display_name.message}</small>
                  )}
                </label>
                <label className="field">
                  <span>User Access Token</span>
                  <textarea
                    {...viaForm.register("access_token")}
                    className="token-input"
                    placeholder="EAAxxxxx..."
                    rows={3}
                  />
                  {viaForm.formState.errors.access_token && (
                    <small className="field-error">{viaForm.formState.errors.access_token.message}</small>
                  )}
                </label>
                <label className="field">
                  <span>Token hết hạn (tuỳ chọn)</span>
                  <input {...viaForm.register("token_expires_at")} type="datetime-local" />
                </label>
                <div className="form-actions">
                  <button className="primary-button" type="submit" disabled={addViaMutation.isPending}>
                    {addViaMutation.isPending ? "Đang lưu..." : "Lưu Via"}
                  </button>
                </div>
              </form>
            )}

            <div className="list">
              {viaAccounts.length === 0 ? (
                <p className="empty-hint">Chưa có via account nào. Nhấn "+ Thêm Via" để bắt đầu.</p>
              ) : (
                viaAccounts.map((via) => (
                  <article
                    key={via.id}
                    className={`row-card selectable${selectedViaId === via.id ? " selected" : ""}`}
                    onClick={() => handleViaClick(via.id)}
                  >
                    <div className="row-card-header">
                      <div>
                        <h3>{via.displayName}</h3>
                        <p>
                          {via.tokenExpiresAt
                            ? `Token hết hạn: ${new Date(via.tokenExpiresAt).toLocaleDateString("vi-VN")}`
                            : "Token không giới hạn"}
                        </p>
                      </div>
                      <div className="row-card-actions" onClick={(e) => e.stopPropagation()}>
                        <span className={`status-chip ${via.isActive ? "success" : "danger"}`}>
                          {via.isActive ? "Active" : "Inactive"}
                        </span>
                        {confirmDeleteViaId === via.id ? (
                          <>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => deleteViaMutation.mutate(via.id)}
                              disabled={deleteViaMutation.isPending}
                            >
                              {deleteViaMutation.isPending ? "Đang xóa..." : "Xác nhận xóa"}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setConfirmDeleteViaId(null)}
                              disabled={deleteViaMutation.isPending}
                            >
                              Hủy
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setConfirmDeleteViaId(via.id)}
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          {/* ── Facebook Pages ── */}
          <section className="glass-card panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">
                  {selectedVia ? `Via: ${selectedVia.displayName}` : "Chọn via để xem pages"}
                </p>
                <h2>Facebook Pages</h2>
              </div>

              {selectedViaId && (
                <div className="section-head-actions">
                  {selectionDirty && (
                    <button
                      className="primary-button"
                      onClick={handleSaveSelection}
                      disabled={saveSelectionMutation.isPending}
                    >
                      {saveSelectionMutation.isPending ? "Đang lưu..." : `Lưu tùy chọn (${selectedCount})`}
                    </button>
                  )}
                  <button
                    className="secondary-button"
                    onClick={() => loadPagesMutation.mutate(selectedViaId)}
                    disabled={loadPagesMutation.isPending}
                  >
                    {loadPagesMutation.isPending ? "Đang load..." : "Load Pages"}
                  </button>
                </div>
              )}
            </div>

            {/* Pages content */}
            {!selectedViaId ? (
              <p className="empty-hint">← Chọn một via account ở bên trái để xem và quản lý pages.</p>
            ) : pagesLoading ? (
              <p className="empty-hint">Đang tải pages...</p>
            ) : pages.length === 0 ? (
              <div className="pages-empty-state">
                <p className="subtle">Via này chưa có page nào trong hệ thống.</p>
                <button
                  className="primary-button"
                  style={{ marginTop: 12 }}
                  onClick={() => loadPagesMutation.mutate(selectedViaId)}
                  disabled={loadPagesMutation.isPending}
                >
                  {loadPagesMutation.isPending ? "Đang load từ Facebook..." : "Load Pages từ Facebook"}
                </button>
              </div>
            ) : (
              <>
                <div className="pages-toolbar">
                  <span className="subtle" style={{ fontSize: 13 }}>
                    {selectedCount}/{pages.length} page được chọn để đăng
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="chip ghost" onClick={handleSelectAll}>Chọn tất cả</button>
                    <button className="chip ghost" onClick={handleDeselectAll}>Bỏ chọn tất cả</button>
                  </div>
                </div>

                <div className="list">
                  {pages.map((page) => (
                    <label key={page.id} className="row-card page-row-label">
                      <input
                        type="checkbox"
                        className="page-checkbox"
                        checked={pageSelection.has(page.id)}
                        onChange={() => togglePage(page.id)}
                      />
                      <div className="page-row-info">
                        <h3>{page.pageName}</h3>
                        <p>ID: {page.pageId}</p>
                      </div>
                      <span className={`status-chip ${page.isActive ? "success" : "danger"}`}>
                        {page.isActive ? "Active" : "Inactive"}
                      </span>
                    </label>
                  ))}
                </div>

                {selectionDirty && (
                  <div className="pages-save-bar">
                    <span className="subtle" style={{ fontSize: 13 }}>Có thay đổi chưa lưu</span>
                    <button
                      className="primary-button"
                      onClick={handleSaveSelection}
                      disabled={saveSelectionMutation.isPending}
                    >
                      {saveSelectionMutation.isPending ? "Đang lưu..." : `Lưu tùy chọn (${selectedCount} page)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {/* ── Automation Campaign ── */}
        <section className="glass-card panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Lên lịch tự động</p>
              <h2>Automation Campaign</h2>
            </div>
            <button
              className={showAddCampaign ? "secondary-button" : "primary-button"}
              onClick={() => {
                setShowAddCampaign((v) => !v)
                if (showAddCampaign) setCampaignViaId(null)
              }}
            >
              {showAddCampaign ? "Huỷ" : "+ Tạo Campaign"}
            </button>
          </div>

          {showAddCampaign && (
            <form className="add-form campaign-form" onSubmit={campaignForm.handleSubmit(onSubmitCampaign)} noValidate>
              <label className="field">
                <span>Tên Campaign</span>
                <input {...campaignForm.register("name")} placeholder="Morning Burst Campaign" autoFocus />
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
                    <input {...campaignForm.register("interval_hours", { valueAsNumber: true })} type="number" min={1} max={24} placeholder="2" />
                  </label>
                </div>
              )}

              {scheduleMode === "flexible_make_like" && (
                <label className="field">
                  <span>Tối đa lần đăng mỗi ngày</span>
                  <input {...campaignForm.register("max_per_day", { valueAsNumber: true })} type="number" min={1} max={50} placeholder="5" />
                </label>
              )}

              <div className="form-row">
                <label className="field" style={{ flex: 2 }}>
                  <span>Google Sheet ID</span>
                  <input {...campaignForm.register("sheet_id")} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" />
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
                  <input {...campaignForm.register("rows_per_run", { valueAsNumber: true })} type="number" min={1} max={100} />
                </label>
              </div>

              {/* Via selector */}
              <div className="campaign-via-section">
                <label className="field">
                  <span>Via Account đăng bài</span>
                  <select
                    value={campaignViaId ?? ""}
                    onChange={(e) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      setCampaignViaId((e.target.value || null) as any)
                      setCampaignPageSelection(new Set())
                    }}
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
                      Chọn pages đăng bài ({campaignPageSelection.size}/{campaignViaPages.length})
                    </span>
                    {campaignViaPages.length === 0 ? (
                      <p className="subtle" style={{ fontSize: 13, marginTop: 8 }}>
                        Via này chưa có page nào. Hãy load pages từ Facebook ở panel trái trước.
                      </p>
                    ) : (
                      <div className="campaign-pages-list">
                        {campaignViaPages.map((page) => (
                          <label key={page.id} className="campaign-page-item" style={{ cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={campaignPageSelection.has(page.id)}
                              onChange={() => toggleCampaignPage(page.id)}
                              style={{ accentColor: "var(--accent)" }}
                            />
                            <span>{page.pageName}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={addCampaignMutation.isPending}>
                  {addCampaignMutation.isPending ? "Đang tạo..." : "Tạo Campaign"}
                </button>
              </div>
            </form>
          )}

          {campaigns.length > 0 ? (
            <div className="list" style={{ marginTop: showAddCampaign ? 20 : 0 }}>
              {campaigns.map((c) => (
                <article key={c.id} className="row-card">
                  {editingCampaign?.id === c.id ? (
                    <CampaignEditForm
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
                      {c.pages.length > 0 && (
                        <div className="tag-list">
                          {c.pages.map((p) => <span key={p.id} className="chip">{p.pageName}</span>)}
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
                Chưa có campaign nào. Tick chọn pages ở trên rồi nhấn "+ Tạo Campaign".
              </p>
            )
          )}
        </section>

      </div>
    </div>
  )
}

// ─── Campaign Edit Form ────────────────────────────────────────────────────────

const SCHEDULE_MODES_EDIT = [
  { value: "daily_fixed_time", title: "Giờ cố định" },
  { value: "window_interval", title: "Cửa sổ lặp" },
  { value: "flexible_make_like", title: "Linh hoạt" },
]

function CampaignEditForm({
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
  // viaAccountId is a Firebase string ID at runtime despite number types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialViaId: number | null = (campaign.viaAccountId ?? campaign.pages[0]?.viaAccountId ?? null) as any

  const [name, setName] = useState(campaign.name)
  const [sheetId, setSheetId] = useState(campaign.sheetId)
  const [sheetTabName, setSheetTabName] = useState(campaign.sheetTabName)
  const [rowsPerRun, setRowsPerRun] = useState(campaign.rowsPerRun)
  const [isActive, setIsActive] = useState(campaign.isActive)
  const [scheduleMode, setScheduleMode] = useState(campaign.scheduleMode)
  const [times, setTimes] = useState<string>((campaign.scheduleConfig.times as string[] | undefined)?.join(",") ?? "")
  const [startTime, setStartTime] = useState<string>((campaign.scheduleConfig.start_time as string | undefined) ?? "09:00")
  const [endTime, setEndTime] = useState<string>((campaign.scheduleConfig.end_time as string | undefined) ?? "18:00")
  const [intervalHours, setIntervalHours] = useState<number>((campaign.scheduleConfig.interval_hours as number | undefined) ?? 2)
  const [maxPerDay, setMaxPerDay] = useState<number>((campaign.scheduleConfig.max_per_day as number | undefined) ?? 5)
  const [viaId, setViaId] = useState<number | null>(initialViaId)
  const [pageSelection, setPageSelection] = useState<Set<unknown>>(
    new Set(campaign.pages.map((p) => p.id))
  )
  const viaChangedRef = React.useRef(false)

  const { data: viaPages = [] } = useQuery({
    queryKey: ["facebook-pages", viaId],
    queryFn: () => getFacebookPages(viaId!),
    enabled: viaId !== null,
  })

  // When user switches via, default all pages of new via as selected
  useEffect(() => {
    if (viaChangedRef.current && viaPages.length > 0) {
      setPageSelection(new Set(viaPages.map((p) => p.id)))
      viaChangedRef.current = false
    }
  }, [viaPages])

  const togglePage = (pageId: unknown) => {
    setPageSelection((prev) => {
      const next = new Set(prev)
      next.has(pageId) ? next.delete(pageId) : next.add(pageId)
      return next
    })
  }

  const buildScheduleConfig = (): Record<string, unknown> => {
    if (scheduleMode === "daily_fixed_time")
      return { times: times.split(",").map((t) => t.trim()).filter(Boolean) }
    if (scheduleMode === "window_interval")
      return { start_time: startTime, end_time: endTime, interval_hours: intervalHours }
    return { max_per_day: maxPerDay }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Parameters<typeof updateCampaign>[1] = {
      name,
      sheet_id: sheetId,
      sheet_tab_name: sheetTabName,
      rows_per_run: rowsPerRun,
      is_active: isActive,
      schedule_mode: scheduleMode,
      schedule_config: buildScheduleConfig(),
      via_account_id: viaId?.toString() ?? null,
      page_ids: Array.from(pageSelection) as number[],
    }
    onSave(payload)
  }

  return (
    <form className="add-form" onSubmit={handleSubmit} noValidate>
      <p className="eyebrow" style={{ margin: 0 }}>Chỉnh sửa campaign</p>

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
            <input type="number" min={1} max={24} value={intervalHours} onChange={(e) => setIntervalHours(Number(e.target.value))} />
          </label>
        </div>
      )}
      {scheduleMode === "flexible_make_like" && (
        <label className="field">
          <span>Tối đa lần đăng mỗi ngày</span>
          <input type="number" min={1} max={50} value={maxPerDay} onChange={(e) => setMaxPerDay(Number(e.target.value))} />
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
          <input type="number" min={1} max={100} value={rowsPerRun} onChange={(e) => setRowsPerRun(Number(e.target.value))} />
        </label>
      </div>

      <label className="field">
        <span>Via Account đăng bài</span>
        <select
          value={viaId ?? ""}
          onChange={(e) => {
            viaChangedRef.current = true
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setViaId((e.target.value || null) as any)
            setPageSelection(new Set())
          }}
        >
          <option value="">-- Chọn via --</option>
          {viaAccounts.map((v) => (
            <option key={v.id} value={v.id}>{v.displayName}</option>
          ))}
        </select>
      </label>
      {viaId && (
        <div className="campaign-pages-section">
          <span className="field-label">
            Chọn pages đăng bài ({pageSelection.size}/{viaPages.length})
          </span>
          {viaPages.length === 0 ? (
            <p className="subtle" style={{ fontSize: 13, marginTop: 8 }}>Via này chưa có page nào.</p>
          ) : (
            <div className="campaign-pages-list">
              {viaPages.map((p) => (
                <label key={p.id} className="campaign-page-item" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={pageSelection.has(p.id)}
                    onChange={() => togglePage(p.id)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span>{p.pageName}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: 16, height: 16 }} />
        <span>Kích hoạt campaign</span>
      </label>

      <div className="form-actions">
        <button className="primary-button" type="submit" disabled={isPending}>
          {isPending ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
        <button className="secondary-button" type="button" onClick={onCancel} disabled={isPending}>
          Hủy
        </button>
      </div>
    </form>
  )
}
