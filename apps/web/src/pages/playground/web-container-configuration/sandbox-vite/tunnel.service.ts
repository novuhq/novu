export const TUNNEL = `import ws from "ws";
import { NtfrTunnel } from "@novu/ntfr-client";

const TUNNEL_URL = "https://novu.sh/api/tunnels";

const tunnelService = () => {
  let tunnelClient: NtfrTunnel | null = null;

  async function connect(originUrl: URL): Promise<string> {
    const url = await requestTunnel(originUrl);
    const parsedUrl = new URL(url);
    await connectToTunnel(parsedUrl, originUrl);

    return url;
  }

  async function requestTunnel(originUrl: URL): Promise<string> {
    const response = await fetch(TUNNEL_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        authorization: "Bearer 12345",
      },
    });
    const { url } = await response.json();
    return url;
  }

  async function connectToTunnel(
    parsedUrl: URL,
    parsedOrigin: URL
  ): Promise<void> {
    tunnelClient = new NtfrTunnel(
      parsedUrl.host,
      parsedOrigin.host,
      false,
      {
        WebSocket: ws,
        connectionTimeout: 2000,
        maxRetries: 10,
      },
      { verbose: false }
    );

    await tunnelClient.connect();
  }

  return { connect };
};

const url = process.argv[2];
if (!url) {
  console.error("Please provide a URL as the first argument.");
  process.exit(1);
}

tunnelService()
  .connect(new URL(url))
  .then((responseUrl) => {
    console.log(responseUrl);
    return responseUrl;
  })
  .catch((error) => {
    console.error("Error connecting to tunnel:", error);
  });`;
