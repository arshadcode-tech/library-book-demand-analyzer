import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { BookOpen, LayoutDashboard, Library, ArrowLeftRight, ChartNoAxesCombined, BrainCircuit, ShoppingCart, FileSpreadsheet, CircleHelp, Search, Bell, Menu, X, ChevronRight, LogOut } from 'lucide-react';
import { api } from '../services/api';

const nav = [
  ['/', 'Overview', LayoutDashboard],
  ['/books', 'Book Inventory', Library],
  ['/transactions', 'Issue & Return', ArrowLeftRight],
  ['/analytics', 'Data Analysis', ChartNoAxesCombined],
  ['/forecast', 'Demand Prediction', BrainCircuit],
  ['/recommendations', 'Purchase Planning', ShoppingCart],
  ['/reports', 'Reports & Import', FileSpreadsheet]
];

export default function Layout({ onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearchBusy(true);
      api(`/books?search=${encodeURIComponent(searchQuery)}&limit=10`)
        .then(res => {
          setSearchResults(res);
          setSearchBusy(false);
        })
        .catch(() => {
          setSearchResults([]);
          setSearchBusy(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--color-background)] font-sans text-slate-800">
      
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static top-0 left-0 h-full bg-white border-r border-slate-200 z-30 flex flex-col transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Brand */}
        <div className="h-16 flex items-center px-4 border-b border-slate-200 justify-between">
          <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <BookOpen size={18} />
            </div>
            {!collapsed && (
              <div className="flex flex-col justify-center">
                <span className="text-sm font-bold text-slate-900 leading-tight tracking-tight">Library Analytics</span>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Workspace</span>
              </div>
            )}
          </div>
          {/* Mobile close */}
          <button className="lg:hidden text-slate-500 p-1" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className={`px-4 pt-6 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider ${collapsed ? 'text-center' : ''}`}>
          {collapsed ? 'MENU' : 'MAIN NAVIGATION'}
        </div>
        <nav className="flex-1 overflow-y-auto px-3 flex flex-col gap-1">
          {nav.map(([to, label, Icon]) => (
            <NavLink 
              key={to} 
              to={to} 
              end={to === '/'} 
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              title={collapsed ? label : undefined}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                  {!collapsed && <span>{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom / Collapse toggle */}
        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={() => setCollapsed(!collapsed)} 
            className="hidden lg:flex items-center gap-3 w-full text-slate-500 hover:text-slate-800 transition-colors"
          >
            <div className="w-8 h-8 flex items-center justify-center shrink-0 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
              <ChevronRight size={18} className={`transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
            </div>
            {!collapsed && <span className="text-sm font-medium">Collapse Menu</span>}
          </button>
          {!collapsed && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <CircleHelp size={20} className="text-indigo-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800">Need Help?</p>
                <a href="#" className="text-[11px] text-indigo-600 font-medium hover:underline">Read the documentation</a>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F6F8FC]">
        
        {/* Topbar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-slate-600 p-2 -ml-2 rounded-lg hover:bg-slate-100" onClick={() => setMobileOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center text-sm font-medium text-slate-500">
              <span className="hover:text-slate-800 cursor-pointer">Dashboard</span>
              <ChevronRight size={14} className="mx-2 text-slate-300" />
              <span className="text-slate-900 font-bold">Workspace</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden md:flex items-center px-3 py-1.5 bg-slate-100 rounded-lg border border-transparent focus-within:bg-white focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all relative">
              <Search size={16} className="text-slate-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search catalog..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearch(true)}
                onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                className="bg-transparent border-none outline-none text-sm w-48 text-slate-700 placeholder:text-slate-400" 
              />
              
              {/* Search Dropdown */}
              {showSearch && searchQuery && (
                <div className="absolute top-full mt-2 left-0 w-80 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
                  <div className="max-h-80 overflow-y-auto p-2">
                    {searchBusy ? (
                      <div className="text-center p-4 text-sm text-slate-400">Searching...</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map(b => (
                        <Link 
                          key={b.id} 
                          to={`/books/${b.id}`} 
                          onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                          className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer"
                        >
                          <div className="w-8 h-10 shrink-0 bg-slate-100 rounded border border-slate-200 flex flex-col items-center justify-center overflow-hidden relative">
                            {b.image_url ? (
                              <img src={`http://localhost:8000${b.image_url}`} alt={b.title} className="w-full h-full object-cover absolute inset-0" />
                            ) : (
                              <BookOpen size={12} className="text-slate-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-slate-800 truncate">{b.title}</div>
                            <div className="text-xs text-slate-500 truncate">{b.author}</div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className={`text-xs font-bold ${b.available_copies > 0 ? 'text-green-600' : 'text-red-500'}`}>{b.available_copies > 0 ? 'Available' : 'Out'}</span>
                            <span className="text-[10px] text-slate-400">{b.available_copies}/{b.total_copies}</span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="text-center p-4 text-sm text-slate-400">No books found.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3 cursor-pointer group" onClick={onLogout} title="Sign Out">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-800 group-hover:text-red-600 transition-colors">Admin User</span>
                <span className="text-[10px] text-slate-500 font-bold tracking-wider flex items-center gap-1">
                  SIGN OUT
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 text-slate-600 group-hover:bg-red-50 group-hover:text-red-600 group-hover:border-red-200 flex items-center justify-center transition-all shadow-sm">
                <LogOut size={16} />
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </div>
        
      </main>
    </div>
  );
}
