import { useRef } from "react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import Icon from "../ui/Icon";
import LoadingState from "../ui/LoadingState";
import { formatDateTime } from "../../utils/presentation";

function AdminActivity({
  logs,
  search,
  onSearchChange,
  onSearch,
  pagination,
  pageSize,
  onPageChange,
  isLoading,
  isCleaning,
  onCleanup,
}) {
  const sectionRef = useRef(null);
  const page = pagination?.page || 1;
  const total = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 0;
  const hasPrevious = page > 1;
  const hasNext = Boolean(pagination?.hasMore);
  const rangeStart = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = total > 0
    ? Math.min(rangeStart + logs.length - 1, total)
    : 0;

  const changePage = async (nextPage) => {
    await onPageChange(nextPage);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    sectionRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <section ref={sectionRef} className="admin-section admin-activity-section" aria-labelledby="admin-activity-title">
      <header className="admin-section-header">
        <div>
          <p>Catatan sistem</p>
          <h2 id="admin-activity-title">Aktivitas</h2>
        </div>
        <Button type="button" variant="danger" onClick={onCleanup} disabled={isCleaning}>
          <Icon name="trash" size={18} />
          {isCleaning ? "Membersihkan..." : "Hapus log > 90 hari"}
        </Button>
      </header>

      <form
        className="admin-toolbar"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <label className="admin-search-field">
          <span className="admin-visually-hidden">Cari aktivitas</span>
          <Icon name="history" size={18} />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Cari aktivitas, pelaku, atau target"
          />
        </label>
        <Button type="submit" variant="secondary" disabled={isLoading}>
          {isLoading ? "Mencari..." : "Cari"}
        </Button>
      </form>

      <Card className="admin-panel">
        {isLoading ? (
          <LoadingState title="Memuat aktivitas..." />
        ) : logs.length === 0 ? (
          <EmptyState icon="history" title="Belum ada aktivitas" description="Catatan aktivitas sistem akan muncul di bagian ini." />
        ) : (
          <div className="admin-activity-list">
            {logs.map((log) => (
              <article className="admin-activity-item" key={log.id}>
                <span className="admin-activity-item__icon" aria-hidden="true"><Icon name="history" size={19} /></span>
                <div>
                  <header>
                    <strong>{log.action || "Aktivitas sistem"}</strong>
                    <time dateTime={log.created_at || undefined}>{formatDateTime(log.created_at)}</time>
                  </header>
                  <p>{log.description || "Aktivitas sistem"}</p>
                  <dl>
                    <div><dt>Pelaku</dt><dd>{log.actor_user?.name || "-"}</dd></div>
                    <div><dt>Target</dt><dd>{log.target_user?.name || "-"}</dd></div>
                  </dl>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      {total > 0 && (
        <nav className="admin-pagination" aria-label="Pagination log aktivitas">
          <Button
            type="button"
            variant="secondary"
            className="admin-pagination__previous"
            onClick={() => changePage(page - 1)}
            disabled={!hasPrevious || isLoading}
          >
            Sebelumnya
          </Button>

          <div className="admin-pagination__status" aria-live="polite">
            <strong>Halaman {page} dari {totalPages}</strong>
            <span>Menampilkan {rangeStart}–{rangeEnd} dari {total} aktivitas</span>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="admin-pagination__next"
            onClick={() => changePage(page + 1)}
            disabled={!hasNext || isLoading}
          >
            Berikutnya
          </Button>
        </nav>
      )}
    </section>
  );
}

export default AdminActivity;
