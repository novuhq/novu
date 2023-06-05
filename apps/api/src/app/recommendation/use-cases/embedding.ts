import { Vector } from '@pinecone-database/pinecone';
import { Pipeline } from '@xenova/transformers';
import { v4 as uuidv4 } from 'uuid';
//import { sliceIntoChunks } from './utils/util.js';

class Embedder {
  private pipe: Pipeline | null = null;

  // Initialize the pipeline
  async init() {
    const { pipeline } = await import('@xenova/transformers');
    this.pipe = await pipeline('embeddings', 'Xenova/all-MiniLM-L6-v2');
  }

  // Embed a single string
  async embed(text: string): Promise<Vector> {
    const result = this.pipe && (await this.pipe(text));

    return {
      id: uuidv4(),
      metadata: {
        text,
      },
      values: Array.from(result.data),
      // values: [],
    };
  }

  /*
   * Batch an array of string and embed each batch
   * Call onDoneBatch with the embeddings of each batch
   */

  /*
   * async embedBatch(texts: string[], batchSize: number, onDoneBatch: (embeddings: Vector[]) => void) {
   *   const batches = sliceIntoChunks<string>(texts, batchSize);
   *   for (const batch of batches) {
   *     const embeddings = await Promise.all(batch.map((text) => this.embed(text)));
   *     onDoneBatch(embeddings);
   *   }
   * }
   */
}

const embedder = new Embedder();

export { embedder };
