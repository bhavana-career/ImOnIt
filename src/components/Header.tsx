"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";
import { Sun, Moon, Flame, ChevronDown, LogOut, Plus, Bell } from "lucide-react";
import { useRouter } from "next/navigation";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  authProvider: string;
}

interface AccountItem {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata: {
    hubId?: string;
  };
}

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface HeaderProps {
  activeAccount?: string;
}

export default function Header({ activeAccount }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Notification states
  const [notificationTrayOpen, setNotificationTrayOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/auth/me?account=${activeAccount || ""}`, {
        headers: {
          "x-active-account": activeAccount || "",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        
        // Deduplicate accounts array by unique ID before storing in state
        const rawAccounts: AccountItem[] = data.accounts || [];
        const uniqueAccountsMap = new Map<string, AccountItem>();
        rawAccounts.forEach(acc => {
          if (!uniqueAccountsMap.has(acc.id)) {
            uniqueAccountsMap.set(acc.id, acc);
          }
        });
        
        setAccounts(Array.from(uniqueAccountsMap.values()));
      } else {
        setUser(null);
        setAccounts([]);
      }
    } catch {
      setUser(null);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?account=${activeAccount || ""}`, {
        headers: {
          "x-active-account": activeAccount || "",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchNotifications();

    // Listen to notification refresh events
    const handleRefresh = () => {
      fetchNotifications();
    };
    window.addEventListener("refresh_notifications", handleRefresh);
    return () => {
      window.removeEventListener("refresh_notifications", handleRefresh);
    };
  }, [activeAccount]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationTrayOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggleNotificationTray = () => {
    const nextVal = !notificationTrayOpen;
    setNotificationTrayOpen(nextVal);
    if (nextVal) {
      fetchNotifications();
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications?account=${activeAccount || ""}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-active-account": activeAccount || "",
        },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        fetchNotifications();
        window.dispatchEvent(new Event("notifications_updated"));
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch(`/api/notifications?account=${activeAccount || ""}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-active-account": activeAccount || "",
        },
      });
      if (res.ok) {
        fetchNotifications();
        window.dispatchEvent(new Event("notifications_updated"));
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleSwitch = (accountId: string) => {
    setDropdownOpen(false);
    window.open(`/dashboard?account=${accountId}`, "_blank");
  };

  const handleLogout = async () => {
    try {
      const res = await fetch(`/api/auth/logout?account=${activeAccount || ""}`, {
        method: "POST",
        headers: {
          "x-active-account": activeAccount || "",
        },
      });
      if (res.ok) {
        setUser(null);
        setDropdownOpen(false);
        // Force refresh or redirect to home page
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Failed to logout:", err);
    }
  };

  const handleAddAccount = () => {
    setDropdownOpen(false);
    router.push("/auth");
  };

  return (
    <header className="w-full max-w-7xl mx-auto px-6 h-16 flex items-center justify-between z-50">
      {/* Brand Logo */}
      <div 
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => router.push(user ? "/dashboard" : "/")}
      >
        <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100/60 dark:border-red-900/30 flex items-center justify-center shadow-sm">
          <Flame className="w-5 h-5 text-red-500 fill-red-500/10" />
        </div>
        <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
          I'm On It Bruh
        </span>
      </div>

      {/* Action Area */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all shadow-sm cursor-pointer"
          aria-label="Toggle Theme"
        >
          {theme === "light" ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </button>

        {/* Notification Bell */}
        {!loading && user && (
          <div className="relative" ref={notificationRef}>
            <button
              onClick={handleToggleNotificationTray}
              className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all shadow-sm cursor-pointer relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-600 border border-white dark:border-slate-950 flex items-center justify-center text-[9px] font-extrabold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationTrayOpen && (
              <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl py-3 z-[100] animate-in fade-in slide-in-from-top-3 duration-200">
                <div className="px-4 pb-2 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-3xs font-extrabold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto mt-2 divide-y divide-slate-100 dark:divide-slate-900">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkAsRead(n.id)}
                        className={`p-4 transition-all text-left cursor-pointer flex gap-3 ${
                          n.read
                            ? "hover:bg-slate-50 dark:hover:bg-slate-900/35"
                            : "bg-red-50/20 dark:bg-red-950/10 hover:bg-red-50/30 dark:hover:bg-red-950/20"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-extrabold ${n.read ? "text-slate-800 dark:text-slate-200" : "text-slate-900 dark:text-white font-black"}`}>
                              {n.title}
                            </span>
                            {!n.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1 leading-normal font-medium">
                            {n.message}
                          </p>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 block font-mono">
                            {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile Avatar Dropdown */}
        {!loading && user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 p-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
            >
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-sm">
                  {getInitials(user.name)}
                </div>
              )}
              <ChevronDown className="w-4 h-4 text-slate-500 pr-1" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl py-2.5 z-[100] animate-in fade-in slide-in-from-top-3 duration-200">
                {/* Active user details */}
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-900">
                  <div className="flex items-center gap-3">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-base">
                        {getInitials(user.name)}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <h4 className="font-semibold text-slate-900 dark:text-white truncate">
                        {user.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>

                 {/* Account Switcher Section */}
                <div className="px-4 py-2">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                    Accounts
                  </span>
                  <div className="mt-1.5 space-y-1 max-h-48 overflow-y-auto">
                    {accounts.map((acc) => {
                      const isActive = acc.id === user.id;
                      return (
                        <button
                          key={acc.id}
                          disabled={isActive}
                          onClick={() => handleSwitch(acc.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                            isActive
                              ? "bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 cursor-default"
                              : "hover:bg-slate-50 dark:hover:bg-slate-900/40 cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            {acc.image ? (
                              <img
                                src={acc.image}
                                alt={acc.name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-400 flex items-center justify-center text-white font-bold text-2xs">
                                {getInitials(acc.name)}
                              </div>
                            )}
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-1.5">
                                <span className="block font-medium text-xs text-slate-900 dark:text-white truncate">
                                  {acc.name}
                                </span>
                                {isActive && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-wider">
                                    Active
                                  </span>
                                )}
                              </div>
                              <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono">
                                {acc.email}
                              </span>
                            </div>
                          </div>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-900 my-1.5" />

                {/* Actions */}
                <div className="px-2 space-y-0.5">
                  <button
                    onClick={handleAddAccount}
                    disabled={accounts.length >= 3}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 disabled:opacity-50 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2.5">
                      <Plus className="w-4 h-4 text-slate-500" />
                      Add Account
                    </div>
                    {accounts.length >= 3 && (
                      <span className="text-[9px] font-bold text-amber-500 px-1 py-0.5 rounded bg-amber-500/10">
                        Max 3
                      </span>
                    )}
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
