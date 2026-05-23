import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../hooks/useProfile';

type FriendProfile = Profile & { isFollowing: boolean; members_known: number; best_score: number };

type Notification = {
  id: string;
  from_user_id: string;
  type: string;
  read: boolean;
  created_at: string;
  from_username?: string;
};

type Props = {
  user: User;
  profile: Profile;
  onNotificationsRead: () => void;
};

export function SocialPanel({ user, profile, onNotificationsRead }: Props) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<FriendProfile[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searching, setSearching] = useState(false);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load friends (people I follow)
    supabase.from('follows').select('following_id').eq('follower_id', user.id)
      .then(({ data }) => {
        const ids = new Set((data ?? []).map((f: { following_id: string }) => f.following_id));
        setFriendIds(ids);
        if (ids.size > 0) {
          supabase.from('profiles').select('*').in('id', [...ids])
            .then(({ data: profiles }) => {
              setFriends((profiles ?? []).map(p => ({ ...p, isFollowing: true })));
            });
        }
      });

    // Load unread notifications
    supabase.from('notifications').select('*').eq('user_id', user.id).eq('read', false).order('created_at', { ascending: false })
      .then(async ({ data: notifs }) => {
        if (!notifs || notifs.length === 0) return;
        const fromIds = [...new Set(notifs.map((n: Notification) => n.from_user_id))];
        const { data: notifProfiles } = await supabase.from('profiles').select('id, username').in('id', fromIds);
        const usernameMap = Object.fromEntries((notifProfiles ?? []).map((p: { id: string; username: string }) => [p.id, p.username]));
        setNotifications(notifs.map((n: Notification) => ({ ...n, from_username: usernameMap[n.from_user_id] ?? 'Someone' })));
        // Mark as read
        await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
        onNotificationsRead();
      });
  }, [user.id]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    const { data } = await supabase.from('profiles').select('*').ilike('username', `%${search.trim()}%`).neq('id', user.id).limit(10);
    setResults((data ?? []).map(p => ({ ...p, isFollowing: friendIds.has(p.id) })));
    setSearching(false);
  };

  const toggleFriend = async (targetId: string) => {
    const isFriend = friendIds.has(targetId);
    if (isFriend) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
      setFriendIds(prev => { const next = new Set(prev); next.delete(targetId); return next; });
      setFriends(prev => prev.filter(p => p.id !== targetId));
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
      setFriendIds(prev => new Set([...prev, targetId]));
      // Send notification to target
      await supabase.from('notifications').insert({ user_id: targetId, from_user_id: user.id, type: 'follow' });
      // Add to friends list
      const added = results.find(p => p.id === targetId);
      if (added) setFriends(prev => [...prev, { ...added, isFollowing: true }]);
    }
    setResults(prev => prev.map(p => p.id === targetId ? { ...p, isFollowing: !isFriend } : p));
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900, color: 'var(--text)', marginBottom: 4 }}>
          Friends
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your username: <span style={{ color: 'var(--green-light)', fontWeight: 700 }}>@{profile.username}</span></p>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            New
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.map(n => (
              <div key={n.id} style={{
                background: 'rgba(46,160,67,0.08)',
                border: '1px solid rgba(46,160,67,0.25)',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <div style={{ fontSize: 14, color: 'var(--text)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--green-light)' }}>@{n.from_username}</span> added you as a friend
                </div>
                {!friendIds.has(n.from_user_id) && (
                  <button
                    onClick={() => toggleFriend(n.from_user_id)}
                    style={{
                      background: 'linear-gradient(135deg, var(--green), var(--green-light))',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Add Back
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
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
        <button type="submit" disabled={searching} style={{
          background: 'linear-gradient(135deg, var(--green), var(--green-light))',
          color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>
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
              <UserRow key={p.id} profile={p} onToggle={() => toggleFriend(p.id)} />
            ))}
          </div>
        </>
      )}

      {/* Friends */}
      <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        Friends ({friends.length})
      </h3>
      {friends.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>You have no friends yet. Search for users above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {friends.map(p => (
            <UserRow key={p.id} profile={p} onToggle={() => toggleFriend(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({ profile, onToggle }: { profile: FriendProfile; onToggle: () => void }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>@{profile.username}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{profile.members_known ?? 0} members known</div>
      </div>
      <button
        onClick={onToggle}
        style={{
          background: profile.isFollowing ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, var(--green), var(--green-light))',
          color: profile.isFollowing ? 'var(--text-muted)' : '#fff',
          border: profile.isFollowing ? '1px solid var(--border)' : 'none',
          borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        {profile.isFollowing ? 'Remove Friend' : 'Add Friend'}
      </button>
    </div>
  );
}
