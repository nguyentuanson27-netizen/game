import type { ContentPack } from "../content/loader.ts";
import type { Checkpoint } from "../persistence/checkpoint.ts";

/**
 * Authored report lines for this week's committed decisions, in decision order, followed by the
 * authored closure text of every callback closed in this week's report. These are the only
 * consequence lines the report may print; hidden state is never described.
 */
export function reportLines(
  pack: ContentPack,
  checkpoint: Pick<Checkpoint, "weekDecisions"> &
    Partial<Pick<Checkpoint, "week" | "resolvedCallbacks">>,
): string[] {
  const lines: string[] = [];
  for (const decision of checkpoint.weekDecisions) {
    const option = pack.events
      .get(decision.eventId)
      ?.options.find((o) => o.id === decision.optionId);
    if (option?.reportLine) lines.push(option.reportLine);
  }
  for (const resolved of checkpoint.resolvedCallbacks ?? []) {
    if (resolved.week !== checkpoint.week) continue;
    const closure = pack.closures.get(resolved.resolvedBy);
    if (closure) lines.push(closure.reportText);
  }
  return lines;
}
