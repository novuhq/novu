import React from 'react';

type SaveFormContextValue = {
  saveForm: (options?: { forceSubmit?: boolean; onSuccess?: () => void }) => Promise<void>;
};

export const SaveFormContext = React.createContext<SaveFormContextValue>({} as SaveFormContextValue);

export const useSaveForm = () => React.useContext(SaveFormContext);
