import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, Role } from '../types';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  activeClubId: string | null;
  isViewOnly: boolean;
  setActiveClubId: (id: string | null) => void;
  setIsViewOnly: (viewOnly: boolean) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  activeClubId: null,
  isViewOnly: false,
  setActiveClubId: () => {},
  setIsViewOnly: () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeClubId, setActiveClubIdState] = useState<string | null>(localStorage.getItem('promesas_active_club'));
  const [isViewOnly, setIsViewOnlyState] = useState<boolean>(localStorage.getItem('promesas_view_only') === 'true');

  const setActiveClubId = (id: string | null) => {
    if (id) {
      localStorage.setItem('promesas_active_club', id);
    } else {
      localStorage.removeItem('promesas_active_club');
    }
    setActiveClubIdState(id);
  };

  const setIsViewOnly = (viewOnly: boolean) => {
    localStorage.setItem('promesas_view_only', viewOnly.toString());
    setIsViewOnlyState(viewOnly);
  };

  useEffect(() => {
    // Escuchar cambios de autenticación
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error.message);
      }
      
      if (data) {
        const userProfile = data as UserProfile;
        setProfile(userProfile);
        
        // Si no hay un activeClubId previo o no es superadmin, usar el del perfil
        if (userProfile.rol !== 'superadmin') {
          setActiveClubId(userProfile.club_id || null);
          setIsViewOnly(false); // No view only for regular users
        } else if (!activeClubId && userProfile.club_id) {
          setActiveClubId(userProfile.club_id || null);
        }
      } else {
        console.warn(`No se encontró perfil para el usuario: ${userId}. No se aplicará fallback de rol.`);
        setProfile(null);
      }
    } catch (err) {
      console.error('Error crítico en fetchProfile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('promesas_active_club');
    localStorage.removeItem('promesas_view_only');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      session, 
      loading, 
      activeClubId, 
      isViewOnly,
      setActiveClubId, 
      setIsViewOnly,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
