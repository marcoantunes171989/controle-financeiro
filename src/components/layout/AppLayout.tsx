import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { ToastProvider } from '../ui/Toast';

export default function AppLayout() {
  const [competencia, setCompetencia] = useState(format(new Date(), 'yyyy-MM'));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar isOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            aria-hidden="true"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <Topbar
            competencia={competencia}
            onCompetenciaChange={setCompetencia}
            onMenuClick={() => setSidebarOpen((v) => !v)}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/30">
            <Outlet context={{ competencia, setCompetencia }} />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
