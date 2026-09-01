export function normalizePhoneNumber(value) {
  if (!value) {
    return "";
  }

  return String(value).replace(/\D/g, "").slice(0, 15);
}

export function formatPhoneInput(value) {
  return normalizePhoneNumber(value);
}

export function isValidPhoneNumber(value) {
  const normalized = normalizePhoneNumber(value);

  return /^08\d{8,13}$/.test(normalized);
}

export function getPhoneError(value) {
  const normalized = normalizePhoneNumber(value);

  if (!normalized) {
    return "Nomor telepon wajib diisi.";
  }

  if (!normalized.startsWith("08")) {
    return "Nomor telepon harus diawali 08.";
  }

  if (normalized.length < 10) {
    return "Nomor telepon terlalu pendek.";
  }

  if (normalized.length > 15) {
    return "Nomor telepon terlalu panjang.";
  }

  return "";
}
