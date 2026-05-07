import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { deleteViaAccount, getViaAccounts } from "@/api/viaAccount.api"

export function ViaAccountsPage() {
  const queryClient = useQueryClient()
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const { data } = useQuery({
    queryKey: ["via-accounts"],
    queryFn: getViaAccounts,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteViaAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["via-accounts"] })
      setConfirmId(null)
    },
  })

  return (
    <div className="page-shell">
      <div className="dashboard">
        <section className="glass-card panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Management</p>
              <h2>Via accounts</h2>
            </div>
          </div>
          <div className="list">
            {(data ?? []).map((via) => (
              <article className="row-card" key={via.id}>
                <div className="row-card-header">
                  <div>
                    <h3>{via.displayName}</h3>
                    <p>{via.isActive ? "Active" : "Inactive"}</p>
                  </div>
                  <div className="row-card-actions">
                    <span className="status-chip success">Connected</span>
                    {confirmId === via.id ? (
                      <>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteMutation.mutate(via.id)}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? "Đang xóa..." : "Xác nhận xóa"}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setConfirmId(null)}
                          disabled={deleteMutation.isPending}
                        >
                          Hủy
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setConfirmId(via.id)}
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
