import Icon from "./ui/Icon";
import { formatDateTime, getLocationAccuracy, getValidCoordinate } from "../utils/presentation";

function LocationSummary({ location, actions, children, className = "" }) {
  const latitude = getValidCoordinate(location?.latitude, -90, 90);
  const longitude = getValidCoordinate(location?.longitude, -180, 180);
  const hasCoordinates = location?.available === true && latitude !== null && longitude !== null;
  const label = String(location?.label || "").trim();
  const autoName = String(location?.auto_name || "").trim();
  const accuracy = getLocationAccuracy(location?.accuracy_meters);
  const mapUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`
    : "";

  return (
    <section className={`location-summary ${className}`.trim()}>
      <div className="location-summary__header">
        <div>
          <p>Metadata Lokasi</p>
          <h3>Lokasi Pengambilan</h3>
        </div>
        {actions}
      </div>

      {label || autoName ? (
        <div className="location-summary__name">
          <Icon name="location" size={21} />
          <div>
            <small>Lokasi</small>
            <strong>{label || autoName}</strong>
            {label && autoName && label !== autoName && (
              <span>Perkiraan wilayah: {autoName}</span>
            )}
          </div>
        </div>
      ) : (
        <p className="location-summary__empty">Lokasi tidak tersedia untuk hasil ini.</p>
      )}

      {hasCoordinates && (
        <>
          <dl className="location-summary__metadata">
            <div>
              <dt>Koordinat</dt>
              <dd>{latitude.toFixed(6)}, {longitude.toFixed(6)}</dd>
            </div>
            <div>
              <dt>Akurasi</dt>
              <dd>{accuracy ? `±${accuracy.accuracy.toFixed(1)} m` : "Tidak tersedia"}</dd>
              {accuracy && <span className={`location-summary__quality is-${accuracy.level}`}>{accuracy.label}</span>}
            </div>
            <div>
              <dt>Waktu capture</dt>
              <dd>{location?.captured_at ? formatDateTime(location.captured_at) : "Tidak tersedia"}</dd>
            </div>
          </dl>
          {accuracy?.level === "low" && (
            <p className="location-summary__warning">Posisi perangkat kurang presisi. Periksa titik pada peta.</p>
          )}
          <a className="location-summary__map" href={mapUrl} target="_blank" rel="noopener noreferrer">
            <Icon name="map" size={18} />
            Lihat di Peta
            <Icon name="external" size={16} />
          </a>
        </>
      )}

      {children}
    </section>
  );
}

export default LocationSummary;

