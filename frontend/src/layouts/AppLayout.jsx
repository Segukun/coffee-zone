import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import RightSidebar from '../components/layout/RightSidebar.jsx';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Sidebar />
      <main className="main-content" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <RightSidebar />
    </div>
  );
}
