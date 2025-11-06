import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar, 
  Store, 
  Bell, 
  User, 
  LogOut, 
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Calendar },
    { name: 'Marketplace', href: '/marketplace', icon: Store },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600">
      {/* Navigation */}
      <nav className="glass-card border-0 border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  SlotSwapper
                </h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                        isActive
                          ? 'bg-white/20 text-white shadow-lg'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* User Menu */}
            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6 space-x-4">
                <div className="text-white/90 text-sm">
                  Welcome, <span className="font-semibold">{user?.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={toggleMobileMenu}
                className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all duration-200"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/20">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-3 py-2 rounded-lg text-base font-medium transition-all duration-200 flex items-center space-x-3 ${
                      isActive
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
              
              {/* Mobile User Info */}
              <div className="border-t border-white/20 pt-4 mt-4">
                <div className="px-3 py-2 text-white/90 text-sm">
                  Logged in as <span className="font-semibold">{user?.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200 flex items-center space-x-3"
                >
                  <LogOut size={20} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white/60 text-sm">
            <p>&copy; 2024 SlotSwapper. Built for ServiceHive Technical Challenge.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;