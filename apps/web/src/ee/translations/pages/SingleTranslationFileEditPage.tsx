import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SingleTranslationFileEditSidebar } from '../components/UploadFilesSection/SingleTranslationFileEditSidebar';

export function SingleTranslationFileEditPage() {
  const { identifier } = useParams();
  const navigate = useNavigate();

  const onClose = () => {
    navigate(`/translations/edit/${identifier}`);
  };

  if (!identifier) {
    return null;
  }

  return <SingleTranslationFileEditSidebar open onClose={onClose} identifier={identifier} />;
}
