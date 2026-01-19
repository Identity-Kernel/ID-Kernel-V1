import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useKernel } from '../context/KernelContext';
import { formatDID, formatKarma } from '../lib/utils';
import { cn } from '../lib/utils';
import { 
  LayoutDashboard, Fingerprint, Zap, Bot, Vote, 
  Coins, Users, Terminal, Settings, LogOut, Menu, X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', shortcut: '1' },
  { path: '/identity', icon: Fingerprint, label: 'Identity', shortcut: '2' },
  { path: '/pulses', icon: Zap, label: 'Pulses', shortcut: '3' },
  { path: '/agents', icon: Bot, label: 'Agents', shortcut: '4' },
  { path: '/governance', icon: Vote, label: 'Governance', shortcut: '5' },
  { path: '/economy', icon: Coins, label: 'Economy', shortcut: '6' },
  { path: '/social', icon: Users, label: 'Social', shortcut: '7' },
  { path: '/ai', icon: Terminal, label: 'AI Terminal', shortcut: '8' },
];

export default function Layout({ children }) {
  const { identity, logout } = useKernel();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt + number for navigation
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (navItems[index]) {
          window.location.href = navItems[index].path;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "sidebar fixed lg:static z-50 h-screen",
        sidebarOpen && "open"
      )}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 border border-primary/30 flex items-center justify-center glow-primary">
                <Fingerprint className="w-4 h-4 text-primary" />
              </div>
              <span className="font-mono text-sm font-bold">KERNEL</span>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "nav-item",
                  location.pathname === item.path && "active"
                )}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              >
                <item.icon className="w-4 h-4" />
                <span className="flex-1 font-mono text-sm">{item.label}</span>
                <span className="kbd hidden lg:inline">{item.shortcut}</span>
              </Link>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <Link
            to="/settings"
            className={cn(
              "nav-item mb-2",
              location.pathname === '/settings' && "active"
            )}
            data-testid="nav-settings"
          >
            <Settings className="w-4 h-4" />
            <span className="font-mono text-sm">Settings</span>
          </Link>
          
          <Separator className="my-2" />
          
          <div className="px-2 py-2">
            <p className="text-xs text-muted-foreground truncate font-mono">
              {formatDID(identity?.did, 16)}
            </p>
            <p className="text-xs text-primary font-mono mt-1">
              Karma: {formatKarma(identity?.karma || 0)}
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSidebarOpen(true)}
            data-testid="mobile-menu-btn"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border border-primary/30 flex items-center justify-center">
              <Fingerprint className="w-3 h-3 text-primary" />
            </div>
            <span className="font-mono text-sm font-bold">KERNEL</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto main-content">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border p-3 text-center">
          <p className="text-xs text-muted-foreground font-mono">
            Identity Kernel v1.2 • Pure JS • IndexedDB • No Backend
          </p>
        </footer>
      </div>
    </div>
  );
}
