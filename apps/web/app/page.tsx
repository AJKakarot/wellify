"use client";

import { useState } from "react";
import { createApiClient } from "@health-tracker/api-client";

type AuthMode = "sign_in" | "sign_up";

export default function HomePage() {
  const [authMode, setAuthMode] = useState<AuthMode>("sign_in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Email and password required");
      return;
    }

    if (authMode === "sign_up" && !name.trim()) {
      setError("Name required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = createApiClient(window.location.origin, { credentials: "include" });

      if (authMode === "sign_up") {
        await client.signUp({ email: trimmedEmail, password: trimmedPassword, name: name.trim() });
      } else {
        await client.signIn({ email: trimmedEmail, password: trimmedPassword });
      }

      // On success, redirect to dashboard (or reload for now)
      window.location.href = "/dashboard";
    } catch {
      setError(
        authMode === "sign_up"
          ? "Email already registered"
          : "Invalid email or password",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <div className="brand-lockup">Wellify</div>

        <div className="hero-copy">
          <p className="hero-kicker">Restorative wellness, curated daily.</p>
          <h1>
            The art of restorative <span>wellness.</span>
          </h1>
          <p className="hero-description">
            Begin your journey into a calmer routine. Our AI does more than track your habits. It
            learns your rhythm and shapes each reflection around the life you are actually living.
          </p>
        </div>

        <div className="insight-card">
          <div className="insight-icon" aria-hidden="true">
            ✦
          </div>
          <div>
            <p className="insight-label">Daily Insight</p>
            <p className="insight-text">
              Your stress markers are easing into balance. This is a good window for tea, a slow
              walk, or ten quiet minutes.
            </p>
          </div>
        </div>

        <div className="hero-orb hero-orb-primary" aria-hidden="true" />
        <div className="hero-orb hero-orb-secondary" aria-hidden="true" />
      </section>

      <section className="auth-panel">
        <div className="brand-lockup brand-lockup-mobile">Wellify</div>

        <div className="auth-content">
          <div className="auth-tabs" aria-label="Authentication mode">
            <button
              className={`auth-tab ${authMode === "sign_in" ? "auth-tab-active" : ""}`}
              onClick={() => { setAuthMode("sign_in"); setError(null); }}
              type="button"
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${authMode === "sign_up" ? "auth-tab-active" : ""}`}
              onClick={() => { setAuthMode("sign_up"); setError(null); }}
              type="button"
            >
              Sign Up
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {authMode === "sign_up" && (
              <label className="field">
                <span>Full Name</span>
                <input
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  type="text"
                  value={name}
                />
              </label>
            )}

            <label className="field">
              <span>Email Address</span>
              <input
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                type="email"
                value={email}
              />
            </label>

            <label className="field">
              <div className="field-heading">
                <span>Password</span>
                {authMode === "sign_in" && <a href="/">Forgot?</a>}
              </div>
              <input
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
                value={password}
              />
            </label>

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠</span>
                <p>{error}</p>
              </div>
            )}

            <button className="primary-button" disabled={loading} type="submit">
              {loading
                ? "Please wait..."
                : authMode === "sign_in"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          <p className="legal-copy">
            By continuing, you agree to our <a href="/">Terms of Service</a> and{" "}
            <a href="/">Privacy Policy</a>.
          </p>
        </div>
      </section>

      <div className="paper-grain" aria-hidden="true" />
    </main>
  );
}
