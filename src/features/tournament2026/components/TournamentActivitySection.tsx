import { useMemo, useState } from 'react';
import { buildTournamentActivityTimeline } from '../activity';
import type { TournamentActivityCategory } from '../activity';
import type {
  FixtureView,
  TournamentActivityRow,
} from '../../../services/tournament2026Queries';
import { track2026 } from '../../../utils/analytics';
import { CollapsibleSection, StatusCard } from './Layout';

const DEFAULT_VISIBLE_EVENT_COUNT = 20;

export function TournamentActivitySection({
  activity,
  fixtures,
}: {
  activity: TournamentActivityRow[];
  fixtures: FixtureView[];
}) {
  const [isShowingAll, setIsShowingAll] = useState(false);
  const events = useMemo(
    () => buildTournamentActivityTimeline({ activity, fixtures }),
    [activity, fixtures]
  );
  const visibleEvents = isShowingAll
    ? events
    : events.slice(0, DEFAULT_VISIBLE_EVENT_COUNT);
  const hiddenEventCount = Math.max(events.length - visibleEvents.length, 0);

  const toggleShowAll = () => {
    const nextIsShowingAll = !isShowingAll;

    setIsShowingAll(nextIsShowingAll);
    track2026('tournament_activity_view_toggled', {
      is_showing_all: nextIsShowingAll,
      event_count: events.length,
    });
  };

  return (
    <CollapsibleSection
      title="Tournament Activity"
      eyebrow="Full event feed"
      description="Score saves, corrections, clears, setup changes, finalization, and inferred match starts or finishes."
      meta={`${events.length} events`}
      className="border-y sm:-mx-4"
    >
      {events.length === 0 ? (
        <div className="px-3 pb-3 sm:px-4">
          <StatusCard>No tournament activity yet. Saved scores and setup changes will appear here.</StatusCard>
        </div>
      ) : (
        <div>
          <div>
            {visibleEvents.map((event) => {
              const categoryClassName = getCategoryClassName(event.category);

              return (
                <article key={event.id} className="border-t border-[#27272A] px-3 py-3 first:border-t-0 sm:px-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`border px-2 py-1 text-[10px] tracking-[0.14em] ${categoryClassName}`}>
                          {formatCategory(event.category)}
                        </span>
                        <h3 className="text-sm font-bold tracking-[0.02em] text-[#FAFAFA]">
                          {event.title}
                        </h3>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[#A1A1AA]">{event.detail}</p>
                      {event.actorLabel ? (
                        <p className="mt-1 text-[10px] tracking-[0.12em] text-[#8B949E]">
                          By {event.actorLabel}
                        </p>
                      ) : null}
                    </div>
                    <time
                      dateTime={event.occurredAt}
                      className="font-data text-[10px] tracking-[0.16em] text-[#8B949E]"
                    >
                      {formatActivityTime(event.occurredAt)}
                    </time>
                  </div>
                </article>
              );
            })}
          </div>

          {events.length > DEFAULT_VISIBLE_EVENT_COUNT ? (
            <button
              type="button"
              onClick={toggleShowAll}
              className="m-3 min-h-[44px] rounded-md border border-[#27272A] px-3 py-2 font-data text-xs font-bold tracking-[0.14em] text-[#E6EDF3]"
            >
              {isShowingAll ? 'Show latest only' : `Show all ${events.length} events (${hiddenEventCount} older)`}
            </button>
          ) : null}
        </div>
      )}
    </CollapsibleSection>
  );
}

function formatCategory(category: TournamentActivityCategory): string {
  switch (category) {
    case 'score':
      return 'Score';
    case 'match':
      return 'Match';
    case 'setup':
      return 'Setup';
    case 'course':
      return 'Course';
    case 'profile':
      return 'Profile';
    case 'finalization':
      return 'Final';
    default: {
      const exhaustiveCheck: never = category;
      return exhaustiveCheck;
    }
  }
}

function getCategoryClassName(category: TournamentActivityCategory): string {
  switch (category) {
    case 'score':
      return 'border-[#3FB950] text-[#3FB950]';
    case 'match':
      return 'border-[#58A6FF] text-[#58A6FF]';
    case 'setup':
      return 'border-[#A371F7] text-[#A371F7]';
    case 'course':
      return 'border-[#F59E0B] text-[#F59E0B]';
    case 'profile':
      return 'border-[#8B949E] text-[#A1A1AA]';
    case 'finalization':
      return 'border-[#F2B84B] text-[#F2B84B]';
    default: {
      const exhaustiveCheck: never = category;
      return exhaustiveCheck;
    }
  }
}

function formatActivityTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}
