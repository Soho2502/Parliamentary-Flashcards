import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Profile = {
  id: string;
  username: string;
  created_at: string;
};

export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setProfile(null); setLoading(false); return; }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data ?? null);
        setLoading(false);
      });
  }, [user]);

  const createProfile = async (username: string) => {
    if (!user) return { error: 'Not logged in' };
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: user.id, username: username.trim() })
      .select()
      .single();
    if (!error && data) setProfile(data);
    return { error: error?.message ?? null };
  };

  return { profile, loading, createProfile };
}
