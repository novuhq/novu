import { anthropic } from '@ai-sdk/anthropic';
import { convertToModelMessages, streamText, type ToolSet } from 'ai';
import { buildRefundTools } from '../lib/toolkit';

export async function POST(req: Request) {
  const { messages } = await req.json();

  // In this monorepo the toolkit's types resolve its own `ai` devDependency, a different major than this app's;
  // comparing the two `ToolSet`s is "excessively deep" (TS2589). Customers' installs resolve one `ai`.
  const tools = (await buildRefundTools()) as unknown as ToolSet;

  const result = streamText({
    model: anthropic('claude-haiku-4-5'),
    system:
      'You are a helpful customer support agent for an e-commerce store. ' +
      'You can issue refunds on behalf of customers. ' +
      'When a refund is requested, confirm the order ID, amount, and reason before proceeding. ' +
      'After triggering a refund, the action requires human approval — inform the user.',
    messages: await convertToModelMessages(messages),
    tools,
  });

  return result.toUIMessageStreamResponse();
}
