import { Outlet } from 'react-router-dom';

export default function Root() {
  return (
    <>
      <div className="relative min-h-dvh flex flex-col">
        <div className="sticky left-0 top-0 h-12 w-full bg-green-200">Header</div>
        <ul>
          <li>
            <a
              href="/legacy/"
              target="_self"
              className="text-blue-600 visited:text-purple-600 hover:border-current hover:border-b"
            >
              Go to the Web App
            </a>
          </li>
        </ul>

        <div className="pt-12">
          <Outlet />
        </div>
      </div>
    </>
  );
}
