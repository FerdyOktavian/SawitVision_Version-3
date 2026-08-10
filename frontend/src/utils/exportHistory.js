import * as XLSX from "xlsx";

function normalizeClassName(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, "_");
}

function classLabel(value = "") {
  const key = normalizeClassName(value);

  if (key === "belum_masak") return "Belum Masak";
  if (key === "masak") return "Masak";
  if (key === "terlalu_masak") return "Terlalu Masak";

  return value || "-";
}

function confidencePercent(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;

  return Number(
    (number <= 1 ? number * 100 : number).toFixed(2)
  );
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function sourceLabel(value = "") {
  return String(value).toLowerCase() === "camera"
    ? "Kamera"
    : "Galeri";
}

export function exportPredictionHistoryToExcel(
  historyItems = [],
  currentUser = null
) {
  if (!Array.isArray(historyItems) || historyItems.length === 0) {
    throw new Error("Belum ada riwayat yang dapat diekspor.");
  }

  const userName =
    currentUser?.full_name ||
    currentUser?.name ||
    "-";

  const phoneNumber =
    currentUser?.phone_number ||
    "-";

  const rows = historyItems.map((item, index) => ({
    No: index + 1,
    Tanggal: formatDate(item.created_at),
    "Nama Pengguna": userName,
    "Nomor Telepon": phoneNumber,
    "Hasil Klasifikasi": classLabel(item.predicted_class),
    "Confidence (%)": confidencePercent(item.confidence),
    "Sumber Gambar": sourceLabel(item.input_source),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 24 },
    { wch: 20 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Riwayat Prediksi"
  );

  const safeName = String(userName)
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_") || "pengguna";

  const today = new Date().toISOString().slice(0, 10);

  XLSX.writeFile(
    workbook,
    `Riwayat_SawitVision_${safeName}_${today}.xlsx`
  );
}
