import { FC } from 'react';

export type FCBase<P = unknown> = FC<P & { className?: string | undefined }>;
