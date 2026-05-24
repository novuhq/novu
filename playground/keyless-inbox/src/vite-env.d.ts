/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NOVU_BACKEND_URL?: string;
  readonly VITE_NOVU_SOCKET_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
