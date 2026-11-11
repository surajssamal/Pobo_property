'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Compass,
  Users,
  LayoutDashboard,
  Home,
  LogOut,
  User,
  LogIn
} from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const { profile, isDemoUser, signOut } = useAuth();

  const navItems = [
    {
      name: 'Customer Portal',
      href: '/',
      icon: Home,
    },
    {
      name: 'Admin Leads',
      href: '/admin',
      icon: LayoutDashboard,
      badge: 'Admin',
    },
    {
      name: 'Worker Portal',
      href: '/worker',
      icon: Users,
      badge: 'Ambassador',
    },
  ];

  return (
    <header className="w-full px-4 sm:px-8 lg:px-16 py-3.5 z-20 sticky top-0 backdrop-blur-md bg-stone-950/35 border-b border-white/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-2xl bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/50 text-emerald-800 transition-transform group-hover:scale-105">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <span className="text-lg font-serif font-bold tracking-tight text-white drop-shadow-md">
              POBO
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-light text-stone-300 tracking-widest uppercase">
              Estates CRM
            </span>
          </div>
        </Link>

        {/* View Switcher Pills */}
        <nav className="flex items-center gap-1 p-1 rounded-2xl bg-stone-900/60 backdrop-blur-lg border border-white/15 text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all ${
                  isActive
                    ? 'bg-white text-stone-900 shadow-md font-semibold'
                    : 'text-stone-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-700' : 'text-stone-400'}`} />
                <span className="hidden md:inline">{item.name}</span>
                <span className="md:hidden">
                  {item.href === '/' ? 'Home' : item.href === '/admin' ? 'Admin' : 'Worker'}
                </span>
                {item.badge && (
                  <span
                    className={`hidden lg:inline text-[9px] px-1.5 py-0.2 rounded font-mono ${
                      isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-white/10 text-stone-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Info: User status or Login options */}
        <div className="flex items-center gap-2 text-xs">
          {profile || isDemoUser ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white">
                <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px]">
                  {profile?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="text-left">
                  <span className="font-medium text-xs block leading-tight truncate max-w-[110px]">
                    {profile?.full_name?.split(' ')[0]}
                  </span>
                  <span className="text-[9px] text-emerald-300 block uppercase">
                    {profile?.role === 'admin' ? 'Admin' : 'Ambassador'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => signOut()}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-900/60 text-stone-300 hover:text-white border border-white/15 transition-all"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/admin/login"
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 hover:text-white border border-white/15 font-medium transition-all text-xs"
              >
                <LogIn className="w-3.5 h-3.5 text-stone-400" />
                <span>Admin Login</span>
              </Link>
              <Link
                href="/worker/login"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-800/90 hover:bg-emerald-700 text-white font-medium shadow transition-all text-xs"
              >
                <User className="w-3.5 h-3.5" />
                <span>Ambassador Login</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
