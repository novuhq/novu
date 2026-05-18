export interface ILineSentMessagesResponse {
  sentMessages: Array<{
    id: string;
    quoteToken: string;
  }>;
}

export interface ILineFlexMessage {
  altText: string;
  contents: Record<string, unknown>;
}

export interface ILineImageMessage {
  originalContentUrl: string;
  previewImageUrl: string;
}

export interface ILineStickerMessage {
  packageId: string;
  stickerId: string;
}
