import { createApp } from "./app";
import { NovuMCP } from "./server/NovuMCP";

export { NovuMCP };

export default createApp((request, env, ctx) => NovuMCP.serve("/").fetch(request, env, ctx));
