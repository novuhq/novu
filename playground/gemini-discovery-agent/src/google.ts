import https from 'node:https';
import { GoogleAuth } from 'google-auth-library';
import { config } from './config.ts';

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

/**
 * POST JSON to a Google API as the ADC identity and return the response body.
 * Uses node:https because fetch aborts after 300 s without bytes, and a Deep Research report takes ~8 min.
 */
export async function googlePost(url: string, body: unknown, timeoutMs: number): Promise<string> {
  const token = await auth.getAccessToken();
  const payload = JSON.stringify(body);

  const { status, text } = await new Promise<{ status: number; text: string }>((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-goog-user-project': config.project,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString('utf8') }));
        res.on('error', reject);
      }
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`timed out after ${timeoutMs} ms: ${new URL(url).pathname}`)));
    req.on('error', reject);
    req.end(payload);
  });

  if (status < 200 || status >= 300) throw new Error(`HTTP ${status} from ${new URL(url).pathname}: ${text.slice(0, 500)}`);

  return text;
}

type GenerateResponse = { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }> };

/** Vertex AI Gemini generateContent; returns the answer text without thoughts. */
export async function generate(model: string, request: Record<string, unknown>, timeoutMs: number): Promise<string> {
  const { vertexLocation: location, project } = config;
  const host = location === 'global' ? 'aiplatform.googleapis.com' : `${location}-aiplatform.googleapis.com`;
  const url = `https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;

  const response: GenerateResponse = JSON.parse(await googlePost(url, request, timeoutMs));
  const text = (response.candidates?.[0]?.content?.parts ?? [])
    .filter((part) => !part.thought && part.text)
    .map((part) => part.text)
    .join('')
    .trim();
  if (!text) throw new Error(`${model} returned no text`);

  return text;
}
