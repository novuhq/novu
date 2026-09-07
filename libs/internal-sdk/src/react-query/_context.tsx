
import React from "react";

import { NovuCore } from "../core.js";

const NovuContext = React.createContext<NovuCore | null>(null);

export function NovuProvider(props: { client: NovuCore, children: React.ReactNode }): React.ReactNode { 
  return (
    <NovuContext.Provider value={props.client}>
      {props.children}
    </NovuContext.Provider>
  );
}

export function useNovuContext(): NovuCore { 
  const value = React.useContext(NovuContext);
  if (value === null) {
    throw new Error("SDK not initialized. Create an instance of NovuCore and pass it to <NovuProvider />.");
  }
  return value;
}
