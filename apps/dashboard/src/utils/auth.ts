declare namespace Clerk {
  export const session: {
    getToken: () => Promise<string | null>;
  };
}

export async function getToken(): Promise<string> {
  return (await Clerk.session?.getToken()) || '';
}
