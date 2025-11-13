import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] useEffect - Starting session check');
    const checkSession = async () => {
      try {
        console.log('[AuthContext] Checking localStorage');
        const storedUser = localStorage.getItem('erp_user');
        const storedToken = localStorage.getItem('erp_token');
        console.log('[AuthContext] Stored user:', storedUser ? 'exists' : 'null');
        console.log('[AuthContext] Stored token:', storedToken ? 'exists' : 'null');

        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          setLoading(false);

          try {
            console.log('[AuthContext] Validating session in background');
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 2000)
            );

            const queryPromise = supabase
              .from('user_sessions')
              .select('*')
              .eq('token', storedToken)
              .gt('expires_at', new Date().toISOString())
              .maybeSingle();

            const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
            console.log('[AuthContext] Query result - data:', !!data, 'error:', error);

            if (!data || error) {
              console.log('[AuthContext] Session invalid, clearing storage');
              localStorage.removeItem('erp_user');
              localStorage.removeItem('erp_token');
              setUser(null);
            }
          } catch (dbError) {
            console.error('[AuthContext] Database error during session check:', dbError);
          }
        } else {
          console.log('[AuthContext] No stored credentials');
          setLoading(false);
        }
      } catch (err) {
        console.error('[AuthContext] Session verification error:', err);
        setUser(null);
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const signIn = async (login, password) => {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-login`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ login, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur de connexion');
    }

    localStorage.setItem('erp_user', JSON.stringify(data.user));
    localStorage.setItem('erp_token', data.token);
    setUser(data.user);

    return { user: data.user };
  };

  const signOut = async () => {
    const token = localStorage.getItem('erp_token');

    if (token && user) {
      await supabase
        .from('user_action_logs')
        .insert({
          employee_id: user.id,
          action_type: 'logout',
          module: 'auth',
          details: {},
          ip_address: null
        });

      await supabase
        .from('user_sessions')
        .delete()
        .eq('token', token);
    }

    localStorage.removeItem('erp_user');
    localStorage.removeItem('erp_token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
