import { useState } from "react";
import type { PresentedEvent } from "../domain/presentation.ts";

interface EventCardProps {
  week: number;
  slot: number;
  slotCount: number;
  presented: PresentedEvent;
}

export function EventCard({ week, slot, slotCount, presented }: EventCardProps) {
  const { event, options, contextLines } = presented;
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <section className="card event" aria-labelledby="event-title">
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
            // T08 resumes the unanswered event; resolving a choice is T09.
            onClick={() => setNotice("Bản này chưa ghi nhận lựa chọn.")}
          >
            <span className="option__text">{option.text}</span>
            <span className="option__hint">{option.hint}</span>
          </button>
        ))}
      </fieldset>
      {notice ? (
        <p role="status" className="event__notice">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
