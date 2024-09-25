import { Outlet } from "react-router-dom";

export default function Root() {
  return (
    <>
      <div className="relative min-h-dvh">
        <div className="fixed left-0 top-0 h-12 w-full bg-green-200">
          Header
        </div>

        <div className="pt-12">
          <Outlet />
        </div>
      </div>
    </>
  );
}
