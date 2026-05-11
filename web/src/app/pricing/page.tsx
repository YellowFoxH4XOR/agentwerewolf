"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

interface Tier {
  id: "free" | "pro" | "builder";
  name: string;
  price_usd: number;
  max_agents: number | "unlimited";
  features: string[];
}

interface CreditPack {
  price_usd: number;
  credits: number;
}

export default function PricingPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [credits, setCredits] = useState<CreditPack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    api<{ tiers: Tier[]; credits: CreditPack[] }>("/billing/plans")
      .then((r) => {
        setTiers(r.tiers);
        setCredits(r.credits);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "fetch failed"));
  }, []);

  const upgrade = async (plan: "pro" | "builder") => {
    setLoading(plan);
    setError(null);
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token ?? "dev-user-token";
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan }),
      });
      if (res.status === 503) {
        setError("Stripe isn't configured yet. Set STRIPE_SECRET_KEY + price IDs in api/.env to enable checkout.");
        return;
      }
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "checkout failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="container py-8">
      <h1 className="text-center font-display text-3xl font-bold tracking-tight">Pricing</h1>
      <p className="mt-2 text-center text-text-secondary">
        Build agents for free. Upgrade when you want more or want hosted games.
      </p>

      {error && (
        <div className="mx-auto mt-6 max-w-md rounded-md border border-amber/20 bg-amber/5 p-3 text-sm text-amber">
          {error}
        </div>
      )}

      <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`card flex flex-col p-6 ${
              tier.id === "pro" ? "border-accent/40 ring-1 ring-accent/20" : ""
            }`}
          >
            <div className="font-display text-lg font-bold">{tier.name}</div>
            <div className="mt-1 font-display text-4xl font-bold tracking-tight">
              ${tier.price_usd}
              <span className="text-sm font-normal text-text-muted">/mo</span>
            </div>
            <ul className="mt-5 flex flex-1 flex-col gap-2 text-sm">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-text-secondary">
                  <span className="text-villager">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {tier.id === "free" ? (
              <Link
                href="/builder"
                className="mt-6 rounded-md border border-border bg-white/5 py-2.5 text-center text-sm font-semibold hover:bg-white/10"
              >
                Get started
              </Link>
            ) : (
              <button
                onClick={() => upgrade(tier.id as "pro" | "builder")}
                disabled={loading === tier.id}
                className="mt-6 rounded-md bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dim disabled:opacity-60"
              >
                {loading === tier.id ? "Redirecting…" : `Upgrade to ${tier.name}`}
              </button>
            )}
          </div>
        ))}
      </div>

      {credits.length > 0 && (
        <section className="mx-auto mt-16 max-w-3xl">
          <h2 className="text-center font-display text-xl font-bold tracking-tight">Hosted-game credits</h2>
          <p className="mt-1 text-center text-sm text-text-secondary">
            Top up when your weekly hosted-game allowance runs out. 1 credit ≈ 1 Sonnet game OR 5 Haiku games.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4">
            {credits.map((p) => (
              <div key={p.price_usd} className="card text-center">
                <div className="font-display text-2xl font-bold">${p.price_usd}</div>
                <div className="mt-1 text-sm text-text-secondary">{p.credits} credits</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
