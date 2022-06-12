import { useContext, createContext, ReactNode } from 'react';

export type FieldArrayContextType = {
  fieldArrays: Record<string, any>;
};

const FieldArrayContext = createContext<FieldArrayContextType>({
  fieldArrays: {},
});

export const useFieldArrayContext = (): FieldArrayContextType => useContext(FieldArrayContext);

export const FieldArrayProvider = ({ children, ...data }: { children: ReactNode } & FieldArrayContextType) => (
  <FieldArrayContext.Provider value={data}>{children}</FieldArrayContext.Provider>
);
