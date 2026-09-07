import { useUser } from '@clerk/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { RiCloseLine } from 'react-icons/ri';
import { useTelemetry } from '@/hooks/use-telemetry';
import { fetchSanity, SANITY_CDN_URL } from '@/utils/sanity';
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
  caption?: string;
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
  caption?: string;
  published: boolean;
  slug: string;
};

const CONSTANTS = {
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
    return `${SANITY_CDN_URL}/${assetId}-${dimensions}.${format}?w=400&h=300&fit=crop&auto=format`;
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
      caption: post.caption?.trim() || undefined,
      published: !!post.publishedAt && new Date(post.publishedAt) <= now,
      slug: post.slug?.current || '',
    }));
  };

  const fetchChangelogs = async (): Promise<Changelog[]> => {
    const query = `
      *[_type == "changelogPost"] | order(publishedAt desc, _createdAt desc) [0...10] {
        _id,
        _createdAt,
        _updatedAt,
        _type,
        title,
        slug,
        publishedAt,
        "caption": coalesce(
          caption,
          seo.description,
          pt::text(content[_type == "block" && style == "normal"][0..0]),
          pt::text(content[_type == "block"][0..0])
        ),
        cover {
          _type,
          asset {
            _ref,
            _type
          }
        }
      }
    `;

    try {
      const sanityPosts = await fetchSanity<SanityChangelogPost[]>(query);
      const transformedData = transformSanityData(sanityPosts ?? []);

      return filterChangelogs(transformedData, getDismissedChangelogs());
    } catch (error) {
      console.error('Failed to fetch changelogs from Sanity', error);

      return [];
    }
  };

  const { data: changelogs = [] } = useQuery({
    queryKey: CONSTANTS.QUERY_KEY,
    queryFn: fetchChangelogs,
    // Refetch every hour to ensure users see new changelogs
    staleTime: 60 * 60 * 1000,
    // Non-critical marketing content — never surface Sanity outages to users
    meta: { showError: false },
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
      const hasRenderableContent = Boolean(item.imageUrl || item.caption);

      return item.published && changelogDate >= cutoffDate && hasRenderableContent;
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
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [changelog.imageUrl]);

  const showImage = Boolean(changelog.imageUrl) && !hasImageError;
  const showCaption = !showImage && Boolean(changelog.caption);

  return (
    <motion.div
      key={changelog.id}
      className="border-stroke-soft rounded-8 group absolute flex h-[175px] w-full cursor-pointer flex-col overflow-hidden border bg-white p-3 shadow-xl shadow-black/10 transition-[height] duration-200 dark:border-white/10 dark:bg-black dark:shadow-white/5"
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
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="text-text-soft text-subheading-2xs">WHAT'S NEW</div>
        <button
          onClick={(e) => onDismiss(e, changelog)}
          className="absolute right-[-8px] top-[-8px] p-1 text-neutral-500 opacity-0 transition-opacity duration-200 hover:text-neutral-900 group-hover:opacity-100 dark:hover:text-white"
        >
          <RiCloseLine size={16} />
        </button>

        {showImage ? (
          <ChangelogImageContent
            title={changelog.title}
            imageUrl={changelog.imageUrl!}
            onImageError={() => setHasImageError(true)}
          />
        ) : showCaption ? (
          <ChangelogTextContent title={changelog.title} caption={changelog.caption!} />
        ) : (
          <h5 className="text-label-sm text-text-strong mt-0 line-clamp-2 dark:text-white">{changelog.title}</h5>
        )}
      </div>
    </motion.div>
  );
}

function ChangelogImageContent({
  title,
  imageUrl,
  onImageError,
}: {
  title: string;
  imageUrl: string;
  onImageError: () => void;
}) {
  return (
    <>
      <h5 className="text-label-sm text-text-strong mt-0 line-clamp-1 dark:text-white">{title}</h5>
      <div className="relative mt-2 h-[110px] w-full">
        <img
          src={imageUrl}
          alt={title}
          className="h-full w-full rounded-[6px] object-cover object-top"
          onError={onImageError}
        />
      </div>
    </>
  );
}

function ChangelogTextContent({ title, caption }: { title: string; caption: string }) {
  return (
    <div className="mt-1 flex min-h-0 flex-1 flex-col gap-1.5">
      <h5 className="text-label-sm text-text-strong line-clamp-2 dark:text-white">{title}</h5>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <p className="text-paragraph-xs text-text-soft line-clamp-4 leading-5">{caption}</p>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-white to-transparent dark:from-black"
        />
      </div>
    </div>
  );
}
