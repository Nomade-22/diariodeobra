'use client';

import { Link, useLocation, useNavigate } from '@/lib/router-shim';
import {
  ClipboardList,
  Users,
  Building2,
  History,
  Menu,
  X,
  HardHat,
  UserCog,
  LogOut,
  Loader2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function Layout({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
    if (!isLoading && user && adminOnly && !user.is_admin) {
      navigate('/');
    }
  }, [isLoading, user, adminOnly, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const navItems = [
    { path: '/', label: 'Novo Registro', icon: ClipboardList, adminOnly: false },
    { path: '/historico', label: 'Histórico', icon: History, adminOnly: true },
    { path: '/funcionarios', label: 'Funcionários', icon: Users, adminOnly: false },
    { path: '/clientes', label: 'Clientes', icon: Building2, adminOnly: false },
    { path: '/usuarios', label: 'Usuários', icon: UserCog, adminOnly: true },
  ];

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || user?.is_admin);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-xl border-b border-primary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner border border-white/10">
                <HardHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Diário de Obra</h1>
                <p className="text-xs text-white/60">Controle de atividades</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-white/20 text-white font-medium shadow-sm'
                        : 'text-white/75 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User info & Logout (Desktop) */}
            <div className="hidden md:flex items-center gap-3">
              {user && (
                <span className="text-sm text-white/70">
                  {user.nome || user.username}
                  {user.is_admin && (
                    <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">Admin</span>
                  )}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-white/75 hover:text-white hover:bg-white/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-white/10 pb-4 bg-primary/50 backdrop-blur-sm">
            <div className="px-4 pt-2 space-y-1">
              {/* User info (Mobile) */}
              {user && (
                <div className="px-4 py-3 border-b border-white/10 mb-2">
                  <p className="text-white font-medium">{user.nome || user.username}</p>
                  {user.is_admin && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                      Administrador
                    </span>
                  )}
                </div>
              )}

              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-white/20 text-white font-medium'
                        : 'text-white/75 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Logout (Mobile) */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left text-white/75 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                <LogOut className="w-5 h-5" />
                <span>Sair</span>
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
