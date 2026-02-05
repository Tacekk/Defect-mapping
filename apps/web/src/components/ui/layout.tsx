import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ClipboardCheck,
  Settings,
  BarChart3,
  LogOut,
  Menu,
  X,
  Globe,
  History,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { useAuthStore } from '@/stores/authStore';
import { Role } from '@glass-inspector/shared';

export function Layout() {
  const { t, i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'cs' ? 'en' : 'cs';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const navItems = [
    {
      to: '/inspection',
      icon: ClipboardCheck,
      label: t('nav.inspection'),
      roles: [Role.ADMIN, Role.INSPECTOR, Role.QUALITY],
    },
    {
      to: '/my-sessions',
      icon: History,
      label: t('nav.mySessions'),
      roles: [Role.ADMIN, Role.INSPECTOR, Role.QUALITY],
    },
    {
      to: '/board',
      icon: BarChart3,
      label: t('nav.board'),
      roles: [Role.ADMIN, Role.QUALITY],
    },
    {
      to: '/admin',
      icon: Settings,
      label: t('nav.admin'),
      roles: [Role.ADMIN],
    },
  ];

  const filteredNavItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role as Role) : false
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <NavLink to="/" className="mr-6 flex items-center space-x-2">
              <span className="font-bold text-xl">{t('common.appName')}</span>
            </NavLink>
          </div>

          <nav className="hidden md:flex flex-1 items-center space-x-6">
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLanguage}
              title={i18n.language === 'cs' ? 'English' : 'Cestina'}
            >
              <Globe className="h-5 w-5" />
            </Button>

            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {user?.name}
              </span>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden border-t">
            <nav className="container py-4 flex flex-col gap-2">
              {filteredNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              ))}
              <div className="border-t my-2" />
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm text-muted-foreground">
                  {user?.name}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('auth.logout')}
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="container py-6">
        <Outlet />
      </main>
    </div>
  );
}
