import { useParams } from 'react-router-dom';
import { NewLayoutDrawer } from './new-layout-drawer';

export function DuplicateLayoutPage() {
  const { layoutId } = useParams<{
    layoutId: string;
  }>();

  return <NewLayoutDrawer mode="duplicate" layoutId={layoutId} />;
}
