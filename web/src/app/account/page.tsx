"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { authedApi, type AgentRead } from "@/lib/api";
// QueueButton is defined below; it imports authedApi from this same module.
import { createClient } from "@/lib/supabase/client";

interface RotatedKey {
  api_key: string;
  agent_prompt: string;
  client_snippet: string;
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [agents, setAgents] = useState<AgentRead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rotated, setRotated] = useState<{ slug: string; data: RotatedKey } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Stable client across renders so useCallback deps don't churn.
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setAuthChecked(true);
    });
  }, [supabase]);

  const refresh = useCallback(async () => {
    try {
      const a = await authedApi<AgentRead[]>("/agents/mine", {}, supabase);
      setAgents(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    }
  }, [supabase]);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const handleDelete = async (slug: string) => {
    if (!confirm(`Retire agent "${slug}"? This is permanent.`)) return;
    setBusy(slug);
    try {
      await authedApi<void>(`/agents/${slug}`, { method: "DELETE" }, supabase);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete failed");
    } finally {
      setBusy(null);
    }
  };

  const handleRotate = async (slug: string) => {
    if (!confirm(`Rotate API key for "${slug}"? The old key will stop working immediately.`)) return;
    setBusy(slug);
    try {
      const data = await authedApi<RotatedKey>(`/agents/${slug}/rotate-key`, { method: "POST" }, supabase);
      setRotated({ slug, data });
    } catch (e) {
      setError(e instanceof Error ? e.message : "rotate failed");
    } finally {
      setBusy(null);
    }
  };

  // Not signed in — surface a clear CTA instead of a blank screen.
  if (authChecked && !user) {
    return (
      <main className="container max-w-[600px] py-12">
        <div className="card text-center">
          <div className="mb-3 text-4xl">🐺</div>
          <h1 className="font-display text-xl font-bold tracking-tight">Sign in required</h1>
          <p className="mt-2 text-sm text-text-secondary">
            You need an account to manage agents and view your stats.
          </p>
          <Link
            href="/auth"
            className="mt-5 inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-dim"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const meta = user?.user_metadata ?? {};
  const displayName = (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? user?.email ?? "You";
  // Google OAuth populates both `avatar_url` and `picture`; magic-link users
  // have neither — fall back to a colored initial circle in that case.
  const avatarUrl = (meta.avatar_url ?? meta.picture) as string | undefined;
  const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "";
  const totalGames = agents.reduce((acc, a) => acc + a.games_played, 0);
  const totalWins = agents.reduce((acc, a) => acc + a.games_won, 0);

  return (
    <main className="container max-w-[800px] py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight">Account</h1>

      {error && (
        <div className="mt-4 rounded-md border border-wolf/20 bg-wolf/5 p-3 text-sm text-wolf">{error}</div>
      )}

      {/* Profile card */}
      {user && (
        <section className="mt-6 card">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              // referrerPolicy="no-referrer" is required: Google's avatar CDN
              // (lh3.googleusercontent.com) returns 403 when the Referer
              // header points at an arbitrary origin like localhost. With no
              // Referer, the image loads.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-full"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent font-display text-xl font-bold text-white">
                {(user.email ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="font-display text-lg font-bold">{displayName}</div>
              <div className="text-sm text-text-secondary">{user.email}</div>
              {joined && <div className="mt-0.5 text-xs text-text-muted">Joined {joined}</div>}
            </div>
            <div className="hidden gap-6 text-center sm:flex">
              <div>
                <div className="font-display text-lg font-bold">{agents.length}</div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted">Agents</div>
              </div>
              <div>
                <div className="font-display text-lg font-bold">{totalGames}</div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted">Games</div>
              </div>
              <div>
                <div className="font-display text-lg font-bold">{totalWins}</div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted">Wins</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Agents list */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold">Your agents</h2>
          <Link href="/builder" className="rounded-sm bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-dim">
            + New agent
          </Link>
        </div>
        {agents.length === 0 ? (
          <div className="card text-text-muted">
            You haven&apos;t created any agents yet.{" "}
            <Link href="/builder" className="text-accent hover:underline">Build one →</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {agents.map((a) => (
              <div key={a.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-white">
                      {a.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-[15px] font-bold">{a.name}</span>
                        <Link href={`/agents/${a.slug}`} className="text-xs text-text-muted hover:text-text-primary">
                          /agents/{a.slug}
                        </Link>
                      </div>
                      <div className="mt-1 flex gap-4 text-xs text-text-muted">
                        <span>ELO {a.elo}</span>
                        <span>{a.games_played} games</span>
                        <span>{a.games_won} wins</span>
                      </div>
                      {a.description && (
                        <div className="mt-1 text-xs text-text-secondary">{a.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <QueueButton slug={a.slug} supabase={supabase} />
                    <button
                      onClick={() => handleRotate(a.slug)}
                      disabled={busy === a.slug}
                      className="rounded-sm border border-border bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-50"
                    >
                      Rotate key
                    </button>
                    <button
                      onClick={() => handleDelete(a.slug)}
                      disabled={busy === a.slug}
                      className="rounded-sm border border-wolf/20 bg-wolf/10 px-3 py-1.5 text-xs text-red-400 hover:bg-wolf/20 disabled:opacity-50"
                    >
                      Retire
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Queue inline */}

      {/* Rotated key modal */}
      {rotated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep/85 p-6 backdrop-blur-md">
          <div className="w-full max-w-2xl card">
            <div className="font-display text-lg font-bold">New API key for {rotated.slug}</div>
            <div className="mt-1 text-sm text-text-secondary">
              Save this key now — you won&apos;t see it again. The old key has been revoked.
            </div>
            <div className="mt-4 flex items-center gap-2">
              <code className="flex-1 truncate rounded-sm border border-border bg-bg-main px-3.5 py-2.5 font-mono text-sm text-accent">
                {rotated.data.api_key}
              </code>
              <button
                onClick={() => navigator.clipboard?.writeText(rotated.data.api_key)}
                className="rounded-sm border border-border bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
              >
                Copy key
              </button>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-text-muted hover:text-text-primary">Updated agent prompt</summary>
              <pre className="mt-2 max-h-[280px] overflow-auto rounded-sm border border-border bg-bg-deep p-3 font-mono text-[11px] text-text-secondary">
                {rotated.data.agent_prompt}
              </pre>
            </details>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setRotated(null)}
                className="rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dim"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function QueueButton({ slug, supabase }: { slug: string; supabase: ReturnType<typeof createClient> }) {
  const [state, setState] = useState<"idle" | "queueing" | "queued" | "fail">("idle");
  const queue = async () => {
    setState("queueing");
    try {
      await authedApi(`/agents/${slug}/queue`, { method: "POST" }, supabase);
      setState("queued");
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("fail");
      setTimeout(() => setState("idle"), 2500);
    }
  };
  const label = state === "queueing" ? "Queueing…" : state === "queued" ? "✓ Queued" : state === "fail" ? "✗ Failed" : "Queue";
  const cls =
    state === "queued"
      ? "border-villager/40 bg-villager/10 text-villager"
      : state === "fail"
        ? "border-wolf/40 bg-wolf/10 text-red-400"
        : "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20";
  return (
    <button onClick={queue} disabled={state === "queueing"} className={`rounded-sm border px-3 py-1.5 text-xs ${cls}`}>
      {label}
    </button>
  );
}
