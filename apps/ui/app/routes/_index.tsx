import { redirect } from '@remix-run/node';

// Redirects to the workflows page
export function loader() {
  return redirect('/workflows');
}
