import type { FailedCheckpoint, ReportCheckpoint } from "../persistence/checkpoint.ts";

interface WeeklyReportProps {
  checkpoint: ReportCheckpoint | FailedCheckpoint;
  /** Authored consequence lines for this week's decisions. */
  lines: string[];
  failed?: boolean;
  busy?: boolean;
  error?: string | null;
  /** Absent in the failed state: there is no next week to go to. */
  onNextWeek?: () => void;
}

const signed = (value: number) => (value > 0 ? `+${value}` : String(value));

/**
 * What the player can reasonably know about a settled week: completed jobs, income, cost, the
 * cash result, the visible company meters and authored consequence lines. Hidden state
 * (sentiment, hostility, relationship status, memories, risk arithmetic) is deliberately absent.
 */
export function WeeklyReport({
  checkpoint,
  lines,
  failed = false,
  busy = false,
  error = null,
  onNextWeek,
}: WeeklyReportProps) {
  const { settlement, metrics } = checkpoint;
  const finalWeek = checkpoint.week >= 12;
  return (
    <section className="card report" aria-labelledby="report-title" aria-busy={busy}>
      <h2 id="report-title" className="card__title">
        Báo cáo tuần {settlement.week}
      </h2>
      <dl className="report__list">
        <div>
          <dt>Đơn giao hàng hoàn thành</dt>
          <dd>{settlement.deliveryJobs}</dd>
        </div>
        <div>
          <dt>Chuyến chở khách hoàn thành</dt>
          <dd>{settlement.rideJobs}</dd>
        </div>
        <div>
          <dt>Doanh thu</dt>
          <dd>{settlement.grossIncome}</dd>
        </div>
        <div>
          <dt>Chi phí cố định</dt>
          <dd>{settlement.weeklyCost}</dd>
        </div>
        <div>
          <dt>Kết quả tuần</dt>
          <dd>{signed(settlement.cashDelta)}</dd>
        </div>
        <div>
          <dt>Tiền mặt hiện có</dt>
          <dd>{metrics.cash}</dd>
        </div>
        <div>
          <dt>Mạng lưới tài xế</dt>
          <dd>{metrics.riderNetwork}/100</dd>
        </div>
        <div>
          <dt>Mạng lưới cửa hàng</dt>
          <dd>{metrics.merchantNetwork}/100</dd>
        </div>
        <div>
          <dt>Niềm tin của công chúng</dt>
          <dd>{metrics.publicTrust}/100</dd>
        </div>
      </dl>
      {lines.length > 0 ? (
        <ul className="report__lines">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {failed ? (
        <p role="alert" className="report__failed">
          Công ty đã cạn tiền. Bản nguyên mẫu dừng ở đây.
        </p>
      ) : null}
      {onNextWeek ? (
        <button
          type="button"
          className="button button--primary report__next"
          disabled={busy}
          onClick={onNextWeek}
        >
          {finalWeek ? "Kết thúc bản nguyên mẫu" : "Tuần tiếp theo"}
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="event__error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
