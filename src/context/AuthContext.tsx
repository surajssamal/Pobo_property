'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { Profile, UserRole } from '@/types/crm';
import { recordNewProfile } from '@/lib/leadsService';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isDemoUser: boolean;
  demoRole: UserRole | null;
  signIn: (email: string, password: string) => Promise<{ error?: string; profile?: Profile }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    role: UserRole
  ) => Promise<{ error?: string; user?: User }>;
  signOut: () => Promise<void>;
  enableDemoMode: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);
  const [demoRole, setDemoRole] = useState<UserRole | null>(null);

  // Fetch profile for user id
  const fetchUserProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        console.warn('Profile fetch notice:', error?.message);
        return null;
      }
      return data as Profile;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id).then((p) => {
          if (p) {
            setProfile(p);
          } else {
            // Fallback from metadata if trigger hasn't finished yet
            const meta = session.user.user_metadata;
            setProfile({
              id: session.user.id,
              full_name: meta?.full_name || session.user.email?.split('@')[0] || 'User',
              role: (meta?.role as UserRole) || 'area_ambassador',
              phone: meta?.phone || null,
            });
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        const p = await fetchUserProfile(newSession.user.id);
        if (p) {
          setProfile(p);
        } else {
          const meta = newSession.user.user_metadata;
          setProfile({
            id: newSession.user.id,
            full_name: meta?.full_name || newSession.user.email?.split('@')[0] || 'User',
            role: (meta?.role as UserRole) || 'area_ambassador',
            phone: meta?.phone || null,
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign In with Supabase Auth
  const signIn = async (email: string, password: string) => {
    setIsDemoUser(false);
    setDemoRole(null);

    if (!isSupabaseConfigured) {
      return { error: 'Supabase credentials are not configured in .env.local' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        let userProfile = await fetchUserProfile(data.user.id);
        if (!userProfile) {
          const meta = data.user.user_metadata;
          userProfile = {
            id: data.user.id,
            full_name: meta?.full_name || data.user.email?.split('@')[0] || 'User',
            role: (meta?.role as UserRole) || 'area_ambassador',
            phone: meta?.phone || null,
          };
        }
        setProfile(userProfile);
        return { profile: userProfile };
      }

      return { error: 'No user returned from login' };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Login failed' };
    }
  };

  // Sign Up with Supabase Auth + metadata
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    role: UserRole
  ) => {
    setIsDemoUser(false);
    setDemoRole(null);

    if (!isSupabaseConfigured) {
      return { error: 'Supabase credentials are not configured in .env.local' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
            phone: phone,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        const newProfile: Profile = {
          id: data.user.id,
          full_name: fullName,
          role: role,
          phone: phone,
        };

        // 1. Immediately record in local profile cache so it shows in Admin assignment list
        recordNewProfile(newProfile);
        setProfile(newProfile);

        // 2. Also attempt direct upsert into Supabase profiles
        try {
          await supabase.from('profiles').upsert([
            {
              id: data.user.id,
              full_name: fullName,
              role: role,
              phone: phone,
            },
          ]);
        } catch (e) {
          console.warn('Profile direct upsert note:', e);
        }

        // 3. Auto sign-in if session wasn't started
        try {
          await supabase.auth.signInWithPassword({ email, password });
        } catch {
          // Ignore if email confirmation is required
        }

        return { user: data.user };
      }

      return { error: 'Registration could not be completed' };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Registration failed' };
    }
  };

  // Sign Out
  const signOut = async () => {
    setIsDemoUser(false);
    setDemoRole(null);
    setUser(null);
    setProfile(null);
    setSession(null);
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('SignOut error:', e);
      }
    }
  };

  // Enable Demo / Sandbox bypass mode
  const enableDemoMode = (role: UserRole) => {
    setIsDemoUser(true);
    setDemoRole(role);
    setProfile({
      id: role === 'admin' ? '11111111-1111-1111-1111-111111111111' : '22222222-2222-2222-2222-222222222222',
      full_name: role === 'admin' ? 'Admin Vikramaditya (Demo)' : 'Ambassador Ananya (Demo)',
      role: role,
      phone: '+91 98200 12345',
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isDemoUser,
        demoRole,
        signIn,
        signUp,
        signOut,
        enableDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
