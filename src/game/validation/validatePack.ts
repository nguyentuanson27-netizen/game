import type { ContentPack } from "../content/loader.ts";
import { checkCallbackCapacity } from "../domain/callbackCapacity.ts";
import { assertNoMetricConditions, type Enumeration, enumerate } from "./enumerate.ts";

// T17 bounded content validation. It reuses the runtime itself (loader, condition evaluator,
// selection rules, resolution, settlement) instead of re-implementing their rules, and it walks
// every structural state of the actual pack (see enumerate.ts). It is not a general solver or
// rules engine: it proves properties of one small pack and says so in `summary`.

export interface ContentIssue {
  code: string;
  message: string;
  /** Option ids of one history that reproduces the problem, when it depends on a history. */
  path?: string[];
}

export interface ValidationSummary {
  events: number;
  chains: number;
  callbacks: number;
  closures: number;
  /** Structural states / transitions visited by the bounded enumeration. */
  states: number;
  transitions: number;
  completedEndings: number;
  /** Fallback substitutions found (informational: the fallback doing its job). */
  fallbackSubstitutions: number;
}

export interface ValidationResult {
  issues: ContentIssue[];
  summary: ValidationSummary | null;
  enumeration: Enumeration | null;
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;

/** Static checks that need no play-through: what the loader's reference checks do not cover. */
function staticIssues(pack: ContentPack): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const planned = new Map<string, number>();
  pack.plan.forEach((slots, index) => {
    for (const id of slots) planned.set(id, (planned.get(id) ?? 0) + 1);
    // An ordinary content gap is surfaced, never hidden behind the fallback or a short week.
    if (slots.length < MIN_OPTIONS) {
      issues.push({
        code: "ordinary-gap",
        message: `week ${index + 1} authors ${slots.length} decision(s); at least ${MIN_OPTIONS} are required`,
      });
    }
    if (slots.length > (pack.weeklyBudget[index] ?? 0)) {
      issues.push({
        code: "over-budget",
        message: `week ${index + 1} plans ${slots.length} decisions, the budget is ${pack.weeklyBudget[index]}`,
      });
    }
  });

  for (const [id, count] of planned) {
    // A non-repeatable event planned twice would need the fallback (or fail) the second time.
    if (count > 1 && pack.events.get(id)?.repeatable === false) {
      issues.push({
        code: "plan-repeats-event",
        message: `${id} is not repeatable but is planned ${count} times`,
      });
    }
  }

  const fallback = pack.fallbackEventId ? pack.events.get(pack.fallbackEventId) : undefined;
  if (fallback && fallback.repeatable !== false) {
    issues.push({
      code: "fallback-repeatable",
      message: `${fallback.id} must be non-repeatable: a repeatable fallback would repeat without bound`,
    });
  }

  for (const callback of pack.callbacks.values()) {
    const source = pack.events.get(callback.sourceDecision.event);
    for (const option of source?.options ?? []) {
      const schedules = option.effects.some(
        (e) => e.kind === "callbackSchedule" && e.callback === callback.id,
      );
      const isSource = callback.sourceDecision.options.includes(option.id);
      if (isSource && !schedules) {
        issues.push({
          code: "source-option-does-not-schedule",
          message: `${option.id} is a source option of ${callback.id} but has no callbackSchedule effect for it`,
        });
      }
      if (!isSource && schedules) {
        issues.push({
          code: "non-source-option-schedules",
          message: `${option.id} schedules ${callback.id} but is not listed among its source options`,
        });
      }
    }
  }
  // Any other event scheduling a callback it is not the source of would be refused on resume.
  for (const event of pack.events.values()) {
    for (const option of event.options) {
      for (const effect of option.effects) {
        if (effect.kind !== "callbackSchedule") continue;
        const callback = pack.callbacks.get(effect.callback);
        if (callback && callback.sourceDecision.event !== event.id) {
          issues.push({
            code: "foreign-source",
            message: `${option.id} schedules ${callback.id}, whose source event is ${callback.sourceDecision.event}`,
          });
        }
      }
    }
  }
  return issues;
}

