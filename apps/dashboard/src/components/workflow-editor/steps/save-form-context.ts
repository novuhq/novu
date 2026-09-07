import React from 'react';

type SaveFormContextValue = {
  saveForm: (options?: { forceSubmit?: boolean; onSuccess?: () => void }) => Promise<void>;
  saveFormDebounced: () => void;
  onBlur?: React.FocusEventHandler<HTMLFormElement>;
};

export const SaveFormContext = React.createContext<SaveFormContextValue>({} as SaveFormContextValue);

export const useSaveForm = () => React.useContext(SaveFormContext);
