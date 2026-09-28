import EmptyState from "../ui/EmptyState";
import MaturityBadge from "../MaturityBadge";
import { formatConfidence, formatDateTime } from "../../utils/presentation";

function AdminPredictionTable({ predictions, emptyDescription = "Belum ada prediksi tersimpan." }) {
  if (!predictions.length) {
    return (
      <EmptyState
        icon="scan"
        title="Belum ada prediksi"
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th scope="col">Pengguna</th>
            <th scope="col">Ringkasan kematangan</th>
            <th scope="col">Confidence ringkasan</th>
            <th scope="col">Waktu</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((item) => (
            <tr key={item.id}>
              <td data-label="Pengguna">
                <strong>{item.user_name || "Tidak diketahui"}</strong>
                <small>{item.user_phone || "-"}</small>
              </td>
              <td data-label="Kematangan"><MaturityBadge value={item.predicted_class} /></td>
              <td data-label="Confidence">{formatConfidence(item.confidence)}%</td>
              <td data-label="Waktu">{formatDateTime(item.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminPredictionTable;
