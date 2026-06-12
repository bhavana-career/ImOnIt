"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Flame, RefreshCw, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");

  const [view, setView] = useState<"register" | "login" | "otp">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showDuplicateError, setShowDuplicateError] = useState(false);
  const [showNotFoundError, setShowNotFoundError] = useState(false);

  useEffect(() => {
    if (oauthError) {
      setErrorMsg(oauthError);
    }
  }, [oauthError]);

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMsg("");
    setShowDuplicateError(false);
    setShowNotFoundError(false);

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: view === "register" ? name : undefined,
          mode: view,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "EMAIL_EXISTS") {
          setShowDuplicateError(true);
        } else if (data.code === "EMAIL_NOT_FOUND") {
          setShowNotFoundError(true);
        } else {
          setErrorMsg(data.error || "Failed to send verification code.");
        }
        return;
      }

      setSuccessMsg("OTP sent successfully! Please check your email inbox.");
      setView("otp");
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setErrorMsg("Please enter a valid 6-digit code.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: otpCode,
          mode: view,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Verification failed.");
        return;
      }

      const match = document.cookie.match(/(^|;)\s*invite_token\s*=\s*([^;]+)/);
      const token = match ? match[2] : null;
      if (token) {
        document.cookie = "invite_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        window.location.href = `/invitation?token=${token}`;
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resending || !email) return;
    setResending(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: view === "register" ? name : undefined,
          mode: view,
        }),
      });

      if (res.ok) {
        setSuccessMsg("OTP sent successfully! Please check your email inbox.");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to resend code.");
      }
    } catch {
      setErrorMsg("Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-[460px] rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-xl relative z-10 flex flex-col items-center">
      {/* Flame Logo Container */}
      <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100/60 dark:border-red-900/30 flex items-center justify-center shadow-sm mb-4">
        <Flame className="w-6 h-6 text-red-500 fill-red-500/10" />
      </div>

      <h1 className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white mb-1">
        I'm On It Bruh
      </h1>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-8 font-medium">
        AI-powered meeting-to-execution pipeline.
      </p>

      {/* Global Error Banner */}
      {errorMsg && !showDuplicateError && !showNotFoundError && (
        <div className="w-full mb-5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-900/30 text-xs text-red-600 dark:text-red-400 font-semibold text-center leading-relaxed">
          {errorMsg}
        </div>
      )}

      {/* Duplicate Email Error Box */}
      {showDuplicateError && (
        <div className="w-full mb-6 text-center">
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-900/30 text-xs text-red-600 dark:text-red-400 font-semibold mb-4 leading-relaxed">
            This account already exists.
            <br />
            Please sign in instead.
          </div>
          <button
            onClick={() => {
              setView("login");
              setShowDuplicateError(false);
              setErrorMsg("");
            }}
            className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            Go to Login
          </button>
        </div>
      )}

      {/* Account Not Found Error Box */}
      {showNotFoundError && (
        <div className="w-full mb-6 text-center">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30 text-xs text-amber-600 dark:text-amber-400 font-semibold mb-4 leading-relaxed">
            This account does not exist.
            <br />
            Please register first.
          </div>
          <button
            onClick={() => {
              setView("register");
              setShowNotFoundError(false);
              setErrorMsg("");
            }}
            className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            Go to Register
          </button>
        </div>
      )}

      {/* Auth Forms */}
      {!showDuplicateError && !showNotFoundError && (
        <AnimatePresence mode="wait">
          {view === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="w-full"
            >
              {/* Google Auth */}
              <button
                onClick={handleGoogleLogin}
                className="w-full py-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-900 dark:hover:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.187 4.114-3.414 0-6.19-2.776-6.19-6.19s2.776-6.19 6.19-6.19c1.7 0 3.22.69 4.32 1.8l3.144-3.144C19.16 2.062 15.93.97 12.24.97 6.015.97 1 5.985 1 12.21s5.015 11.24 11.24 11.24c6.516 0 11.24-4.578 11.24-11.24 0-.763-.09-1.334-.24-1.925H12.24z"
                  />
                </svg>
                Continue with Google
              </button>

              {/* Separator */}
              <div className="w-full flex items-center justify-between my-6">
                <div className="h-px bg-slate-100 dark:bg-slate-900 w-[42%]" />
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase select-none">
                  OR
                </span>
                <div className="h-px bg-slate-100 dark:bg-slate-900 w-[42%]" />
              </div>

              {/* Email OTP Login Form */}
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2 select-none">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:border-red-500 dark:focus:border-red-500 font-mono transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md hover:shadow-red-600/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Continue with Email"}
                </button>
              </form>

              {/* Footer Switcher */}
              <div className="mt-8 text-center">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  New to I'm On It Bruh?{" "}
                  <button
                    onClick={() => {
                      setView("register");
                      setErrorMsg("");
                    }}
                    className="text-red-600 dark:text-red-500 hover:underline font-bold cursor-pointer"
                  >
                    Create an account
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {view === "register" && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="w-full"
            >
              {/* Google Auth */}
              <button
                onClick={handleGoogleLogin}
                className="w-full py-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-900 dark:hover:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.187 4.114-3.414 0-6.19-2.776-6.19-6.19s2.776-6.19 6.19-6.19c1.7 0 3.22.69 4.32 1.8l3.144-3.144C19.16 2.062 15.93.97 12.24.97 6.015.97 1 5.985 1 12.21s5.015 11.24 11.24 11.24c6.516 0 11.24-4.578 11.24-11.24 0-.763-.09-1.334-.24-1.925H12.24z"
                  />
                </svg>
                Continue with Google
              </button>

              {/* Separator */}
              <div className="w-full flex items-center justify-between my-6">
                <div className="h-px bg-slate-100 dark:bg-slate-900 w-[42%]" />
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase select-none">
                  OR
                </span>
                <div className="h-px bg-slate-100 dark:bg-slate-900 w-[42%]" />
              </div>

              {/* Email OTP Register Form */}
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2 select-none">
                    Profile Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:border-red-500 dark:focus:border-red-500 transition-all mb-4"
                  />

                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2 select-none">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:border-red-500 dark:focus:border-red-500 font-mono transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md hover:shadow-red-600/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Continue with Email"}
                </button>
              </form>

              {/* Footer Switcher */}
              <div className="mt-8 text-center">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Already registered?{" "}
                  <button
                    onClick={() => {
                      setView("login");
                      setErrorMsg("");
                    }}
                    className="text-red-600 dark:text-red-500 hover:underline font-bold cursor-pointer"
                  >
                    Log in here
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {view === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="w-full"
            >
              {/* OTP Sent successfully banner */}
              {successMsg && (
                <div className="w-full mb-6 p-3 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-900/30 text-xs text-red-600 dark:text-red-400 font-semibold text-center leading-relaxed select-none">
                  {successMsg}
                </div>
              )}

              {/* Header message */}
              <div className="text-center mb-6">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  We sent a 6-digit verification code to
                  <br />
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono select-all">
                    {email}
                  </span>
                </p>
              </div>

              {/* Verification Code Form */}
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2.5 text-center select-none">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    pattern="\d{6}"
                    placeholder="1 2 3 4 5 6"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-3 text-center tracking-[1em] font-mono font-bold text-2xl border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-red-500 dark:focus:border-red-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md hover:shadow-red-600/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify and Log in"}
                </button>
              </form>

              {/* Resend actions */}
              <div className="mt-6 flex items-center justify-between text-2xs font-semibold text-slate-500 dark:text-slate-400 select-none">
                <span>Didn't receive the code?</span>
                <button
                  onClick={handleResendOtp}
                  disabled={resending}
                  className="text-red-600 dark:text-red-500 flex items-center gap-1 hover:underline font-bold cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                  Resend Code
                </button>
              </div>

              {/* Spam Hint Banner */}
              <div className="mt-6 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/10 border border-amber-100/40 dark:border-amber-900/20 text-2xs text-amber-850 dark:text-amber-400 font-medium leading-relaxed">
                <div className="flex gap-2">
                  <span className="text-amber-600 dark:text-amber-500 text-xs mt-0.5">⚠️</span>
                  <p>
                    <strong>Hint:</strong> Since this is a new application, the verification email might be in your <strong>Spam</strong> or <strong>Junk</strong> folder. Please check there if you don't see it in your inbox.
                  </p>
                </div>
              </div>

              {/* Back button */}
              <div className="mt-8 text-center">
                <button
                  onClick={() => {
                    setView("login");
                    setErrorMsg("");
                    setSuccessMsg("");
                    setOtpCode("");
                    setShowDuplicateError(false);
                    setShowNotFoundError(false);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Go Back
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-background text-foreground">
      <Suspense fallback={<div>Loading authentication...</div>}>
        <AuthContent />
      </Suspense>
    </div>
  );
}
