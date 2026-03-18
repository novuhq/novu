import React from 'react';

type SaveFormContextValue = {
  saveForm: (options?: { forceSubmit?: boolean; onSuccess?: () => void }) => Promise<void>;
  saveFormDebounced: () => void;
};

export const SaveFormContext = React.createContext<SaveFormContextValue>({} as SaveFormContextValue);

export const useSaveForm = () => React.useContext(SaveFormContext);
