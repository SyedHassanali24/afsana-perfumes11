import { useEffect, useState } from "react";
import { accountApi } from "../services";

const messages = {
  not_configured: "Social sign-in has not been connected yet. Please use email and password for now.",
  cancelled: "Sign-in was cancelled. You can try again whenever you are ready.",
  failed: "We could not verify that social account. Please try again or use email and password.",
};

function GoogleMark() {
  return <span aria-hidden="true" className="font-bold text-lg leading-none tracking-tight"><span className="text-[#4285F4]">G</span></span>;
}

function FacebookMark() {
  return <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2] text-sm font-bold leading-none text-white">f</span>;
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
    window.location.assign(\`/api/account/oauth/\${provider}?\${query.toString()}\`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => start("google")}
          disabled={loading || starting !== "" || !providers.google}
          className="min-h-12 inline-flex items-center justify-center gap-2 rounded-xl border border-[#d8b477]/40 bg-white px-4 text-sm font-semibold text-[#262326] transition hover:bg-[#faf7f2] disabled:cursor-not-allowed disabled:opacity-55"
          aria-label={providers.google ? "Continue with Google" : "Google sign-in setup required"}
        >
          <GoogleMark />
          <span>{loading ? "Checking…" : "Continue with Google"}</span>
        </button>
        <button
          type="button"
          onClick={() => start("facebook")}
          disabled={loading || starting !== "" || !providers.facebook}
          className="min-h-12 inline-flex items-center justify-center gap-2 rounded-xl border border-[#d8b477]/40 bg-white px-4 text-sm font-semibold text-[#262326] transition hover:bg-[#faf7f2] disabled:cursor-not-allowed disabled:opacity-55"
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
