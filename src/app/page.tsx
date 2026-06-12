"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";

export default function LandingPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(data.authenticated);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const handleEnterDashboard = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/auth");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      
      {/* Background Gradient Glow Bubbles */}
      <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-30">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-primary to-transparent blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-accent to-transparent blur-[120px]"></div>
      </div>

      {/* Sticky Glass Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-border">
        <div 
          onClick={() => router.push(isAuthenticated ? "/dashboard" : "/")} 
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <i className="ti ti-flame text-primary text-2xl animate-pulse"></i>
          <span className="font-bold tracking-tight text-lg">I'm On It Bruh</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-secondary text-foreground hover:bg-opacity-80 transition-all cursor-pointer flex items-center justify-center" 
            aria-label="Toggle theme"
          >
            <i className={`ti ${theme === "light" ? "ti-moon" : "ti-sun"} text-lg`}></i>
          </button>
        </div>
      </nav>

      {/* Hero Header Section */}
      <header className="relative min-h-[90vh] flex flex-col justify-center items-center text-center px-6 py-20 border-b border-border">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-primary font-semibold text-xs mb-6 uppercase tracking-wider">
            <i className="ti ti-cpu"></i> Powered by Gemini 1.5 Pro
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
            The Meeting-To-Execution <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Pipeline, Enforced.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Stop losing action items in endless chat logs. I'm On It Bruh is the definitive meeting analysis, task-dependency, and human-verified accountability system.
          </p>
          
          <div className="flex justify-center gap-4 flex-wrap">
            <button 
              onClick={handleEnterDashboard}
              className="px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 shadow-lg transition-all duration-300 flex items-center gap-2 cursor-pointer"
            >
              Enter Dashboard <i className="ti ti-arrow-right"></i>
            </button>
            <a 
              href="#vision" 
              className="px-8 py-4 rounded-full bg-secondary text-foreground font-semibold hover:bg-opacity-80 transition-all duration-300 flex items-center gap-2 cursor-pointer"
            >
              See How It Works <i className="ti ti-arrow-down"></i>
            </a>
          </div>
        </div>
      </header>

      {/* Vision Section */}
      <section id="vision" className="py-24 px-6 border-b border-border max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <span className="text-primary font-bold uppercase tracking-wider text-xs block">Product Vision</span>
          <h2 className="text-3xl md:text-5xl font-extrabold leading-tight text-slate-900 dark:text-white">
            Meetings should produce commitments, not conversations.
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Modern teams waste hours discussing deliverables in meetings, only to forget the commitments by the next morning. Conversations are unstructured, and generic project tools rely on manual inputs.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            We bridge this gap. By combining native WebRTC meetings, speaker-aware transcription, Gemini AI analysis, and a strict admin review gate, we turn verbal promises into immutable execution workflows.
          </p>
        </div>
        
        {/* Authoritative blueprint graphic quote card */}
        <div className="relative h-[320px] rounded-2xl bg-gradient-to-br from-secondary to-muted border border-border p-8 overflow-hidden flex flex-col justify-center">
          <div className="absolute top-4 right-4 text-primary opacity-10">
            <i className="ti ti-quote text-7xl"></i>
          </div>
          <p className="text-xl md:text-2xl font-bold tracking-tight mb-4 text-foreground italic leading-snug">
            “This is NOT a chat platform. It is NOT a standard project tracker. It is a strict accountability system.”
          </p>
          <div className="h-1 w-12 bg-primary mb-4 rounded-full"></div>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Authoritative Blueprint
          </span>
        </div>
      </section>

      {/* Features highlight Section */}
      <section className="py-24 px-6 border-b border-border bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-primary font-bold uppercase tracking-wider text-xs block mb-3">Core Strengths</span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white">Built for Radical Execution</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-card border border-border flex flex-col hover:border-primary/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 text-2xl">
                <i className="ti ti-activity"></i>
              </div>
              <h3 className="text-xl font-bold mb-4">Enforced Accountability</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Task statuses are highly structured: assigned, blocked, pending review, completed. No task is forgotten.
              </p>
            </div>
            
            <div className="p-8 rounded-2xl bg-card border border-border flex flex-col hover:border-primary/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 text-2xl">
                <i className="ti ti-cpu"></i>
              </div>
              <h3 className="text-xl font-bold mb-4">Gemini AI Analysis</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Automates extraction of action items from transcripts. No more manual meeting minutes.
              </p>
            </div>
            
            <div className="p-8 rounded-2xl bg-card border border-border flex flex-col hover:border-primary/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 text-2xl">
                <i className="ti ti-trending-up"></i>
              </div>
              <h3 className="text-xl font-bold mb-4">Structured Execution</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Direct, focused pipeline. Eliminates the gap between planning and execution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-muted-foreground border-t border-border bg-background">
        <p>I'm On It Bruh © 2026. All rights reserved. Authoritative product blueprint reference.</p>
      </footer>
    </div>
  );
}
