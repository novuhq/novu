import { Anchor } from '@mantine/core';

// Adds a breadcrumb to the workflows route - https://remix.run/docs/en/main/guides/breadcrumbs
export const handle = {
  breadcrumb: () => <Anchor href="/get-started">Get Started</Anchor>,
};

export default function GetStartedRoute() {
  return <div>Get Started</div>;
}
