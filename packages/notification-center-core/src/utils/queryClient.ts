import { QueryClient } from '@tanstack/query-core';

const queryClient = new QueryClient();
queryClient.mount();

export default queryClient;
