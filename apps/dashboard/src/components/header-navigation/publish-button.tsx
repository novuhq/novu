import { RiGitPullRequestFill, RiUploadLine } from 'react-icons/ri';
import { Button } from '../primitives/button';

export const PublishButton = () => {
  const handlePublish = () => {
    // TODO: Implement publish functionality
    console.log('Publish clicked');
  };

  return (
    <Button
      variant="secondary"
      className="h-[26px]"
      mode="outline"
      size="2xs"
      leadingIcon={RiGitPullRequestFill}
      onClick={handlePublish}
    >
      Publish changes
    </Button>
  );
};
