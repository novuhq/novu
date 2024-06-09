import LocalTunnelWrapper from "./tunnelWrapper.mjs";
import dotenv from "dotenv";

dotenv.config();

(async () => {
  if (
    process.env.PORT === undefined ||
    Number.isNaN(parseInt(process.env.PORT))
  ) {
    throw new Error(
      "POST environment variable value is required and should be a positive integer",
    );
  }

  if (
    process.env.TUNNEL_SUBDOMAIN === undefined ||
    process.env.TUNNEL_SUBDOMAIN === ""
  ) {
    throw new Error("TUNNEL_SUBDOMAIN environment variable value is required");
  }

  if (process.env.TUNNEL_HOST === undefined || process.env.TUNNEL_HOST === "") {
    throw new Error("TUNNEL_HOST environment variable value is required");
  }
  const port = parseInt(process.env.PORT);
  const wrapper = new LocalTunnelWrapper(
    port,
    process.env.TUNNEL_SUBDOMAIN,
    process.env.TUNNEL_HOST,
  );
  await wrapper.connect();
  console.log(wrapper.getUrl());
})();
