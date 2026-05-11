import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { getFacebookPages } from "@/api/facebookPage.api"

const PER_PAGE = 20

export function FacebookPagesPage() {
  const [currentPage, setCurrentPage] = useState(1)

  const { data } = useQuery({
    queryKey: ["facebook-pages"],
    queryFn: () => getFacebookPages(),
  })

  const allPages = data ?? []
  const totalPages = Math.max(1, Math.ceil(allPages.length / PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const start = (safePage - 1) * PER_PAGE
  const visiblePages = allPages.slice(start, start + PER_PAGE)

  function goTo(page: number) {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const pageNumbers = buildPageNumbers(safePage, totalPages)

  return (
    <div className="page-shell">
      <div className="dashboard">
        <section className="glass-card panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Management</p>
              <h2>Facebook pages</h2>
            </div>
            {allPages.length > 0 && (
              <span className="chip ghost" style={{ fontSize: 13 }}>
                {allPages.length} page{allPages.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="list">
            {visiblePages.map((page) => (
              <article className="row-card" key={page.id}>
                <div className="row-card-header">
                  <div>
                    <h3>{page.pageName}</h3>
                    <p>{page.pageId}</p>
                  </div>
                  <span className="status-chip success">Ready</span>
                </div>
              </article>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, paddingTop: 16 }}>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => goTo(safePage - 1)}
                disabled={safePage === 1}
              >
                ‹
              </button>

              {pageNumbers.map((n, i) =>
                n === "..." ? (
                  <span key={`ellipsis-${i}`} style={{ padding: "0 4px", color: "var(--muted)" }}>…</span>
                ) : (
                  <button
                    key={n}
                    className={`btn btn-sm ${n === safePage ? "primary-button" : "btn-ghost"}`}
                    onClick={() => goTo(n as number)}
                    style={{ minWidth: 32 }}
                  >
                    {n}
                  </button>
                )
              )}

              <button
                className="btn btn-sm btn-ghost"
                onClick={() => goTo(safePage + 1)}
                disabled={safePage === totalPages}
              >
                ›
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function buildPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | "...")[] = [1]

  if (current > 3) pages.push("...")
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p)
  }
  if (current < total - 2) pages.push("...")

  pages.push(total)
  return pages
}
