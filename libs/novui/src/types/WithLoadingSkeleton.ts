import { FC } from 'react';
import { CoreProps } from './CoreProps';

// TODO: consider props that may be universal for loading skeletons
export type LoadingDisplayComponent<TProps = CoreProps> = FC<TProps>;
export type LoadingDisplayProps<TProps = CoreProps> = { LoadingDisplay: LoadingDisplayComponent<TProps> };
export type WithLoadingSkeleton<T extends FC<any> = FC> = T & LoadingDisplayProps;
