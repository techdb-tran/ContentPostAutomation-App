import { useQuery } from "@tanstack/react-query"

import { getFacebookPages } from "@/api/facebookPage.api"

export function FacebookPagesPage() {
  const { data } = useQuery({
    queryKey: ["facebook-pages"],
    queryFn: () => getFacebookPages(),
  })

  return (
    <div className="page-shell">
      <div className="dashboard">
        <section className="glass-card panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Management</p>
              <h2>Facebook pages</h2>
            </div>
          </div>
          <div className="list">
            {(data ?? []).map((page) => (
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
        </section>
      </div>
    </div>
  )
}
