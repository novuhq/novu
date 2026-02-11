import { useUser } from '@clerk/clerk-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { RiCloseLine } from 'react-icons/ri';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';

type SanityAsset = {
  _ref: string;
  _type: 'reference';
};

type SanityChangelogPost = {
  _id: string;
  _createdAt: string;
  _updatedAt: string;
  _type: 'changelogPost';
  title: string;
  slug: {
    _type: 'slug';
    current: string;
  };
  publishedAt: string;
  cover?: {
    _type: 'image';
    asset: SanityAsset;
  };
};

type Changelog = {
  id: string;
  date: string;
  title: string;
  version: number;
  imageUrl?: string;
  published: boolean;
  slug: string;
};

const CONSTANTS = {
  SANITY_API_URL: 'https://w2rl2099.api.sanity.io/v2025-02-19/data/query/production',
  SANITY_CDN_URL: 'https://cdn.sanity.io/images/w2rl2099/production',
  NUMBER_OF_CARDS: 3,
  CARD_OFFSET: 10,
  SCALE_FACTOR: 0.06,
  MAX_DISMISSED_IDS: 15,
  MONTHS_TO_SHOW: 2,
  QUERY_KEY: ['changelogs'],
} as const;

export function ChangelogStack() {
  const track = useTelemetry();
  const { user } = useUser();
  const queryClient = useQueryClient();

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

    // Update the cache with the new dismissed IDs
    queryClient.setQueryData(CONSTANTS.QUERY_KEY, (oldData: Changelog[] | undefined) => {
      if (!oldData) return [];
      return filterChangelogs(oldData, updatedDismissed);
    });
  };

  // Helper function to convert Sanity asset reference to image URL
  const getImageUrl = (asset?: SanityAsset): string | undefined => {
    if (!asset?._ref) return undefined;

    // Sanity asset reference format: image-{assetId}-{width}x{height}-{format}
    // Example: "image-fd1082e513db9f6ebdfaa3a8f90a9a43b2d44462-2096x1080-gif"
    const ref = asset._ref;

    // Extract the asset ID and format - assetId can be any characters up to the next dash
    const match = ref.match(/^image-([^-]+)-(\d+x\d+)-(\w+)$/);
    if (!match) {
      console.warn('Invalid Sanity asset reference format:', ref);
      return undefined;
    }

    const [, assetId, dimensions, format] = match;

    // Use Sanity's CDN URL format with the constant
    return `${CONSTANTS.SANITY_CDN_URL}/${assetId}-${dimensions}.${format}?w=400&h=300&fit=crop&auto=format`;
  };

  // Transform Sanity data to our internal format
  const transformSanityData = (sanityPosts: SanityChangelogPost[]): Changelog[] => {
    const now = new Date();
    return sanityPosts.map((post, index) => ({
      id: post._id,
      date: post.publishedAt || post._createdAt,
      title: post.title,
      version: index + 1, // Since Sanity doesn't have version numbers, we'll use index
      imageUrl: getImageUrl(post.cover?.asset),
      published: !!post.publishedAt && new Date(post.publishedAt) <= now,
      slug: post.slug?.current || '',
    }));
  };

  const fetchChangelogs = async (): Promise<Changelog[]> => {
    // Build Sanity query to get published changelog posts with covers, sorted by publishedAt
    const query = encodeURIComponent(`
      *[_type == "changelogPost" && defined(cover.asset)] | order(publishedAt desc, _createdAt desc) [0...10] {
        _id,
        _createdAt,
        _updatedAt,
        _type,
        title,
        slug,
        publishedAt,
        cover {
          _type,
          asset {
            _ref,
            _type
          }
        }
      }
    `);

    const url = `${CONSTANTS.SANITY_API_URL}?query=${query}&perspective=published`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch changelogs from Sanity');
    }

    const data = await response.json();
    const sanityPosts: SanityChangelogPost[] = data.result || [];

    const transformedData = transformSanityData(sanityPosts);
    return filterChangelogs(transformedData, getDismissedChangelogs());
  };

  const { data: changelogs = [] } = useQuery({
    queryKey: CONSTANTS.QUERY_KEY,
    queryFn: fetchChangelogs,
    // Refetch every hour to ensure users see new changelogs
    staleTime: 60 * 60 * 1000,
  });

  const handleChangelogClick = async (changelog: Changelog) => {
    track(TelemetryEvent.CHANGELOG_ITEM_CLICKED, { title: changelog.title });
    window.open(`https://novu.co/changelog/${changelog.slug}`, '_blank', 'noopener,noreferrer');

    await updateDismissedChangelogs(changelog.id);
  };

  const handleDismiss = async (e: React.MouseEvent, changelog: Changelog) => {
    e.stopPropagation();
    track(TelemetryEvent.CHANGELOG_ITEM_DISMISSED, { title: changelog.title });

    await updateDismissedChangelogs(changelog.id);
  };

  if (!changelogs.length) {
    return null;
  }

  return (
    <div className="mb-2 w-full mt-2">
      <div className="w-full relative h-[175px]">
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
      className="border-stroke-soft rounded-8 group absolute flex h-[175px] w-full cursor-pointer flex-col justify-between overflow-hidden border bg-white p-3 shadow-xl shadow-black/10 transition-[height] duration-200 dark:border-white/10 dark:bg-black dark:shadow-white/5"
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
                className="h-full w-full rounded-[6px] object-cover object-top"
                onError={(e) => {
                  // Hide image if it fails to load
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
