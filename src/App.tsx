"use client";

import { BrowserRouter as Router, Routes, Route, Navigate } from "@/lib/router-shim";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import HomePage from "@/views/Home";
import FuncionariosPage from "@/views/Funcionarios";
import ClientesPage from "@/views/Clientes";
import HistoricoPage from "@/views/Historico";
import RelatoriosPage from "@/views/Relatorios";
import UsuariosPage from "@/views/Usuarios";
import LoginPage from "@/views/Login";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !user.is_admin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/funcionarios" element={<ProtectedRoute><FuncionariosPage /></ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute><ClientesPage /></ProtectedRoute>} />
      <Route path="/historico" element={<ProtectedRoute adminOnly><HistoricoPage /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute adminOnly><RelatoriosPage /></ProtectedRoute>} />
      <Route path="/usuarios" element={<ProtectedRoute adminOnly><UsuariosPage /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
