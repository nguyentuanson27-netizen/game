import type { ContentPack } from "../content/loader.ts";
import type { Checkpoint } from "../persistence/checkpoint.ts";

/**
 * Authored report lines for this week's committed decisions, in decision order. These are the
 * only consequence lines the report may print; hidden state is never described.
 */
export function reportLines(
  pack: ContentPack,
  checkpoint: Pick<Checkpoint, "weekDecisions">,
): string[] {
  const lines: string[] = [];
  for (const decision of checkpoint.weekDecisions) {
    const option = pack.events
      .get(decision.eventId)
      ?.options.find((o) => o.id === decision.optionId);
    if (option?.reportLine) lines.push(option.reportLine);
  }
  return lines;
}
