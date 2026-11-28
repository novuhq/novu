import { createApp } from "./app";
import { NovuMCP } from "./server/NovuMCP";

export { NovuMCP };

const mcpHandler = NovuMCP.serve("/");

export default createApp((request, env, ctx) => mcpHandler.fetch(request, env, ctx));
