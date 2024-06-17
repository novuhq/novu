import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../routes';
import { CreateGroupSidebar } from '../components/CreateGroupSidebar';

export function CreateGroupPage() {
  const navigate = useNavigate();

  const onClose = () => {
    navigate(ROUTES.HOME);
  };

  const onGroupCreated = (groupIdentifier: string) => {
    navigate(`/translations/edit/${groupIdentifier}`);
  };

  return <CreateGroupSidebar open onClose={onClose} onGroupCreated={onGroupCreated} />;
}
