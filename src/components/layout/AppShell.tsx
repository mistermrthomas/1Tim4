import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';
import './AppShell.css';

export function AppShell() {
  return (
    <div className="app-shell">
      <SideNav />
      <div className="app-shell__main">
        <Outlet />
        <BottomNav />
      </div>
    </div>
  );
}
