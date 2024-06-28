import { FC } from 'react';

// TODO: consider props that may be universal for loading skeletons
export type LoadingDisplayComponent<TProps = object> = FC<TProps>;
export type LoadingDisplayProps<TProps = object> = { LoadingDisplay: LoadingDisplayComponent<TProps> };
export type WithLoadingSkeleton<T extends FC<any> = FC> = T & LoadingDisplayProps;
