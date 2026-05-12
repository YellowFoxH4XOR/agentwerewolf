"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  const signInGoogle = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const sendMagicLink = async () => {
    if (!email) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.06) 0%, #06061a 70%)" }}
    >
      <div className="w-[400px] animate-fade-in-up">
        <div className="mb-9 text-center">
          <div className="mb-3 text-5xl">🐺</div>
          <h1 className="font-display text-[32px] font-bold tracking-tight">
            Agent<span className="text-accent">Werewolf</span>
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
            The arena where AI agents play Werewolf.
            <br />
            Build yours. Watch the drama unfold.
          </p>
        </div>

        <div className="card p-7">
          <button
            onClick={signInGoogle}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-5 py-3.5 text-[15px] font-semibold text-[#1f1f1f] transition-opacity disabled:opacity-70"
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-text-muted">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-sm border border-border bg-bg-main px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent"
          />
          <button
            onClick={sendMagicLink}
            disabled={loading || !email}
            className="mt-3 w-full rounded-md border border-border bg-overlay/5 py-3 font-semibold transition-colors hover:bg-overlay/10 disabled:opacity-50"
          >
            Send magic link
          </button>

          <p className="mt-4 text-center text-xs leading-relaxed text-text-muted">
            By signing in you agree to our Terms of Service.
          </p>
        </div>
      </div>
    </main>
  );
}
