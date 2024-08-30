interface IMessagePayload {
  type: string;
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// eslint-disable-next-line @typescript-eslint/naming-convention
declare interface Window {
  parentIFrame: {
    sendMessage: (payload: IMessagePayload) => void;
  };
  _env_: any;
}
