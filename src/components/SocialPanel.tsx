import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../hooks/useProfile';

type FollowProfile = Profile & { isFollowing: boolean };

type Props = {
  user: User;
  profile: Profile;
};

export function SocialPanel({ user, profile }: Props) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<FollowProfile[]>([]);
  const [following, setFollowing] = useState<FollowProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .then(({ data }) => {
        const ids = new Set((data ?? []).map((f: { following_id: string }) => f.following_id));
        setFollowingIds(ids);

        if (ids.size === 0) { setFollowing([]); return; }
        supabase
          .from('profiles')
          .select('*')
          .in('id', [...ids])
          .then(({ data: profiles }) => {
            setFollowing((profiles ?? []).map(p => ({ ...p, isFollowing: true })));
          });
      });
  }, [user.id]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${search.trim()}%`)
      .neq('id', user.id)
      .limit(10);
    setResults((data ?? []).map(p => ({ ...p, isFollowing: followingIds.has(p.id) })));
    setSearching(false);
  };

  const toggleFollow = async (targetId: string) => {
    const isFollowing = followingIds.has(targetId);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
      setFollowingIds(prev => { const next = new Set(prev); next.delete(targetId); return next; });
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
      setFollowingIds(prev => new Set([...prev, targetId]));
    }
    setResults(prev => prev.map(p => p.id === targetId ? { ...p, isFollowing: !isFollowing } : p));
    setFollowing(prev => isFollowing ? prev.filter(p => p.id !== targetId) : prev);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color: 'var(--text)', marginBottom: 4 }}>
          Social
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your username: <span style={{ color: 'var(--green-light)', fontWeight: 700 }}>@{profile.username}</span></p>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by username..."
          style={{
            flex: 1,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '10px 12px',
            color: 'var(--text)',
            fontSize: 14,
            outline: 'none',
            fontFamily: 'var(--font-body)',
          }}
        />
        <button
          type="submit"
          disabled={searching}
          style={{
            background: 'linear-gradient(135deg, var(--green), var(--green-light))',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {searching ? '...' : 'Search'}
        </button>
      </form>

      {results.length > 0 && (
        <>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Results
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {results.map(p => (
              <UserRow key={p.id} profile={p} onToggleFollow={() => toggleFollow(p.id)} />
            ))}
          </div>
        </>
      )}

      <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        Following ({following.length})
      </h3>
      {following.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>You're not following anyone yet. Search for users above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {following.map(p => (
            <UserRow key={p.id} profile={p} onToggleFollow={() => toggleFollow(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({ profile, onToggleFollow }: { profile: FollowProfile; onToggleFollow: () => void }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '12px 14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>@{profile.username}</div>
      <button
        onClick={onToggleFollow}
        style={{
          background: profile.isFollowing ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, var(--green), var(--green-light))',
          color: profile.isFollowing ? 'var(--text-muted)' : '#fff',
          border: profile.isFollowing ? '1px solid var(--border)' : 'none',
          borderRadius: 8,
          padding: '6px 14px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {profile.isFollowing ? 'Unfollow' : 'Follow'}
      </button>
    </div>
  );
}
