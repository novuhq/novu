import LocalTunnelWrapper from "./tunnelWrapper.mjs";
import dotenv from "dotenv";

dotenv.config();

(async () => {
  if (
    process.env.PORT === undefined ||
    Number.isNaN(parseInt(process.env.PORT))
  ) {
    throw new Error("port value is required and should be a positive integer");
  }

  if (process.env.SUBDOMAIN === undefined || process.env.SUBDOMAIN === "") {
    throw new Error("subdomain value is required");
  }
  const port = parseInt(process.env.PORT);
  const wrapper = new LocalTunnelWrapper(port, process.env.SUBDOMAIN);
  await wrapper.connect();
  console.log(wrapper.getUrl());
})();
