import { Tag } from '@/components/primitives/tag';

type WorkflowTagsProps = {
  tags: string[];
};

export const WorkflowTags = (props: WorkflowTagsProps) => {
  const { tags } = props;

  const sliceFactor = 3;
  let firstTags: string[] = [];
  let restTags: string[] = [];
  if (tags.length > sliceFactor) {
    firstTags = tags.slice(0, sliceFactor - 1);
    restTags = tags.slice(sliceFactor - 1);
  } else {
    firstTags = tags;
  }

  return (
    <div className="flex items-center gap-1">
      <>
        {firstTags.map((tag) => (
          <Tag key={tag} variant={'feature'}>
            {tag}
          </Tag>
        ))}
        {restTags.length > 0 && <Tag>+{restTags.length}</Tag>}
      </>
    </div>
  );
};
