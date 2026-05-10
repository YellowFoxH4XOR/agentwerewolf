const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ── Playback hook ── */
function useGamePlayback(timeline, speed = 1) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const startRef = useRef(null);
  const timeRef = useRef(0);

  useEffect(() => {
    if (!playing) { startRef.current = null; return; }
    let raf;
    const tick = (now) => {
      if (!startRef.current) startRef.current = now;
      const elapsed = (now - startRef.current) * speed;
      const next = timeRef.current + elapsed;
      startRef.current = now;
      timeRef.current = next;
      setTime(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  const events = useMemo(() => timeline.filter(e => e.t <= time), [time, timeline]);
  const maxTime = timeline[timeline.length - 1]?.t || 0;
  const progress = maxTime > 0 ? Math.min(time / maxTime, 1) : 0;

  const seek = useCallback((t) => {
    timeRef.current = t;
    setTime(t);
    startRef.current = null;
  }, []);

  return { time, events, playing, setPlaying, progress, seek, maxTime };
}

/* ── Agent circle position ── */
function agentPosition(index, total, rx, ry) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return { x: rx * Math.cos(angle), y: ry * Math.sin(angle) };
}

/* ── Agent Card ── */
function AgentSeat({ agent, alive, speaking, voted, voteTarget, showRole, index, total, rx, ry }) {
  const pos = agentPosition(index, total, rx, ry);
  const dead = !alive;
  return (
    <div style={{
      position: 'absolute', left: '50%', top: '50%',
      transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
      transition: 'all 0.6s ease',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        opacity: dead ? 0.35 : 1,
        filter: dead ? 'grayscale(0.8)' : 'none',
        animation: speaking ? 'breathe 2s ease-in-out infinite' : dead ? 'none' : 'float 4s ease-in-out infinite',
        animationDelay: `${index * 0.3}s`,
        transition: 'all 0.5s ease',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: agent.grad,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#fff',
          border: speaking ? `3px solid ${agent.color}` : '3px solid transparent',
          boxShadow: speaking ? `0 0 20px ${agent.color}60` : 'none',
          transition: 'all 0.3s',
          position: 'relative',
        }}>
          {agent.name.charAt(0)}
          {dead && <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 28,
          }}>☠️</div>}
          {speaking && <div style={{
            position: 'absolute', top: -4, right: -4, width: 16, height: 16,
            borderRadius: '50%', background: '#22c55e',
            border: '2px solid var(--bg-deep)',
            animation: 'pulse 1s infinite',
          }}></div>}
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12,
          color: dead ? 'var(--text-muted)' : 'var(--text-primary)',
          textAlign: 'center', whiteSpace: 'nowrap',
        }}>{agent.name}</div>
        {showRole && (
          <div className="badge badge-role" style={{
            background: ROLE_COLORS[agent.role] + '20',
            color: ROLE_COLORS[agent.role],
          }}>{ROLE_ICONS[agent.role]} {agent.role}</div>
        )}
        {voted && !dead && (
          <div style={{
            fontSize: 10, color: 'var(--amber)', fontWeight: 600,
            animation: 'fadeIn 0.3s ease',
          }}>voted {voteTarget ? `→ ${voteTarget}` : '(abstain)'}</div>
        )}
      </div>
    </div>
  );
}

/* ── Phase badge in center ── */
function PhaseCenter({ phase, day, narration }) {
  const meta = PHASE_META[phase] || {};
  return (
    <div style={{
      position: 'absolute', left: '50%', top: '50%',
      transform: 'translate(-50%, -50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      animation: 'phaseReveal 0.6s ease',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 40 }}>{meta.icon || '🐺'}</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
        color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 1.5,
      }}>{meta.label || ''}</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 12,
        color: 'var(--text-muted)', letterSpacing: 1,
      }}>Day {day}</div>
      {narration && (
        <div style={{
          fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic',
          maxWidth: 200, animation: 'fadeIn 0.5s ease', marginTop: 4,
        }}>{narration}</div>
      )}
    </div>
  );
}

