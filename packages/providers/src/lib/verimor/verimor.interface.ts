import sdk from 'verimor-node-sdk';

interface IInternalVerimorClientResponse {
  error?: unknown;
  id?: string;
}

export class VerimorClient implements IVerimorClient {
  private sdkSend: (
    payload: unknown
  ) => Promise<IInternalVerimorClientResponse>;
  constructor(
    public username: string,
    public password: string,
    public from?: string
  ) {
    this.sdkSend = sdk.createClient({ username, password, from }).send;
  }

  async send(payload: IVerimorPayload): Promise<IVerimorResponse> {
    const res = await this.sdkSend(payload);

    return res;
  }
}

interface IVerimorResponse {
  error?: unknown;
  id?: string;
}

interface IVerimorClient {
  username: string;
  password: string;
  send: (payload: IVerimorPayload) => Promise<IVerimorResponse>;
}

interface IVerimorPayload {
  /*
   * Your registered phone number or title. if null, default title from the system will be used.
   *
   */
  source_addr?: string;
  messages: IVerimorMessage[];
}

interface IVerimorMessage {
  /*
   * content of the message
   *
   */
  msg: string;
  /*
   * list of phone numbers to send the message, separated by comma
   * e.g. "905555555555,905555555556"
   */
  dest: string;
}
