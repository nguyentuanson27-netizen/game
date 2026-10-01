import type { ReportCheckpoint } from "../persistence/checkpoint.ts";

interface WeeklyReportProps {
  checkpoint: ReportCheckpoint;
  failed: boolean;
}

const money = (value: number) => (value > 0 ? `+${value}` : String(value));

/** What the player can know about a settled week: jobs, income, cost and the cash result. */
export function WeeklyReport({ checkpoint, failed }: WeeklyReportProps) {
  const { settlement, metrics } = checkpoint;
  return (
    <section className="card report" aria-labelledby="report-title">
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
          <dd>{money(settlement.cashDelta)}</dd>
        </div>
        <div>
          <dt>Tiền mặt hiện có</dt>
          <dd>{metrics.cash}</dd>
        </div>
      </dl>
      {failed ? (
        <p role="alert" className="report__failed">
          Công ty đã cạn tiền. Bản nguyên mẫu dừng ở đây.
        </p>
      ) : null}
    </section>
  );
}
