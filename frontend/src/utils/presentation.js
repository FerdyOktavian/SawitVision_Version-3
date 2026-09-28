export const MATURITY_META = {
  belum_masak: { label: "Belum Matang", tone: "unripe" },
  masak: { label: "Matang", tone: "ripe" },
  terlalu_masak: { label: "Terlalu Matang", tone: "overripe" },
};

export function normalizeMaturityClass(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, "_");
}

export function formatMaturityLabel(value) {
  const normalized = normalizeMaturityClass(value);

  if (MATURITY_META[normalized]) return MATURITY_META[normalized].label;

  return normalized
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Tidak diketahui";
}

export function formatConfidence(value, fractionDigits = 2) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return Number(0).toFixed(fractionDigits);
  return (number <= 1 ? number * 100 : number).toFixed(fractionDigits);
}

export function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function getValidCoordinate(value, minimum, maximum) {
  if (value === null || value === undefined || value === "") return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= minimum && coordinate <= maximum
    ? coordinate
    : null;
}

export function getLocationAccuracy(value) {
  const accuracy = Number(value);
  const available = value !== null && value !== undefined && value !== "" &&
    Number.isFinite(accuracy) && accuracy >= 0;

  if (!available) return null;
  if (accuracy <= 50) return { accuracy, label: "Akurasi Tinggi", level: "high" };
  if (accuracy <= 500) return { accuracy, label: "Akurasi Sedang", level: "medium" };
  return { accuracy, label: "Akurasi Rendah", level: "low" };
}

