export type RequiredProp<T, K extends keyof T> = T & { [P in K]-?: T[P] };