/* ── Event Feed ── */
function EventFeed({ events, agents }) {
  const feedRef = useRef(null);
  const displayEvents = events.filter(e => ['speech','announce','game_over','eliminate'].includes(e.type));

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [displayEvents.length]);

  return (
    <div ref={feedRef} style={{
      flex: 1, overflowY: 'auto', padding: '12px 16px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {displayEvents.map((ev, i) => {
        const agent = ev.agent ? agents.find(a => a.id === ev.agent) : null;
        if (ev.type === 'announce' || ev.type === 'game_over') {
          return (
            <div key={i} style={{
              padding: '8px 12px', borderRadius: 'var(--radius-sm)',
              background: ev.type === 'game_over' ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.03)',
              fontSize: 13, color: ev.type === 'game_over' ? '#4ade80' : 'var(--text-secondary)',
              fontWeight: ev.type === 'game_over' ? 600 : 400,
              textAlign: 'center', animation: 'fadeIn 0.4s ease',
              border: ev.type === 'game_over' ? '1px solid rgba(74,222,128,0.2)' : 'none',
            }}>{ev.content}</div>
          );
        }
        if (ev.type === 'eliminate') {
          const a = agents.find(a2 => a2.id === ev.agent);
          return (
            <div key={i} style={{
              padding: '6px 12px', borderRadius: 'var(--radius-sm)',
              background: 'rgba(239,68,68,0.08)', fontSize: 12,
              color: '#f87171', textAlign: 'center',
              animation: 'fadeIn 0.4s ease',
            }}>☠️ {a?.name || ev.agent} has been eliminated</div>
          );
        }
        if (ev.type === 'speech' && agent) {
          return (
            <div key={i} style={{
              display: 'flex', gap: 10, animation: 'slideInRight 0.4s ease',
              alignItems: 'flex-start',
            }}>
              <div className="avatar avatar-sm" style={{ background: agent.grad, marginTop: 2 }}>
                {agent.name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 600, fontSize: 12, color: agent.color,
                  marginBottom: 2, fontFamily: 'var(--font-display)',
                }}>{agent.name}</div>
                <div style={{
                  fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5,
                  background: 'rgba(255,255,255,0.03)', padding: '8px 12px',
                  borderRadius: '2px 12px 12px 12px',
                }}>{ev.content}</div>
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

/* ── Game Over Overlay ── */
function GameOverOverlay({ winner, nav }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(6,6,26,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)', zIndex: 10, animation: 'fadeIn 0.6s ease',
    }}>
      <div style={{ textAlign: 'center', animation: 'fadeInUp 0.8s ease' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{winner === 'villagers' ? '🏆' : '🐺'}</div>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28,
          letterSpacing: -0.5, marginBottom: 8,
        }}>{winner === 'villagers' ? 'Villagers Win!' : 'Werewolves Win!'}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
          All werewolves have been found and eliminated.
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn btn-md btn-secondary" onClick={() => nav('arena')}>Back to Arena</button>
          <button className="btn btn-md btn-primary" onClick={() => nav('replay', { gameId: 'g7831' })}>Watch Replay</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Game Arena ── */
function GameArena({ nav, gameId, speed = 1 }) {
  const { time, events, playing, setPlaying, progress, seek, maxTime } = useGamePlayback(GAME_TIMELINE, speed);
  const agents = GAME_AGENTS;

  // Derive state from events
  const eliminated = new Set();
  let currentPhase = 'night', currentDay = 1, lastNarration = null;
  const votes = {};
  let speakingAgent = null, gameOver = null;
  const lastSpeechTime = {};

  events.forEach(ev => {
    if (ev.type === 'phase') { currentPhase = ev.phase; currentDay = ev.day; Object.keys(votes).forEach(k => delete votes[k]); }
    if (ev.type === 'eliminate') eliminated.add(ev.agent);
    if (ev.type === 'narration') lastNarration = ev.content;
    if (ev.type === 'speech') { speakingAgent = ev.agent; lastSpeechTime[ev.agent] = ev.t; }
    if (ev.type === 'vote') votes[ev.agent] = ev.target;
    if (ev.type === 'game_over') gameOver = ev;
    if (ev.type === 'phase') lastNarration = null;
  });

  // Speaking = last speech was within 2.5s
  const recentSpeaker = speakingAgent && (time - (lastSpeechTime[speakingAgent] || 0)) < 2500 ? speakingAgent : null;

  const phaseBg = currentPhase === 'night' ? 'radial-gradient(ellipse at 50% 30%, #0e0e3a 0%, #06061a 100%)'
    : currentPhase === 'day_vote' ? 'radial-gradient(ellipse at 50% 30%, #1a1208 0%, #0a0806 100%)'
    : 'radial-gradient(ellipse at 50% 30%, #141208 0%, #0a0806 100%)';

  const showRoles = eliminated.size > 0 || !!gameOver;

  return (
    <div className="page" style={{
      display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)',
      background: phaseBg, transition: 'background 1.2s ease',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="badge badge-live">Live</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>
            Game #{gameId || '7831'}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            {PHASE_META[currentPhase]?.icon} {PHASE_META[currentPhase]?.label} · Day {currentDay}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>👁 127 watching</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {agents.length - eliminated.size}/{agents.length} alive
          </span>
        </div>
      </div>

      {/* Main area */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Circle area */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 420, height: 380 }}>
            {agents.map((agent, i) => (
              <AgentSeat key={agent.id} agent={agent} index={i} total={agents.length}
                rx={170} ry={150}
                alive={!eliminated.has(agent.id)}
                speaking={recentSpeaker === agent.id}
                voted={!!votes[agent.id] || votes[agent.id] === null}
                voteTarget={votes[agent.id] ? agents.find(a => a.id === votes[agent.id])?.name : null}
                showRole={eliminated.has(agent.id) || !!gameOver}
              />
            ))}
            <PhaseCenter phase={currentPhase} day={currentDay}
              narration={currentPhase === 'night' ? lastNarration : null} />
          </div>

          {/* Game over overlay */}
          {gameOver && <GameOverOverlay winner={gameOver.winner} nav={nav} />}
        </div>

        {/* Feed panel */}
        <div style={{
          width: 380, borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.15)',
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
            color: 'var(--text-secondary)',
          }}>Game Feed</div>
          <EventFeed events={events} agents={agents} />
        </div>
      </div>

      {/* Playback controls */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '10px 24px', borderTop: '1px solid var(--border)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <button className="btn btn-sm btn-ghost" onClick={() => setPlaying(!playing)}
          style={{ fontSize: 16, width: 32, height: 32, padding: 0 }}>
          {playing ? '⏸' : '▶'}
        </button>
        <div style={{
          flex: 1, height: 4, background: 'rgba(255,255,255,0.06)',
          borderRadius: 2, cursor: 'pointer', position: 'relative',
        }} onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          seek(pct * maxTime);
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: 'var(--accent)', width: `${progress * 100}%`,
            transition: 'width 0.1s linear',
          }}></div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', width: 60, textAlign: 'right' }}>
          {Math.floor(time/1000)}s / {Math.floor(maxTime/1000)}s
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{speed}×</span>
      </div>
    </div>
  );
}

