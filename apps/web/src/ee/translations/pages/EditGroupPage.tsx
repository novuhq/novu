import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EditGroupSidebar } from '../components/EditGroupSidebar';

export function EditGroupPage() {
  const { identifier } = useParams();
  const navigate = useNavigate();

  const onClose = () => {
    navigate(`/translations/edit/${identifier}`);
  };
  const onGroupUpdated = (groupIdentifier: string) => {
    navigate(`/translations/edit/${groupIdentifier}`);
  };

  if (!identifier) {
    return null;
  }

  return <EditGroupSidebar open onGroupUpdated={onGroupUpdated} onClose={onClose} groupIdentifier={identifier} />;
}
