import { useRef } from "react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import Icon from "../ui/Icon";
import LoadingState from "../ui/LoadingState";
import { formatDateTime } from "../../utils/presentation";

function AdminUsers({
  users,
  search,
  onSearchChange,
  onSearch,
  pagination,
  pageSize,
  onPageChange,
  isLoading,
  actionUserId,
  onStatusChange,
}) {
  const sectionRef = useRef(null);
  const page = pagination?.page || 1;
  const total = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 0;
  const hasPrevious = page > 1;
  const hasNext = Boolean(pagination?.hasMore);
  const rangeStart = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = total > 0
    ? Math.min(rangeStart + users.length - 1, total)
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
    <section ref={sectionRef} className="admin-section admin-users-section" aria-labelledby="admin-users-title">
      <header className="admin-section-header">
        <div>
          <p>Manajemen pengguna</p>
          <h2 id="admin-users-title">Akun yang terdaftar</h2>
        </div>
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
          <span className="admin-visually-hidden">Cari pengguna</span>
          <Icon name="profile" size={18} />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Cari nama atau nomor telepon"
          />
        </label>
        <Button type="submit" variant="secondary" disabled={isLoading}>
          {isLoading ? "Mencari..." : "Cari"}
        </Button>
      </form>

      <Card className="admin-panel admin-table-panel">
        {isLoading ? (
          <LoadingState title="Memuat pengguna..." />
        ) : users.length === 0 ? (
          <EmptyState icon="profile" title="Pengguna tidak ditemukan" description="Coba gunakan nama atau nomor telepon lain." />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Pengguna</th>
                  <th scope="col">Peran</th>
                  <th scope="col">Bergabung</th>
                  <th scope="col">Foto</th>
                  <th scope="col">Status</th>
                  <th scope="col">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td data-label="Pengguna"><strong>{user.name}</strong><small>{user.phone_number}</small></td>
                    <td data-label="Peran"><Badge>{user.role === "admin" ? "Administrator" : "Pengguna"}</Badge></td>
                    <td data-label="Bergabung">{formatDateTime(user.created_at)}</td>
                    <td data-label="Foto">{user.total_predictions}</td>
                    <td data-label="Status"><Badge tone={user.is_active ? "success" : "danger"}>{user.is_active ? "Aktif" : "Nonaktif"}</Badge></td>
                    <td data-label="Aksi">
                      {user.role === "admin" ? (
                        <span className="admin-muted">Dilindungi</span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant={user.is_active ? "danger" : "secondary"}
                          onClick={() => onStatusChange(user)}
                          disabled={actionUserId === user.id}
                        >
                          {actionUserId === user.id ? "Memproses..." : user.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {total > 0 && (
        <nav className="admin-pagination" aria-label="Pagination pengguna">
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
            <span>Menampilkan {rangeStart}–{rangeEnd} dari {total} pengguna</span>
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

export default AdminUsers;
