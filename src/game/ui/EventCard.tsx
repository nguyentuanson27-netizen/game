import { useState } from "react";
import type { EventOption } from "../content/schema.ts";
import type { PresentedEvent } from "../domain/presentation.ts";
import { ConfirmDialog } from "./ConfirmDialog.tsx";

interface EventCardProps {
  week: number;
  slot: number;
  slotCount: number;
  presented: PresentedEvent;
  /** True while a choice is being saved: every option is disabled so a tap cannot repeat. */
  busy: boolean;
  /** Set when the last tap could not be saved; nothing was recorded. */
  error: string | null;
  onChoose: (optionId: string) => void;
}

export function EventCard({
  week,
  slot,
  slotCount,
  presented,
  busy,
  error,
  onChoose,
}: EventCardProps) {
  const { event, options, contextLines } = presented;
  // Only options the content marks as major irreversible ask first; everything else commits on tap.
  const [confirming, setConfirming] = useState<EventOption | null>(null);

  return (
    <section className="card event" aria-labelledby="event-title" aria-busy={busy}>
      <p className="event__meta">
        Tuần {week} · Quyết định {slot}/{slotCount}
      </p>
      <h2 id="event-title" className="card__title">
        {event.title}
      </h2>
      <p className="event__why">{event.whyNow}</p>
      <p>{event.situation}</p>
      {contextLines.map((line) => (
        <p key={line} className="event__context">
          {line}
        </p>
      ))}
      <fieldset className="options">
        <legend className="visually-hidden">Phương án</legend>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="button option"
            disabled={busy}
            onClick={() =>
              option.confirmation === "required" ? setConfirming(option) : onChoose(option.id)
            }
          >
            <span className="option__text">{option.text}</span>
            <span className="option__hint">{option.hint}</span>
          </button>
        ))}
      </fieldset>
      {confirming ? (
        <ConfirmDialog
          action={confirming.text}
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            const id = confirming.id;
            setConfirming(null);
            onChoose(id);
          }}
        />
      ) : null}
      {error ? (
        <p role="alert" className="event__error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
