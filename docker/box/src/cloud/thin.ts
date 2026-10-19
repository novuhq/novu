import { authorize } from '../shared/auth.ts';

interface Env {
  readonly BOX: DurableObjectNamespace;
  readonly BOX_NAME: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname.startsWith('/__box/') && !(await authorize(request)))
      return new Response(
        "needs `Authorization: Bearer <GitHub token>` with push access to novuhq/novu, or the Novu Box workflow's OIDC token\n",
        { status: 401 }
      );

    return env.BOX.get(env.BOX.idFromName(env.BOX_NAME)).fetch(request);
  },
};
