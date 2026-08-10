export function normalizePhoneNumber(value) {
  if (!value) {
    return "";
  }

  let digits = String(value).replace(/\D/g, "");

  if (digits.startsWith("62")) {
    digits = `0${digits.slice(2)}`;
  } else if (digits.startsWith("8")) {
    digits = `0${digits}`;
  }

  return digits;
}

export function formatPhoneInput(value) {
  const normalized = normalizePhoneNumber(value);

  return normalized.slice(0, 15);
}

export function isValidPhoneNumber(value) {
  const normalized = normalizePhoneNumber(value);

  return /^08\d{7,13}$/.test(normalized);
}

export function getPhoneError(value) {
  const normalized = normalizePhoneNumber(value);

  if (!normalized) {
    return "Nomor telepon wajib diisi.";
  }

  if (!normalized.startsWith("08")) {
    return "Nomor telepon harus diawali 08 atau +62.";
  }

  if (normalized.length < 9) {
    return "Nomor telepon terlalu pendek.";
  }

  if (normalized.length > 15) {
    return "Nomor telepon terlalu panjang.";
  }

  return "";
}