/** Checks that read the bounded enumeration of reachable states. */
function reachabilityIssues(pack: ContentPack, result: Enumeration): ContentIssue[] {
  const issues: ContentIssue[] = [];

  for (const refusal of result.refusals) {
    issues.push({
      code: "dead-end",
      message: `a reachable history is refused: ${refusal.reason}`,
      path: refusal.path,
    });
  }

  for (const [eventId, sets] of result.presented) {
    for (const ids of sets) {
      const count = ids.split(",").length;
      if (count < MIN_OPTIONS || count > MAX_OPTIONS) {
        issues.push({
          code: "option-count",
          message: `${eventId} was presented with ${count} option(s): ${ids}`,
        });
      }
    }
  }

  for (const event of pack.events.values()) {
    const sets = result.presented.get(event.id);
    if (!sets) {
      // The fallback is allowed to be unreachable: it exists for gaps the pack does not have.
      if (event.role !== "fallback") {
        issues.push({
          code: "unreachable-event",
          message: `${event.id} is never presented in any reachable history`,
        });
      }
      continue;
    }
    const selectable = new Set([...sets].flatMap((ids) => ids.split(",")));
    for (const option of event.options) {
      if (!selectable.has(option.id)) {
        issues.push({
          code: "unreachable-option",
          message: `${option.id} is never selectable in any reachable history`,
        });
      }
    }
  }

  for (const callback of pack.callbacks.values()) {
    const weeks = result.presentedWeeks.get(callback.sourceDecision.event);
    if (!weeks) {
      issues.push({
        code: "callback-never-scheduled",
        message: `${callback.id}: its source event ${callback.sourceDecision.event} is never presented`,
      });
      continue;
    }
    const lastSourceWeek = Math.max(...weeks);
    if (callback.window.latestWeek < lastSourceWeek) {
      issues.push({
        code: "callback-window-before-source",
        message: `${callback.id} closes in week ${callback.window.latestWeek} but its source event can be played in week ${lastSourceWeek}`,
      });
    }
  }

  // Every path to the end resolved every callback its histories scheduled, or it was refused above.
  for (const end of result.complete) {
    if (end.checkpoint.pendingCallbacks.length > 0) {
      issues.push({
        code: "callback-lost",
        message: `Prototype Complete reached with pending callbacks: ${end.checkpoint.pendingCallbacks.map((p) => p.callbackId).join(", ")}`,
        path: end.path,
      });
    }
  }
  return issues;
}

/** Required deliveries versus the weekly slots, for every callback and for each reachable set. */
function capacityIssues(pack: ContentPack, result: Enumeration): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const seen = new Set<string>();
  const check = (ids: string[], path?: string[]) => {
    const key = [...ids].sort().join(",");
    if (ids.length === 0 || seen.has(key)) return;
    seen.add(key);
    for (const violation of checkCallbackCapacity(pack, ids)) {
      issues.push({ code: "callback-capacity", message: violation.message, path });
    }
  };
  // Conservative: every callback pending at once from the first week of its window.
  check([...pack.callbacks.keys()]);
  // Each set of callbacks that is really pending together in some reachable state.
  for (const { checkpoint, path } of result.states.values()) {
    check(
      checkpoint.pendingCallbacks.map((p) => p.callbackId),
      path,
    );
  }
  return issues;
}

/**
 * Validate one loaded pack: static rules, a bounded enumeration of every reachable structural
 * state, and callback capacity. Never throws on a broken pack; a problem becomes an issue. The
 * loader has already rejected malformed or unresolved content, so this assumes a loaded pack.
 */
export function validateContentPack(pack: ContentPack): ValidationResult {
  const issues = staticIssues(pack);
  try {
    assertNoMetricConditions(pack);
  } catch (error) {
    issues.push({ code: "metric-condition", message: (error as Error).message });
    return { issues, summary: null, enumeration: null };
  }

  let result: Enumeration;
  try {
    result = enumerate(pack);
  } catch (error) {
    issues.push({ code: "enumeration-failed", message: (error as Error).message });
    return { issues, summary: null, enumeration: null };
  }
  issues.push(...reachabilityIssues(pack, result), ...capacityIssues(pack, result));

  const chains = new Set<string>();
  for (const event of pack.events.values()) if (event.chain) chains.add(event.chain);
  for (const callback of pack.callbacks.values()) chains.add(callback.chain);
  return {
    issues,
    enumeration: result,
    summary: {
      events: pack.events.size,
      chains: chains.size,
      callbacks: pack.callbacks.size,
      closures: pack.closures.size,
      states: result.states.size,
      transitions: result.transitions,
      completedEndings: result.complete.length,
      fallbackSubstitutions: result.substitutions.length,
    },
  };
}

/**
 * The shared-crisis requirement (SPEC section 23): over every reachable history the crisis keeps
 * 2-4 options and at least two different option sets are offered, so the divergence from earlier
 * history survives.
 */
export function crisisDivergenceIssues(result: Enumeration, crisisEventId: string): ContentIssue[] {
  const sets = result.presented.get(crisisEventId);
  if (!sets)
    return [{ code: "crisis-unreachable", message: `${crisisEventId} is never presented` }];
  const issues: ContentIssue[] = [];
  if (sets.size < 2) {
    issues.push({
      code: "crisis-no-divergence",
      message: `${crisisEventId} always offers the same options (${[...sets].join(" | ")})`,
    });
  }
  return issues;
}
