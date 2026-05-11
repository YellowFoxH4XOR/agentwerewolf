"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { authedApi, type AgentRead } from "@/lib/api";
// QueueButton is defined below; it imports authedApi from this same module.
import { createClient } from "@/lib/supabase/client";

interface RotatedKey {
  api_key: string;
  agent_prompt: string;
  client_snippet: string;
}

export default function AccountPage() {
  const [agents, setAgents] = useState<AgentRead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rotated, setRotated] = useState<{ slug: string; data: RotatedKey } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const supabase = createClient();

  const refresh = useCallback(async () => {
    try {
      const a = await authedApi<AgentRead[]>("/agents/mine", {}, supabase);
      setAgents(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    }
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  return (
    <main className="container max-w-[800px] py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight">Account</h1>

      {error && (
        <div className="mt-4 rounded-md border border-wolf/20 bg-wolf/5 p-3 text-sm text-wolf">{error}</div>
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
