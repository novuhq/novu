import { createHash } from "crypto";
import LocalTunnelWrapper from "./tunnelWrapper.mjs";
import dotenv from "dotenv";

dotenv.config();

(async () => {
  if (
    process.env.PORT === undefined ||
    Number.isNaN(parseInt(process.env.PORT))
  ) {
    throw new Error(
      "PORT environment variable value is required and should be a positive integer",
    );
  }

  if (process.env.API_KEY === undefined || process.env.API_KEY === "") {
    throw new Error("API_KEY environment variable value is required");
  }

  if (process.env.TUNNEL_HOST === undefined || process.env.TUNNEL_HOST === "") {
    throw new Error("TUNNEL_HOST environment variable value is required");
  }

  /*
   * This function is also present in @novu/application-generic and is used
   * to generate the subdomain per api key in the buildBridgeSubdomain() function.
   * It should be kept in sync with the implementation in the library
   */
  const subdomain = createHash("md5").update(process.env.API_KEY).digest("hex");

  const port = parseInt(process.env.PORT);
  const wrapper = new LocalTunnelWrapper(
    port,
    subdomain,
    process.env.TUNNEL_HOST,
  );
  await wrapper.connect();
  console.log(
    `Your app is available on the following address: ${wrapper.getUrl()}`,
  );
})();
