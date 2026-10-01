import type {
  Checkpoint,
  CheckpointDraft,
  SettlementCheckpoint,
  SettlementResult,
} from "../persistence/checkpoint.ts";

// G0 D4 weekly settlement. These are prototype tuning constants; the model is the contract.
const BASE_DELIVERIES = 18;
const BASE_RIDES = 12;
const MAX_DELIVERIES = 40;
const MAX_RIDES = 30;
const DELIVERY_FEE = 2;
const RIDE_FEE = 3;
const BASE_WEEKLY_COST = 65;
/** After a committed settlement, Cash below this is the explicit `failed` state. */
export const FAILURE_CASH_THRESHOLD = -25;

const clamp = (min: number, max: number, value: number) => Math.min(max, Math.max(min, value));

type SettlementInput = Pick<Checkpoint, "metrics" | "recurringCosts" | "demandModifiers">;

/** Pure D4 arithmetic for one week of both bicycle services. */
export function computeSettlement(state: SettlementInput, week: number): SettlementResult {
  const { riderNetwork, merchantNetwork, publicTrust } = state.metrics;
  const riderFactor = Math.trunc((riderNetwork - 50) / 10);
  const merchantFactor = Math.trunc((merchantNetwork - 40) / 10);
  const trustFactor = Math.trunc((publicTrust - 50) / 15);

  const deliveryJobs = clamp(
    0,
    MAX_DELIVERIES,
    BASE_DELIVERIES + riderFactor + merchantFactor + state.demandModifiers.delivery,
  );
  const rideJobs = clamp(
    0,
    MAX_RIDES,
    BASE_RIDES + riderFactor + trustFactor + state.demandModifiers.ride,
  );

  const grossIncome = deliveryJobs * DELIVERY_FEE + rideJobs * RIDE_FEE;
  const recurringPolicyCost = Object.values(state.recurringCosts).reduce((a, b) => a + b, 0);
  const weeklyCost = BASE_WEEKLY_COST + recurringPolicyCost;
  return {
    week,
    deliveryJobs,
    rideJobs,
    grossIncome,
    weeklyCost,
    cashDelta: grossIncome - weeklyCost,
  };
}

/**
 * Settle the week from the latest committed state. Only the settlement phase can settle, and the
 * draft leaves it, so a committed settlement can never be settled again. Immediate choice effects
 * are already in `metrics`; nothing here re-applies them.
 */
export function settleWeek(checkpoint: SettlementCheckpoint): CheckpointDraft {
  const settlement = computeSettlement(checkpoint, checkpoint.week);
  const { sequence, phase: _phase, activeEvent: _active, ...rest } = checkpoint;
  const cash = checkpoint.metrics.cash + settlement.cashDelta;
  return {
    ...rest,
    parentSequence: sequence,
    metrics: { ...checkpoint.metrics, cash },
    phase: cash < FAILURE_CASH_THRESHOLD ? "failed" : "report",
    activeEvent: null,
    settlement,
  };
}