/* ── Arena Lobby ── */
function ArenaLobby({ nav }) {
  return (
    <div className="page page-padded">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="section-header">Arena</h1>
          <p className="section-sub" style={{ margin: 0 }}>Watch AI agents deceive, debate, and destroy each other.</p>
        </div>
        <button className="btn btn-md btn-primary" onClick={() => nav('builder')}>+ Queue Agent</button>
      </div>

      {/* Live games */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span className="badge badge-live">Live</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Active Games</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {LOBBY_GAMES.filter(g => g.status === 'running').map(game => (
            <div key={game.id} className="card card-glow" style={{ cursor: 'pointer' }}
              onClick={() => nav('game', { gameId: game.id })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>
                  Game #{game.id.replace('g','')}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {PHASE_META[game.phase]?.icon} {PHASE_META[game.phase]?.label}
                </span>
              </div>
              <div style={{ display: 'flex', gap: -4, marginBottom: 12 }}>
                {game.agents.slice(0, 7).map((name, i) => {
                  const lb = LEADERBOARD_AGENTS.find(a => a.name === name);
                  return (
                    <div key={i} className="avatar avatar-sm" style={{
                      background: lb?.color || '#555', marginLeft: i > 0 ? -6 : 0,
                      border: '2px solid var(--bg-card)', zIndex: 7 - i,
                    }}>{name.charAt(0)}</div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Day {game.day} · {game.alive} alive</span>
                <span>👁 {game.spectators}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Completed */}
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Recent Games</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {LOBBY_GAMES.filter(g => g.status === 'completed').map(game => (
            <div key={game.id} className="card" style={{ cursor: 'pointer', opacity: 0.7 }}
              onClick={() => nav('replay', { gameId: game.id })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>
                  Game #{game.id.replace('g','')}
                </span>
                <span className="badge badge-completed">
                  {game.winner === 'villagers' ? '🏘️ Villagers' : '🐺 Wolves'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: -4, marginBottom: 12 }}>
                {game.agents.slice(0, 7).map((name, i) => {
                  const lb = LEADERBOARD_AGENTS.find(a => a.name === name);
                  return (
                    <div key={i} className="avatar avatar-sm" style={{
                      background: lb?.color || '#555', marginLeft: i > 0 ? -6 : 0,
                      border: '2px solid var(--bg-card)', zIndex: 7 - i,
                    }}>{name.charAt(0)}</div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                <span>{game.day} rounds · {game.alive} survived</span>
                <span>👁 {game.spectators}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GameArena, ArenaLobby });
