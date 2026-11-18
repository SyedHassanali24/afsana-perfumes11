import { useEffect, useState } from "react";
import { accountApi } from "../services";

const messages = {
  not_configured: "Social sign-in has not been connected yet. Please use email and password for now.",
  cancelled: "Sign-in was cancelled. You can try again whenever you are ready.",
  failed: "We could not verify that social account. Please try again or use email and password.",
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <path fill="#4285F4" d="M23.49 12.27c0-.78-.07-1.53-.2-2.27H12v4.51h6.44a5.5 5.5 0 0 1-2.38 3.51v2.92h3.86c2.26-2.08 3.57-5.14 3.57-8.67Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.93l-3.86-2.92c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.28v3.01C3.25 21.3 7.28 24 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.35A7.2 7.2 0 0 1 4.9 12c0-.81.14-1.6.37-2.35V6.64H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.36l3.99-3.01Z" />
      <path fill="#EA4335" d="M12 4.7c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.13 15.24 0 12 0 7.28 0 3.25 2.7 1.28 6.64l3.99 3.01C6.22 6.81 8.87 4.7 12 4.7Z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-current">
      <path d="M24 12a12 12 0 1 0-13.875 11.85v-8.38H7.08V12h3.045V9.35c0-3.005 1.79-4.665 4.53-4.665 1.312 0 2.685.235 2.685.235v2.955h-1.512c-1.49 0-1.956.925-1.956 1.874V12h3.328l-.532 3.47h-2.796v8.38A12.002 12.002 0 0 0 24 12Z" />
    </svg>
  );
}

export default function SocialSignInButtons({ returnTo = "/account" }) {
  const [providers, setProviders] = useState({ google: false, facebook: false });
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState("");
  const params = new URLSearchParams(window.location.search);
  const oauthMessage = messages[params.get("oauth")] || "";

  useEffect(() => {
    let active = true;
    accountApi.oauthProviders()
      .then((result) => {
        if (active) setProviders({
          google: result?.providers?.google === true,
          facebook: result?.providers?.facebook === true,
        });
      })
      .catch(() => {
        if (active) setProviders({ google: false, facebook: false });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const start = (provider) => {
    setStarting(provider);
    const query = new URLSearchParams({ returnTo });
    window.location.assign("/api/account/oauth/" + provider + "?" + query.toString());
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => start("google")}
          disabled={loading || starting !== "" || !providers.google}
          className="min-h-12 inline-flex items-center justify-center gap-2 rounded-xl border border-[#dadce0] bg-white px-4 text-sm font-semibold text-[#3c4043] shadow-sm transition hover:bg-[#f8faff] hover:border-[#c6c6c6] disabled:cursor-not-allowed disabled:opacity-55"
          aria-label={providers.google ? "Continue with Google" : "Google sign-in setup required"}
        >
          <GoogleMark />
          <span>{loading ? "Checking…" : "Continue with Google"}</span>
        </button>
        <button
          type="button"
          onClick={() => start("facebook")}
          disabled={loading || starting !== "" || !providers.facebook}
          className="min-h-12 inline-flex items-center justify-center gap-2 rounded-xl border border-[#1877F2] bg-[#1877F2] px-4 text-sm font-semibold text-white shadow-sm transition hover:border-[#166FE5] hover:bg-[#166FE5] disabled:cursor-not-allowed disabled:opacity-55"
          aria-label={providers.facebook ? "Continue with Facebook" : "Facebook sign-in setup required"}
        >
          <FacebookMark />
          <span>{loading ? "Checking…" : "Continue with Facebook"}</span>
        </button>
      </div>
      {!loading && !providers.google && !providers.facebook && (
        <p className="text-center text-xs leading-5 text-ink-muted">
          Google and Facebook sign-in will activate after their secure app credentials are connected.
        </p>
      )}
      {oauthMessage && (
        <p role="alert" className="rounded-xl bg-[#9b3f3f]/10 px-3 py-2 text-sm text-[#9b3f3f]">
          {oauthMessage}
        </p>
      )}
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[10px] uppercase tracking-[0.22em] text-ink-muted">Or use email</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
