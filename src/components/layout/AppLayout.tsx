import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { format } from 'date-fns';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { ToastProvider } from '../ui/Toast';

export default function AppLayout() {
  const [competencia, setCompetencia] = useState(format(new Date(), 'yyyy-MM'));

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar competencia={competencia} onCompetenciaChange={setCompetencia} />
          <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
            <Outlet context={{ competencia, setCompetencia }} />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
