interface IMessagePayload {
  type: string;
  [key: string]: any;
}

declare interface Window {
  parentIFrame: {
    sendMessage: (payload: IMessagePayload) => void;
  };
}
