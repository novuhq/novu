import { Badge } from './primitives/badge';
import TruncatedText from './truncated-text';

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
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <>
        {firstTags.map((tag) => (
          <Badge key={tag} color="purple" size="md" variant="lighter" className="max-w-[8rem] shrink-0">
            <TruncatedText className="block max-w-full">{tag}</TruncatedText>
          </Badge>
        ))}
        {restTags.length > 0 && (
          <Badge color="gray" size="md" variant="lighter" className="shrink-0">
            +{restTags.length}
          </Badge>
        )}
      </>
    </div>
  );
};
