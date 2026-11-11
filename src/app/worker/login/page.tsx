'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export default function WorkerLoginPage() {
  const router = useRouter();
  const { signIn, signUp, enableDemoMode, profile } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already logged in, redirect
  React.useEffect(() => {
    if (profile?.role === 'area_ambassador' || profile?.role === 'admin') {
      router.push('/worker');
    }
  }, [profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    if (mode === 'signin') {
      const res = await signIn(email.trim(), password);
      if (res.error) {
        setErrorMsg(res.error);
        setLoading(false);
        return;
      }

      router.push('/worker');
    } else {
      // Sign up as Area Ambassador
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name');
        setLoading(false);
        return;
      }

      const res = await signUp(
        email.trim(),
        password,
        fullName.trim(),
        phone.trim() || '',
        'area_ambassador'
      );

      if (res.error) {
        setErrorMsg(res.error);
        setLoading(false);
        return;
      }

      setSuccessMsg('Ambassador account created successfully! Signing in...');
      setTimeout(() => {
        router.push('/worker');
      }, 1000);
    }
    setLoading(false);
  };

  const handleDemoWorker = () => {
    enableDemoMode('area_ambassador');
    router.push('/worker');
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between selection:bg-emerald-200 selection:text-stone-900">
      {/* Background Image */}
      <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden">
        <Image
          src="/Background.png"
          alt="Natural architectural background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center filter brightness-[0.88] contrast-[1.05]"
        />
        <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-md" />
      </div>

      <Navigation />

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-8 sm:py-14 z-10 flex flex-col justify-center">
        <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden bg-white/95 text-stone-800">
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="text-center space-y-1.5 pb-4 border-b border-stone-200/80">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-800 text-white shadow-md mb-1">
              <Users className="w-6 h-6" />
            </div>
            <span className="block text-[11px] font-semibold text-emerald-800 uppercase tracking-widest">
              Field Operations
            </span>
            <h1 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">
              Area Ambassador Login
            </h1>
            <p className="text-xs text-stone-500">
              Sign in to view your assigned buyer leads, update site visits, and log callbacks.
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex p-1 rounded-xl bg-stone-100 my-4 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-white text-stone-900 font-semibold shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-white text-stone-900 font-semibold shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Join as Ambassador
            </button>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 uppercase mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ananya Deshmukh"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 hover:bg-white focus:bg-white text-xs rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-400 transition-all text-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 uppercase mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="tel"
                      placeholder="e.g. +91 98111 22334"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 hover:bg-white focus:bg-white text-xs rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-400 transition-all text-stone-900"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 uppercase mb-1">
                Ambassador Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="ambassador@poboestates.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 hover:bg-white focus:bg-white text-xs rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-400 transition-all text-stone-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50 hover:bg-white focus:bg-white text-xs rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-400 transition-all text-stone-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-medium text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to Supabase Auth...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In as Ambassador' : 'Create Ambassador Profile'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Bypass */}
          <div className="mt-5 pt-4 border-t border-stone-200/80 text-center space-y-3">
            <button
              type="button"
              onClick={handleDemoWorker}
              className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Instant Ambassador Demo (1-Click)</span>
            </button>

            <div className="flex items-center justify-center gap-1 text-xs text-stone-500">
              <span>Admin looking for control dashboard?</span>
              <Link
                href="/admin/login"
                className="font-semibold text-stone-800 hover:text-black underline"
              >
                Admin Login &rarr;
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
