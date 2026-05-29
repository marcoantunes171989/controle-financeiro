import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Lancamentos from './pages/Lancamentos';
import ContasPagar from './pages/ContasPagar';
import ContasReceber from './pages/ContasReceber';
import Agendamento from './pages/Agendamento';
import Empresas from './pages/Empresas';
import Categorias from './pages/Categorias';
import Relatorios from './pages/Relatorios';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'lancamentos', element: <Lancamentos /> },
      { path: 'pagar', element: <ContasPagar /> },
      { path: 'receber', element: <ContasReceber /> },
      { path: 'agendamento', element: <Agendamento /> },
      { path: 'empresas', element: <Empresas /> },
      { path: 'categorias', element: <Categorias /> },
      { path: 'relatorios', element: <Relatorios /> },
    ],
  },
]);

export default function Router() {
  return <RouterProvider router={router} />;
}
