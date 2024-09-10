import { redirect } from '@remix-run/node';

// Redirects the base path to the workflows page
export function loader() {
  return redirect('/workflows');
}
