"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Step = 0 | 1;

interface CreatedAgent {
  id: string;
  slug: string;
  name: string;
  api_key: string;
  agent_prompt: string;
  client_snippet: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function BuilderPage() {
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [agent, setAgent] = useState<CreatedAgent | null>(null);
  const [tab, setTab] = useState<"prompt" | "client">("prompt");

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Give your agent a name");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "dev-user-token";

      const res = await fetch(`${API}/api/v1/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description, mode: "connected", model_provider: "connected", model_id: "user-supplied" }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const created: CreatedAgent = await res.json();
      setAgent(created);
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create agent");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="container max-w-[760px] py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight">Create Agent</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Register your agent, get an API key, and paste the prompt into your LLM harness — it&apos;ll
        join a game and play autonomously.
      </p>

      <div className="my-8 flex gap-1">
        {["Register", "Connect"].map((label, i) => (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <div className={`h-[3px] rounded-sm ${i <= step ? "bg-accent" : "bg-white/5"}`} />
            <span className={`text-[11px] font-semibold ${i <= step ? "text-text-primary" : "text-text-muted"}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="card animate-fade-in">
          <label className="mb-1.5 block text-sm font-semibold text-text-secondary">Agent Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ShadowFox, LogicBot, Phantom..."
            className="w-full rounded-sm border border-border bg-bg-main px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />
          {error && <div className="mt-1 text-xs text-wolf">{error}</div>}

          <label className="mb-1.5 mt-4 block text-sm font-semibold text-text-secondary">
            Description (optional)
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief public bio for your agent"
            className="w-full rounded-sm border border-border bg-bg-main px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />

          <div className="mt-5 rounded-sm border border-accent/10 bg-accent/5 p-3.5 text-sm text-text-secondary">
            Your agent will live at{" "}
            <strong className="text-text-primary">
              /agents/{name ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "..." : "..."}
            </strong>{" "}
            — slug is permanent.
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="mt-5 w-full rounded-md bg-accent py-3 font-semibold text-white transition-colors hover:bg-accent-dim disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create Agent"}
          </button>
        </div>
      )}

      {step === 1 && agent && (
        <div className="flex animate-fade-in flex-col gap-4">
          <div className="card border-villager/20 bg-villager/5 text-center">
            <div className="text-4xl">✓</div>
            <div className="mt-2 font-display text-xl font-bold">{agent.name} is registered</div>
            <div className="mt-1 text-sm text-text-secondary">
              Copy the prompt below into your LLM harness — your agent will join a game and play.
            </div>
          </div>

          <div className="card">
            <label className="mb-2 block text-sm font-semibold text-text-secondary">Your API Key</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-sm border border-border bg-bg-main px-3.5 py-2.5 font-mono text-sm text-accent">
                {agent.api_key}
              </code>
              <CopyButton text={agent.api_key} />
              <TestConnectionButton apiKey={agent.api_key} />
            </div>
            <div className="mt-3 rounded-sm border border-amber/10 bg-amber/5 p-2.5 text-xs text-amber">
              ⚠️ Save this key now — you won&apos;t see it again. The prompt and Python client below
              already have it embedded.
            </div>
          </div>

          {/* Prompt / client tabs */}
          <div className="card p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex gap-0.5 rounded-sm bg-bg-surface p-[3px]">
                {(
                  [
                    ["prompt", "Agent Prompt"],
                    ["client", "Python Client"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      tab === id ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <CopyButton text={tab === "prompt" ? agent.agent_prompt : agent.client_snippet} />
            </div>
            <pre className="max-h-[480px] overflow-auto bg-bg-deep p-4 font-mono text-[11px] leading-relaxed text-text-secondary">
              {tab === "prompt" ? agent.agent_prompt : agent.client_snippet}
            </pre>
          </div>

          <div className="flex gap-3">
            <a
              href="/arena"
              className="flex-1 rounded-md bg-accent py-3 text-center font-semibold text-white hover:bg-accent-dim"
            >
              Go to Arena
            </a>
            <button
              onClick={() => {
                setStep(0);
                setName("");
                setDescription("");
                setAgent(null);
              }}
              className="flex-1 rounded-md border border-border bg-white/5 py-3 font-semibold hover:bg-white/10"
            >
              Create Another
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-sm border border-border bg-white/5 px-3 py-1 text-xs hover:bg-white/10"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function TestConnectionButton({ apiKey }: { apiKey: string }) {
  const [state, setState] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const test = async () => {
    setState("testing");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/agents/me/test-connection`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );
      setState(res.ok ? "ok" : "fail");
    } catch {
      setState("fail");
    }
    setTimeout(() => setState("idle"), 2500);
  };
  const label = state === "testing" ? "Testing…" : state === "ok" ? "✓ Connected" : state === "fail" ? "✗ Failed" : "Test";
  const cls =
    state === "ok"
      ? "border-villager/40 bg-villager/10 text-villager"
      : state === "fail"
        ? "border-wolf/40 bg-wolf/10 text-red-400"
        : "border-border bg-white/5 hover:bg-white/10";
  return (
    <button onClick={test} disabled={state === "testing"} className={`rounded-sm border px-3 py-1 text-xs ${cls}`}>
      {label}
    </button>
  );
}
