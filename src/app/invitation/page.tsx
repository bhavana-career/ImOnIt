"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Flame, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

function InvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [hubInfo, setHubInfo] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorMsg("Missing invitation token.");
      setLoading(false);
      return;
    }

    const verifyAndAccept = async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          document.cookie = `invite_token=${token}; path=/; max-age=3600; SameSite=Lax`;
          router.push("/auth?message=" + encodeURIComponent("Please sign in or register to join the Hub."));
          return;
        }

        const meData = await meRes.json();
        if (!meData.authenticated) {
          document.cookie = `invite_token=${token}; path=/; max-age=3600; SameSite=Lax`;
          router.push("/auth?message=" + encodeURIComponent("Please sign in or register to join the Hub."));
          return;
        }

        const acceptRes = await fetch("/api/hubs/invite/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const acceptData = await acceptRes.json();
        if (!acceptRes.ok) {
          setErrorMsg(acceptData.error || "Failed to accept invitation.");
          return;
        }

        setSuccessMsg(acceptData.message || "Invitation accepted! Your request is pending Owner approval.");
        setHubInfo({ id: acceptData.hubId, name: acceptData.hubName });
      } catch (err: any) {
        setErrorMsg("A network error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    verifyAndAccept();
  }, [token]);

  return (
    <div className="w-full max-w-[460px] rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-xl relative z-10 flex flex-col items-center">
      <div className="w-11 h-11 rounded-xl bg-red-500/10 dark:bg-red-950/20 flex items-center justify-center text-primary mb-4 shadow-sm">
        <Flame className="w-6 h-6 text-primary animate-pulse" />
      </div>

      <h1 className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white mb-1">
        I'm On It Bruh
      </h1>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-8 font-medium">
        Workspace Membership Program
      </p>

      {loading && (
        <div className="flex flex-col items-center py-8">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Processing Invitation...</p>
        </div>
      )}

      {errorMsg && (
        <div className="w-full text-center py-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-4">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">Invitation Error</h3>
          <p className="text-xs text-red-600 dark:text-red-400 leading-normal mb-6 font-semibold bg-red-50/50 dark:bg-red-950/20 p-3.5 rounded-2xl border border-red-100/50 dark:border-red-900/30">
            {errorMsg}
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
          >
            Go to Home Page
          </button>
        </div>
      )}

      {successMsg && (
        <div className="w-full text-center py-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto mb-4">
            <CheckCircle className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-2">Join Request Submitted</h3>
          
          <div className="my-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-left text-xs font-semibold space-y-2">
            <div>
              <span className="block text-3xs text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Hub Name</span>
              <span className="block text-slate-800 dark:text-slate-200 text-sm mt-0.5">{hubInfo?.name}</span>
            </div>
            <div>
              <span className="block text-3xs text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Status</span>
              <span className="inline-flex items-center gap-1.5 text-amber-500 font-extrabold mt-0.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Pending Approval
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-semibold">
            Your request is waiting for Owner approval.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="w-full py-3.5 rounded-2xl bg-primary hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Refresh Status
            </button>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="w-full py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
            >
              Check Status
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-semibold text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvitationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-background text-foreground">
      <Suspense fallback={<div>Loading invitation verification...</div>}>
        <InvitationContent />
      </Suspense>
    </div>
  );
}
