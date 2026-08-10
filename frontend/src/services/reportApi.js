const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const TOKEN_KEY = "sawitvision_v3_token";

function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getDownloadFilename(response) {
  const disposition = response.headers.get(
    "content-disposition"
  );

  if (!disposition) {
    return `Laporan_Prediksi_SawitVision_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;
  }

  const utf8Match = disposition.match(
    /filename\*=UTF-8''([^;]+)/i
  );

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const normalMatch = disposition.match(
    /filename="?([^";]+)"?/i
  );

  return (
    normalMatch?.[1] ||
    `Laporan_Prediksi_SawitVision_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`
  );
}

export async function downloadMyPredictionReport({
  startDate,
  endDate,
} = {}) {
  const token = getAccessToken();

  if (!token) {
    throw new Error(
      "Sesi login tidak ditemukan. Silakan login kembali."
    );
  }

  const params = new URLSearchParams();

  if (startDate) {
    params.set("start_date", startDate);
  }

  if (endDate) {
    params.set("end_date", endDate);
  }

  const query = params.toString();
  const url = `${API_BASE_URL}/reports/my-predictions.xlsx${
    query ? `?${query}` : ""
  }`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let message = "Laporan Excel gagal dibuat.";

    try {
      const data = await response.json();
      message = data?.detail || message;
    } catch {
      // Abaikan jika response bukan JSON.
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const filename = getDownloadFilename(response);

  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(downloadUrl);
}
