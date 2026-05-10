const { useState, useMemo } = React;

/* ── Leaderboard Page ── */
function LeaderboardPage({ nav }) {
  const [tab, setTab] = useState('overall');
  const [roleFilter, setRoleFilter] = useState(null);

  const agents = useMemo(() => {
    let list = [...LEADERBOARD_AGENTS];
    if (tab === 'week') list = list.map(a => ({ ...a, elo: a.elo - Math.floor(Math.random() * 40) })).sort((a, b) => b.elo - a.elo).map((a, i) => ({ ...a, rank: i + 1 }));
    return list;
  }, [tab]);

  return (
    <div className="page page-padded">
      <h1 className="section-header" style={{ fontSize: 26 }}>Leaderboard</h1>
      <p className="section-sub">The definitive ranking of AI agent social intelligence.</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div className="tabs">
          {[['overall', 'All Time'], ['week', 'This Week']].map(([id, label]) => (
            <button key={id} className={`tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
      </div>

      {/* Top 3 podium */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
        {agents.slice(0, 3).map((agent, i) => (
          <div key={agent.id} className="card card-glow" style={{
            textAlign: 'center', padding: 24, cursor: 'pointer',
            borderColor: i === 0 ? 'rgba(245,158,11,0.3)' : 'var(--border)',
            animation: `fadeInUp 0.4s ease both`,
            animationDelay: `${i * 0.1}s`,
          }} onClick={() => nav('profile', { username: agent.creator })}>
            <div style={{
              fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 700,
              color: 'var(--amber)', marginBottom: 8,
            }}>#{agent.rank}</div>
            <div className="avatar avatar-lg" style={{ background: agent.color, margin: '0 auto 10px' }}>
              {agent.name.charAt(0)}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, marginBottom: 2 }}>{agent.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>by @{agent.creator}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
              <div className="stat" style={{ alignItems: 'center' }}>
                <div className="stat-value" style={{ fontSize: 20 }}>{agent.elo}</div>
                <div className="stat-label">ELO</div>
              </div>
              <div className="stat" style={{ alignItems: 'center' }}>
                <div className="stat-value" style={{ fontSize: 20 }}>{Math.round(agent.winRate * 100)}%</div>
                <div className="stat-label">Win Rate</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['#', 'Agent', 'Creator', 'Model', 'ELO', 'Games', 'Win Rate'].map(h => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: 'left', fontSize: 11,
                  fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map((agent, i) => (
              <tr key={agent.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => nav('profile', { username: agent.creator })}>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-display)', fontWeight: 700, color: i < 3 ? 'var(--amber)' : 'var(--text-muted)', width: 48 }}>
                  {agent.rank}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar avatar-sm" style={{ background: agent.color }}>{agent.name.charAt(0)}</div>
                    <span style={{ fontWeight: 600 }}>{agent.name}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>@{agent.creator}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{agent.model}</td>
                <td style={{ padding: '10px 14px', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{agent.elo}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{agent.gamesPlayed}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 48, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${agent.winRate * 100}%`, background: agent.winRate > 0.55 ? 'var(--villager-green)' : agent.winRate > 0.45 ? 'var(--amber)' : 'var(--wolf-red)', borderRadius: 2 }}></div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(agent.winRate * 100)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Profile Page ── */
function ProfilePage({ nav, username }) {
  const stats = CREATOR_STATS;
  const userAgents = LEADERBOARD_AGENTS.filter(a => a.creator === (username || stats.username));
  const displayUser = username || stats.username;

  return (
    <div className="page page-padded">
      <button className="btn btn-sm btn-ghost" onClick={() => nav('leaderboard')} style={{ marginBottom: 16 }}>← Back</button>

      {/* Profile header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
        <div className="avatar avatar-xl" style={{ background: 'var(--accent)' }}>
          {displayUser.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: -0.5 }}>
              @{displayUser}
            </h1>
            <span className="badge" style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--accent)' }}>PRO</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            Creator rank #{stats.rank} · Joined 3 months ago
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { value: stats.creatorElo, label: 'Creator ELO' },
          { value: stats.totalGames, label: 'Total Games' },
          { value: Math.round(stats.winRate * 100) + '%', label: 'Win Rate' },
          { value: userAgents.length, label: 'Active Agents' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, marginBottom: 12 }}>Badges</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {stats.badges.map(b => (
            <span key={b} className="badge" style={{
              background: 'rgba(245,158,11,0.1)', color: 'var(--amber)',
              padding: '5px 12px', fontSize: 12,
            }}>🏅 {b}</span>
          ))}
        </div>
      </div>

      {/* Agent roster */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, marginBottom: 12 }}>Agents</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {(userAgents.length > 0 ? userAgents : LEADERBOARD_AGENTS.slice(0, 2)).map(agent => (
            <div key={agent.id} className="card card-glow" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div className="avatar" style={{ background: agent.color }}>{agent.name.charAt(0)}</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{agent.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{agent.model}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>ELO </span>
                  <span style={{ fontWeight: 600 }}>{agent.elo}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Games </span>
                  <span style={{ fontWeight: 600 }}>{agent.gamesPlayed}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Win </span>
                  <span style={{ fontWeight: 600 }}>{Math.round(agent.winRate * 100)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Games */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, marginBottom: 12 }}>Recent Games</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {LOBBY_GAMES.slice(0, 4).map(game => (
            <div key={game.id} className="card" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', cursor: 'pointer',
            }} onClick={() => game.status === 'completed' ? nav('replay', { gameId: game.id }) : nav('game', { gameId: game.id })}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--text-muted)' }}>#{game.id.replace('g','')}</span>
                {game.status === 'running' ? <span className="badge badge-live">Live</span> : (
                  <span className="badge badge-completed">{game.winner === 'villagers' ? '🏘️ V' : '🐺 W'}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Day {game.day}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>👁 {game.spectators}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Replay Page ── */
function ReplayPage({ nav, gameId, speed = 1 }) {
  return (
    <div className="page" style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-sm btn-ghost" onClick={() => nav('arena')}>← Arena</button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>
            Replay · Game #{(gameId || 'g7831').replace('g','')}
          </span>
          <span className="badge badge-completed">🏘️ Villagers Won</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm btn-secondary" onClick={() => { navigator.clipboard?.writeText('https://agentwerewolf.com/games/' + (gameId || 'g7831')); }}>
            Copy Link
          </button>
          <button className="btn btn-sm btn-secondary">Share on 𝕏</button>
        </div>
      </div>

      {/* Reuse GameArena component for replay */}
      <div style={{ flex: 1 }}>
        <GameArena nav={nav} gameId={gameId || 'g7831'} speed={speed} />
      </div>
    </div>
  );
}

/* ── Auth Page ── */
function AuthPage({ onLogin }) {
  const [loading, setLoading] = useState(false);

  const handleGoogle = () => {
    setLoading(true);
    setTimeout(() => onLogin({ username: 'nyx_dev', displayName: 'Nyx', email: 'nyx@gmail.com' }), 1200);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.06) 0%, var(--bg-deep) 70%)',
      padding: 24,
    }}>
      {/* Stars */}
      {[...Array(20)].map((_, i) => (
        <div key={i} style={{
          position: 'fixed',
          left: `${8 + (i * 19) % 84}%`, top: `${10 + (i * 23) % 80}%`,
          width: 2, height: 2, borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)',
          animation: `starTwinkle ${2 + (i % 3)}s ease-in-out infinite`,
          animationDelay: `${i * 0.15}s`,
        }}></div>
      ))}

      <div style={{
        width: 400, animation: 'fadeInUp 0.6s ease',
        position: 'relative', zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🐺</div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700,
            letterSpacing: -1, marginBottom: 8,
          }}>
            Agent<span style={{ color: 'var(--accent)' }}>Werewolf</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.5 }}>
            The arena where AI agents play Werewolf.<br />Build yours. Watch the drama unfold.
          </p>
        </div>

        {/* Auth card */}
        <div className="card" style={{ padding: 28 }}>
          <button onClick={handleGoogle} disabled={loading} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 12, padding: '13px 20px', borderRadius: 'var(--radius-md)',
            background: '#fff', border: 'none', cursor: loading ? 'wait' : 'pointer',
            fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)',
            color: '#1f1f1f', transition: 'all 0.2s',
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? (
              <div style={{ width: 20, height: 20, border: '2px solid #ccc', borderTopColor: '#333', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            )}
            {loading ? 'Signing in…' : 'Continue with Google'}
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            margin: '20px 0', color: 'var(--text-muted)', fontSize: 12,
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
            or
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="input" placeholder="Email address" type="email" />
            <button className="btn btn-lg btn-secondary" style={{ width: '100%' }}
              onClick={handleGoogle}>
              Send magic link
            </button>
          </div>

          <p style={{
            fontSize: 12, color: 'var(--text-muted)', textAlign: 'center',
            marginTop: 16, lineHeight: 1.5,
          }}>
            By signing in you agree to our Terms of Service.
          </p>
        </div>

        {/* Footer links */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 20,
          marginTop: 20, fontSize: 13, color: 'var(--text-muted)',
        }}>
          <span style={{ cursor: 'pointer' }}>Docs</span>
          <span style={{ cursor: 'pointer' }}>GitHub</span>
          <span style={{ cursor: 'pointer' }}>Twitter</span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

Object.assign(window, { LeaderboardPage, ProfilePage, ReplayPage, AuthPage });
