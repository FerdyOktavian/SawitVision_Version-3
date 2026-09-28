import Card from "../ui/Card";
import Icon from "../ui/Icon";
import MaturityBadge from "../MaturityBadge";
import { formatConfidence } from "../../utils/presentation";

const CLASSES = ["belum_masak", "masak", "terlalu_masak"];

function safeCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : 0;
}

function hasNumber(value) {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function imageClassCount(distribution, className) {
  const value = distribution?.[className];
  return safeCount(value && typeof value === "object" ? value.total : value);
}

export function ImageDistributionPanel({ imageByClass, predictionByClass }) {
  return (
    <Card as="article" className="admin-panel">
      <header className="admin-panel__header">
        <div>
          <p>Ringkasan foto</p>
          <h3>Distribusi kelas per foto</h3>
        </div>
        <Icon name="gallery" size={20} />
      </header>
      <div className="admin-distribution-list">
        {CLASSES.map((className) => {
          const average = predictionByClass?.[className]?.avg_confidence;
          return (
            <div className="admin-distribution-row" key={className}>
              <MaturityBadge value={className} />
              <div>
                <strong>{imageClassCount(imageByClass, className)} foto</strong>
                {hasNumber(average) && (
                  <small>Rata-rata ringkasan {formatConfidence(average)}%</small>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function TbsDistributionPanel({
  tbsByClass,
  avgDetectorConfidence,
  detailsUnavailable,
  coverageMessage,
  coverageCaption,
  coverageStatus,
}) {
  return (
    <Card as="article" className="admin-panel">
      <header className="admin-panel__header">
        <div>
          <p>Detail multi-TBS</p>
          <h3>Distribusi kelas per TBS</h3>
        </div>
        <Icon name="scan" size={20} />
      </header>

      {!detailsUnavailable && hasNumber(avgDetectorConfidence) && (
        <div className="admin-inline-metric">
          <span>Rata-rata confidence detektor</span>
          <strong>{formatConfidence(avgDetectorConfidence)}%</strong>
        </div>
      )}

      <div className="admin-distribution-list">
        {CLASSES.map((className) => {
          const classStats = tbsByClass?.[className];
          const total = safeCount(classStats?.total);
          const average = classStats?.avg_maturity_confidence;
          return (
            <div className="admin-distribution-row" key={className}>
              <MaturityBadge value={className} />
              <div>
                <strong>{detailsUnavailable ? "—" : `${total} TBS`}</strong>
                {!detailsUnavailable && total > 0 && hasNumber(average) && (
                  <small>Rata-rata kematangan {formatConfidence(average)}%</small>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={`admin-coverage admin-coverage--${coverageStatus}`} role="note">
        <Icon name="info" size={18} />
        <div>
          <strong>{coverageMessage}</strong>
          {coverageCaption && <small>{coverageCaption}</small>}
        </div>
      </div>
    </Card>
  );
}
