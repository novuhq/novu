import React from 'react';

type SaveFormContextValue = {
  saveForm: (forceSubmit?: boolean) => Promise<void>;
};

export const SaveFormContext = React.createContext<SaveFormContextValue>({} as SaveFormContextValue);

export const useSaveForm = () => React.useContext(SaveFormContext);
