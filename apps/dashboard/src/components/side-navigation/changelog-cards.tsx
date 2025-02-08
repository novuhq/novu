import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RiCloseLine } from 'react-icons/ri';
import { useQuery } from '@tanstack/react-query';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { useUser } from '@clerk/clerk-react';

type Changelog = {
  id: string;
  date: string;
  title: string;
  notes?: string;
  version: number;
  imageUrl?: string;
  published: boolean;
};

declare global {
  interface UserUnsafeMetadata {
    dismissed_changelogs?: string[];
  }
}

const CONSTANTS = {
  CHANGELOG_API_URL: 'https://productlane.com/api/v1/changelogs/f13f1996-c9b0-4fea-8ee7-2c3faf6a832d',
  NUMBER_OF_CARDS: 3,
  CARD_OFFSET: 10,
  SCALE_FACTOR: 0.06,
  MAX_DISMISSED_IDS: 15,
  MONTHS_TO_SHOW: 2,
} as const;

export function ChangelogStack() {
  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const track = useTelemetry();
  const { user } = useUser();

  const getDismissedChangelogs = (): string[] => {
    return user?.unsafeMetadata?.dismissed_changelogs ?? [];
  };

  const updateDismissedChangelogs = async (changelogId: string) => {
    if (!user) return;

    const currentDismissed = getDismissedChangelogs();
    const updatedDismissed = [...currentDismissed, changelogId].slice(-CONSTANTS.MAX_DISMISSED_IDS);

    await user.update({
      unsafeMetadata: {
        ...user.unsafeMetadata,
        dismissed_changelogs: updatedDismissed,
      },
    });
  };

  const fetchChangelogs = async (): Promise<Changelog[]> => {
    const response = await fetch(CONSTANTS.CHANGELOG_API_URL);
    const rawData: Changelog[] = await response.json();

    return filterChangelogs(rawData, getDismissedChangelogs());
  };

  const { data: fetchedChangelogs } = useQuery({
    queryKey: ['changelogs'],
    queryFn: fetchChangelogs,
    // Refetch every hour to ensure users see new changelogs
    staleTime: 60 * 60 * 1000,
  });

  useEffect(() => {
    if (fetchedChangelogs) {
      setChangelogs(fetchedChangelogs);
    }
  }, [fetchedChangelogs]);

  const handleChangelogClick = async (changelog: Changelog) => {
    track(TelemetryEvent.CHANGELOG_ITEM_CLICKED, { title: changelog.title });
    window.open('https://roadmap.novu.co/changelog/' + changelog.id, '_blank');

    await updateDismissedChangelogs(changelog.id);
    setChangelogs((prev) => prev.filter((log) => log.id !== changelog.id));
  };

  const handleDismiss = async (e: React.MouseEvent, changelog: Changelog) => {
    e.stopPropagation();
    track(TelemetryEvent.CHANGELOG_ITEM_DISMISSED, { title: changelog.title });

    await updateDismissedChangelogs(changelog.id);
    setChangelogs((prev) => prev.filter((log) => log.id !== changelog.id));
  };

  if (!changelogs.length) {
    return null;
  }

  return (
    <div className="mb-2 w-full">
      <div className="m-full relative h-[175px]">
        {changelogs.map((changelog, index) => (
          <ChangelogCard
            key={changelog.id}
            changelog={changelog}
            index={index}
            totalCards={changelogs.length}
            onDismiss={handleDismiss}
            onClick={handleChangelogClick}
          />
        ))}
      </div>
    </div>
  );
}

function filterChangelogs(changelogs: Changelog[], dismissedIds: string[]): Changelog[] {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - CONSTANTS.MONTHS_TO_SHOW);

  return changelogs
    .filter((item) => {
      const changelogDate = new Date(item.date);
      return item.published && item.imageUrl && changelogDate >= cutoffDate;
    })
    .slice(0, CONSTANTS.NUMBER_OF_CARDS)
    .filter((item) => !dismissedIds.includes(item.id));
}

function ChangelogCard({
  changelog,
  index,
  totalCards,
  onDismiss,
  onClick,
}: {
  changelog: Changelog;
  index: number;
  totalCards: number;
  onDismiss: (e: React.MouseEvent, changelog: Changelog) => void;
  onClick: (changelog: Changelog) => void;
}) {
  return (
    <motion.div
      key={changelog.id}
      className="border-stroke-soft rounded-8 group absolute flex h-[175px] w-full cursor-pointer flex-col justify-between overflow-hidden border bg-white p-3 shadow-xl shadow-black/[0.1] transition-[height] duration-200 dark:border-white/[0.1] dark:bg-black dark:shadow-white/[0.05]"
      style={{ transformOrigin: 'top center' }}
      animate={{
        top: index * -CONSTANTS.CARD_OFFSET,
        scale: 1 - index * CONSTANTS.SCALE_FACTOR,
        zIndex: totalCards - index,
      }}
      whileHover={{
        scale: (1 - index * CONSTANTS.SCALE_FACTOR) * 1.01,
        y: -2,
        transition: { duration: 0.2, ease: 'easeOut' },
      }}
      onClick={() => onClick(changelog)}
    >
      <div>
        <div className="relative">
          <div className="text-text-soft text-subheading-2xs">WHAT'S NEW</div>
          <button
            onClick={(e) => onDismiss(e, changelog)}
            className="absolute right-[-8px] top-[-8px] p-1 text-neutral-500 opacity-0 transition-opacity duration-200 hover:text-neutral-900 group-hover:opacity-100 dark:hover:text-white"
          >
            <RiCloseLine size={16} />
          </button>
          <div className="mb-2 flex items-center justify-between">
            <h5 className="text-label-sm text-text-strong mt-0 line-clamp-1 dark:text-white">{changelog.title}</h5>
          </div>
          {changelog.imageUrl && (
            <div className="relative h-[110px] w-full">
              <img
                src={changelog.imageUrl}
                alt={changelog.title}
                className="h-full w-full rounded-[6px] object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
