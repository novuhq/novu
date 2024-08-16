import { FC, ReactNode } from 'react';

export type FCWithChildren<P = unknown> = FC<P & { children?: ReactNode | undefined; className?: string | undefined }>;
