const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const TOKEN_KEY = "sawitvision_v3_token";
const USER_KEY = "sawitvision_v3_user";

// =========================================================
// AUTH STORAGE
// =========================================================

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const storedUser = localStorage.getItem(USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return normalizeUser(JSON.parse(storedUser));
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function saveStoredUser(user) {
  if (!user) {
    localStorage.removeItem(USER_KEY);
    return;
  }

  const normalizedUser = normalizeUser(user);

  localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
}
export function saveAuthSession(accessToken, user) {
  localStorage.setItem(TOKEN_KEY, accessToken);

  saveStoredUser(normalizeUser(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,

    // Backend memakai "name",
    // frontend memakai "full_name".
    full_name: user.full_name || user.name || "",

    name: user.name || user.full_name || "",
  };
}
// =========================================================
// REQUEST UTAMA
// =========================================================

async function apiRequest(endpoint, options = {}) {
  const token = getAccessToken();

  const headers = {
    ...options.headers,
  };

  // Kalau bukan FormData,
  // gunakan JSON.
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Tambahkan JWT kalau user sudah login.
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Tidak dapat terhubung ke server. Pastikan backend sedang berjalan.",
    );
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      "Terjadi kesalahan saat memproses permintaan.";

    throw new Error(message);
  }

  return data;
}

// =========================================================
// REGISTER
// =========================================================

export async function registerUser(payload) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// =========================================================
// LOGIN
// =========================================================

export async function loginUser(payload) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
// =========================================================
// LUPA AKUN / CARI AKUN
// =========================================================

export async function findAccountByPhone(phoneNumber) {
  return apiRequest("/auth/find-account", {
    method: "POST",
    body: JSON.stringify({
      phone: phoneNumber,
    }),
  });
}
// =========================================================
// USER / PROFILE
// =========================================================

export async function getCurrentUser() {
  const response = await apiRequest("/auth/me", {
    method: "GET",
  });

  const user = response?.user || response?.data || response;

  return normalizeUser(user);
}

export async function updateProfile({ full_name, phone_number }) {
  const response = await apiRequest("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify({
      name: full_name,
      phone_number,
    }),
  });

  const user = response?.user || response?.data || response;

  return normalizeUser(user);
}

// =========================================================
// LOGOUT
// =========================================================

export async function logoutUser() {
  clearAuthSession();
}

// =========================================================
// PREDIKSI
// =========================================================

export async function predictPalmImage(imageFile, inputSource = "gallery") {
  const formData = new FormData();

  formData.append("file", imageFile);

  formData.append("input_source", inputSource);

  return apiRequest("/predict", {
    method: "POST",
    body: formData,
  });
}

// =========================================================
// RIWAYAT PREDIKSI
// =========================================================

export async function getPredictions({ limit = 20, offset = 0 } = {}) {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest(`/predictions?${searchParams.toString()}`, {
    method: "GET",
  });
}

export async function getPredictionDetail(recordId) {
  return apiRequest(`/predictions/${recordId}`, {
    method: "GET",
  });
}

export async function deletePrediction(recordId) {
  return apiRequest(`/predictions/${recordId}`, {
    method: "DELETE",
  });
}

// =========================================================
// STATISTIK
// =========================================================

export async function getPredictionStats() {
  return apiRequest("/stats", {
    method: "GET",
  });
}

// =========================================================
// ADMIN DASHBOARD
// Tambahkan ke bagian paling bawah src/services/api.js
// Endpoint disesuaikan dengan admin_routes_v3_phone.py
// =========================================================

export async function getAdminStats() {
  return apiRequest("/admin/stats", {
    method: "GET",
  });
}

export async function getAdminUsers({
  limit = 20,
  offset = 0,
  search = "",
} = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (search) {
    params.set("search", search);
  }

  return apiRequest(
    `/admin/users?${params.toString()}`,
    {
      method: "GET",
    }
  );
}

export async function updateAdminUserStatus(
  userId,
  isActive
) {
  const params = new URLSearchParams({
    is_active: String(isActive),
  });

  return apiRequest(
    `/admin/users/${userId}/status?${params.toString()}`,
    {
      method: "PATCH",
    }
  );
}

export async function getAdminActivityLogs({
  page = 1,
  pageSize = 20,
  action = "",
  search = "",
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  if (action) {
    params.set("action", action);
  }

  if (search) {
    params.set("search", search);
  }

  return apiRequest(
    `/admin/activity-logs?${params.toString()}`,
    {
      method: "GET",
    }
  );
}

export async function cleanupActivityLogs(
  olderThanDays = 90
) {
  const params = new URLSearchParams({
    older_than_days: String(
      olderThanDays
    ),
  });

  return apiRequest(
    `/admin/activity-logs/cleanup?${params.toString()}`,
    {
      method: "DELETE",
    }
  );
}

export async function getAdminStorageStats() {
  return apiRequest(
    "/admin/storage-stats",
    {
      method: "GET",
    }
  );
}

export async function cleanupStorage(
  limit = 10
) {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  return apiRequest(
    `/admin/storage/cleanup?${params.toString()}`,
    {
      method: "DELETE",
    }
  );
}

// Download file Excel tidak memakai apiRequest()
// karena responsnya berupa blob, bukan JSON.
export async function downloadAdminPredictionReport({
  startDate,
  endDate,
  userId,
  predictedClass,
} = {}) {
  const token = getAccessToken();

  const params = new URLSearchParams();

  if (startDate) {
    params.set("start_date", startDate);
  }

  if (endDate) {
    params.set("end_date", endDate);
  }

  if (userId) {
    params.set("user_id", userId);
  }

  if (predictedClass) {
    params.set(
      "predicted_class",
      predictedClass
    );
  }

  const query = params.toString();

  const response = await fetch(
    `${API_BASE_URL}/admin/reports/predictions.xlsx${
      query ? `?${query}` : ""
    }`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    let message =
      "Laporan gagal diunduh.";

    try {
      const data = await response.json();
      message =
        data?.detail ||
        data?.message ||
        message;
    } catch {
      // Abaikan jika response bukan JSON.
    }

    throw new Error(message);
  }

  const blob = await response.blob();

  const contentDisposition =
    response.headers.get(
      "content-disposition"
    );

  let filename =
    "Laporan_Global_SawitVision_V3.xlsx";

  const filenameMatch =
    contentDisposition?.match(
      /filename="?([^"]+)"?/i
    );

  if (filenameMatch?.[1]) {
    filename = filenameMatch[1];
  }

  const downloadUrl =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = downloadUrl;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(downloadUrl);
}
export async function deleteMyAccount() {
  return apiRequest("/auth/account", {
    method: "DELETE",
  });
}
