import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

/** Page frame for every signed-in route. */
export default function AppShell() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-[1440px] px-[18px] pb-[70px] pt-6">
        <Outlet />
      </main>
    </div>
  );
}
