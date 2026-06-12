"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  ShieldAlert, 
  Users, 
  User, 
  Settings, 
  Plus, 
  Lock, 
  Unlock, 
  Download, 
  Copy, 
  Check, 
  Flame, 
  AlertTriangle,
  FolderOpen,
  Calendar,
  ShieldCheck,
  ChevronRight,
  Trash2,
  UserPlus,
  LogOut,
  Mail,
  ArrowLeft,
  Image,
  Upload,
  Search,
  CheckCircle,
  Loader2,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Sparkles,
  Clock,
  Edit,
  History,
  TrendingUp,
  PlusCircle
} from "lucide-react";

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

function getCountdownText(scheduledAt: string | Date): string {
  const diffMs = new Date(scheduledAt).getTime() - Date.now();
  if (diffMs <= 0) return "Starting soon";
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h remaining`;
  if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m remaining`;
  if (diffMins > 0) return `${diffMins}m remaining`;
  return `${diffSecs}s remaining`;
}

function isValidAbsoluteUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getDeadlineWarning(deadline: string | null, status: string): { label: string; style: string; daysRemaining: number } {
  if (!deadline) return { label: "No Deadline", style: "text-slate-400 bg-slate-100 dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/80", daysRemaining: 999 };
  const today = new Date();
  today.setHours(0,0,0,0);
  const target = new Date(deadline);
  target.setHours(0,0,0,0);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (status?.toLowerCase() === "approved") {
    return { label: "Completed", style: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", daysRemaining: diffDays };
  }

  if (diffDays < 0) {
    return { label: "Overdue", style: "text-red-500 bg-red-500/10 border-red-500/20 font-black animate-pulse", daysRemaining: diffDays };
  }
  if (diffDays === 0 || diffDays === 1) {
    return { label: "Critical Warning (1d)", style: "text-red-500 bg-red-500/10 border-red-500/20 font-bold", daysRemaining: diffDays };
  }
  if (diffDays <= 3) {
    return { label: "High Warning", style: "text-amber-500 bg-amber-500/10 border-amber-500/20 font-bold", daysRemaining: diffDays };
  }
  if (diffDays <= 5) {
    return { label: "Medium Warning", style: "text-yellow-600 bg-yellow-500/10 border-yellow-500/20 font-semibold", daysRemaining: diffDays };
  }
  if (diffDays <= 10) {
    return { label: "Low Warning", style: "text-slate-500 bg-slate-500/10 border-slate-500/20 font-semibold", daysRemaining: diffDays };
  }
  return { label: `${diffDays} days remaining`, style: "text-slate-400 bg-slate-100 dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/80", daysRemaining: diffDays };
}

function renderMarkdown(text: string) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];

  const parseInline = (str: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const tokens = str.split(regex);

    tokens.forEach((token, idx) => {
      if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(<strong key={idx} className="font-extrabold text-slate-950 dark:text-white">{token.slice(2, -2)}</strong>);
      } else if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(<code key={idx} className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-red-500 font-mono text-[11px]">{token.slice(1, -1)}</code>);
      } else {
        parts.push(token);
      }
    });
    return parts;
  };

  const flushList = (key: string | number) => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="space-y-1 my-2 pl-4 list-disc text-slate-750 dark:text-slate-350">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("### ")) {
      flushList(idx);
      elements.push(
        <h4 key={idx} className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 mt-4 mb-2">
          {parseInline(trimmed.substring(4))}
        </h4>
      );
    } else if (trimmed.startsWith("## ")) {
      flushList(idx);
      elements.push(
        <h3 key={idx} className="text-sm font-black text-slate-900 dark:text-slate-100 mt-5 mb-2.5">
          {parseInline(trimmed.substring(3))}
        </h3>
      );
    } else if (trimmed.startsWith("# ")) {
      flushList(idx);
      elements.push(
        <h2 key={idx} className="text-base font-black text-slate-900 dark:text-slate-100 mt-6 mb-3">
          {parseInline(trimmed.substring(2))}
        </h2>
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const content = trimmed.substring(2);
      currentList.push(
        <li key={`li-${idx}`} className="text-xs font-semibold text-slate-750 dark:text-slate-300 leading-relaxed">
          {parseInline(content)}
        </li>
      );
    } else if (trimmed === "") {
      flushList(idx);
      elements.push(<div key={idx} className="h-2" />);
    } else {
      flushList(idx);
      elements.push(
        <p key={idx} className="my-1.5 text-xs font-semibold text-slate-750 dark:text-slate-300 leading-relaxed">
          {parseInline(line)}
        </p>
      );
    }
  });

  flushList("end");
  return <div className="space-y-1">{elements}</div>;
}




interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  authProvider: string;
}

interface HubItem {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  role: "Owner" | "Member";
  vaultStatus: "Protected" | "Unprotected";
  hubImage: string | null;
  actualRole?: string;
}

interface DashboardClientProps {
  user: UserProfile;
  initialMessage?: string;
}

export default function DashboardClient({ user, initialMessage }: DashboardClientProps) {
  // Tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "owned-hubs" | "member-hubs" | "pending-hubs" | "profile" | "settings">("dashboard");

  // Hub lists
  const [ownedHubs, setOwnedHubs] = useState<HubItem[]>([]);
  const [memberHubs, setMemberHubs] = useState<HubItem[]>([]);
  const [pendingHubs, setPendingHubs] = useState<HubItem[]>([]);
  const [loadingHubs, setLoadingHubs] = useState(true);

  // Opened Hub states
  const [openedHub, setOpenedHub] = useState<HubItem | null>(null);
  const [openedHubTab, setOpenedHubTab] = useState<"overview" | "meetings" | "vault" | "members" | "settings" | "assignments" | "agent">("overview");
  const [expandedVaultMeetingId, setExpandedVaultMeetingId] = useState<string | null>(null);
  const [selectedVersionSnapshot, setSelectedVersionSnapshot] = useState<any | null>(null);
  const [hubMembers, setHubMembers] = useState<{
    owner: any | null;
    members: any[];
    pending: any[];
    invitations: any[];
    userRole: string;
  }>({
    owner: null,
    members: [],
    pending: [],
    invitations: [],
    userRole: "member"
  });
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState("");

  // Edit settings form states
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editImage, setEditImage] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Deletion States
  const [deleteOtpModalOpen, setDeleteOtpModalOpen] = useState(false);
  const [deleteOtpCode, setDeleteOtpCode] = useState("");
  const [deleteOtpError, setDeleteOtpError] = useState("");
  const [deletingHubSpinner, setDeletingHubSpinner] = useState(false);

  // Member Invitation states
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [lookedUpUser, setLookedUpUser] = useState<{ name: string; email: string; image: string | null } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupSearched, setLookupSearched] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [inviteCustomMsg, setInviteCustomMsg] = useState("");
  const [sendingInviteSpinner, setSendingInviteSpinner] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Generic Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    recipientPreview?: {
      email: string;
      name?: string;
      image?: string | null;
      exists: boolean;
    } | null;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    recipientPreview: null
  });

  // Create Hub Flow States
  const [createStep, setCreateStep] = useState<"idle" | "form" | "confirm" | "password" | "recovery">("idle");
  const [hubName, setHubName] = useState("");
  const [hubDescription, setHubDescription] = useState("");
  const [vaultPassword, setVaultPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generatedRecoveryCode, setGeneratedRecoveryCode] = useState("");
  const [copiedRecovery, setCopiedRecovery] = useState(false);
  const [savedRecoveryCheck, setSavedRecoveryCheck] = useState(false);
  const [hubCreateError, setHubCreateError] = useState("");
  const [creatingHubSpinner, setCreatingHubSpinner] = useState(false);

  // Vault Unlock Flow States
  const [lockScreenHub, setLockScreenHub] = useState<HubItem | null>(null);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockRecoveryCode, setUnlockRecoveryCode] = useState("");
  const [unlockMode, setUnlockMode] = useState<"password" | "recovery">("password");
  const [unlockError, setUnlockError] = useState("");
  const [unlockingSpinner, setUnlockingSpinner] = useState(false);
  const [unlockedHubs, setUnlockedHubs] = useState<string[]>([]); // Track unlocked hub IDs

  // Success message
  const [welcomeBanner, setWelcomeBanner] = useState(initialMessage || "");

  // Phase 4 Meeting & Transcription States
  const [meetings, setMeetings] = useState<any[]>([]);
  const [vaultMeetings, setVaultMeetings] = useState<any[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<any | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [meetingStatus, setMeetingStatus] = useState<"connecting" | "connected" | "ended">("ended");
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [transcriptChunks, setTranscriptChunks] = useState<Array<{ speaker: string; text: string }>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisDraft, setAnalysisDraft] = useState<any | null>(null);
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any | null>(null);
  const [meetingTimer, setMeetingTimer] = useState(0);

  // Scheduling Form States
  const [schedTitle, setSchedTitle] = useState("");
  const [schedDesc, setSchedDesc] = useState("");
  const [schedAt, setSchedAt] = useState("");
  const [schedulingSpinner, setSchedulingSpinner] = useState(false);
  const [schedulingError, setSchedulingError] = useState("");

  // Editing Vault Record States
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editRecordTitle, setEditRecordTitle] = useState("");
  const [editRecordSummary, setEditRecordSummary] = useState<any>(null);
  const [editRecordAssignments, setEditRecordAssignments] = useState<any[]>([]);
  const [editRecordScore, setEditRecordScore] = useState<any>(null);
  const [editRecordChangeReason, setEditRecordChangeReason] = useState("");
  const [updatingRecordSpinner, setUpdatingRecordSpinner] = useState(false);
  const [updatingRecordError, setUpdatingRecordError] = useState("");
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);

  // Phase 5 Assignment Submission & Feedback States
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submitTaskModalOpen, setSubmitTaskModalOpen] = useState(false);
  const [submitTaskMeetingId, setSubmitTaskMeetingId] = useState("");
  const [submitTaskIndex, setSubmitTaskIndex] = useState<number | null>(null);
  const [submitTaskTitle, setSubmitTaskTitle] = useState("");
  const [submitTaskDesc, setSubmitTaskDesc] = useState("");
  const [submitTaskAttachments, setSubmitTaskAttachments] = useState<string[]>([]);
  const [newAttachmentUrl, setNewAttachmentUrl] = useState("");
  const [submittingWorkSpinner, setSubmittingWorkSpinner] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [reviewSubmissionModalOpen, setReviewSubmissionModalOpen] = useState(false);
  const [reviewSubmissionId, setReviewSubmissionId] = useState("");
  const [reviewTaskMeetingId, setReviewTaskMeetingId] = useState("");
  const [reviewTaskIndex, setReviewTaskIndex] = useState<number | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewSpinner, setReviewSpinner] = useState(false);

  // Phase 6 Hub Intelligence Agent States
  const [agentMessages, setAgentMessages] = useState<any[]>([]);
  const [agentQuery, setAgentQuery] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);

  const fetchAgentHistory = async (hubId: string) => {
    try {
      const res = await fetch(`/api/agent/history?hubId=${hubId}`);
      if (res.ok) {
        const data = await res.json();
        setAgentMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load agent history:", err);
    }
  };

  const handleAgentQuerySubmit = async (customMsg?: string) => {
    const query = customMsg || agentQuery;
    if (!openedHub || !query.trim() || agentLoading) return;

    const userMsg = { sender: "user", message: query.trim(), timestamp: new Date() };
    setAgentMessages(prev => [...prev, userMsg]);
    setAgentQuery("");
    setAgentLoading(true);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hubId: openedHub.id,
          message: query.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const agentMsg = { sender: "agent", message: data.response, timestamp: new Date() };
        setAgentMessages(prev => [...prev, agentMsg]);
      } else {
        const data = await res.json();
        const agentMsg = { sender: "agent", message: data.error || "Failed to process query.", timestamp: new Date() };
        setAgentMessages(prev => [...prev, agentMsg]);
      }
    } catch {
      const agentMsg = { sender: "agent", message: "Network connection error.", timestamp: new Date() };
      setAgentMessages(prev => [...prev, agentMsg]);
    } finally {
      setAgentLoading(false);
    }
  };

  const fetchMeetings = async (hubId: string) => {
    setLoadingMeetings(true);
    try {
      const res = await fetch(`/api/meetings/list?hubId=${hubId}`);
      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
        setVaultMeetings(data.vaultMeetings || []);
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error("Failed to fetch meetings:", err);
    } finally {
      setLoadingMeetings(false);
    }
  };

  const fetchHubs = async () => {
    setLoadingHubs(true);
    try {
      const res = await fetch("/api/hubs");
      if (res.ok) {
        const data = await res.json();
        setOwnedHubs(data.ownedHubs || []);
        setMemberHubs(data.memberHubs || []);
        setPendingHubs(data.pendingHubs || []);
      }
    } catch (err) {
      console.error("Failed to fetch hubs:", err);
    } finally {
      setLoadingHubs(false);
    }
  };

  useEffect(() => {
    fetchHubs();
    if (welcomeBanner) {
      const timer = setTimeout(() => setWelcomeBanner(""), 6000);
      return () => clearTimeout(timer);
    }
  }, [welcomeBanner]);

  useEffect(() => {
    if (openedHub) {
      setEditName(openedHub.name);
      setEditDesc(openedHub.description || "");
      setEditImage(openedHub.hubImage || "");
      setSettingsError("");
      setSettingsSuccess(false);
      fetchMembers(openedHub.id);
      fetchMeetings(openedHub.id);
      fetchAgentHistory(openedHub.id);
    }
  }, [openedHub]);

  useEffect(() => {
    const handleNotificationsUpdate = () => {
      if (openedHub) {
        fetchMembers(openedHub.id);
        fetchMeetings(openedHub.id);
      }
      fetchHubs();
    };
    window.addEventListener("notifications_updated", handleNotificationsUpdate);
    return () => {
      window.removeEventListener("notifications_updated", handleNotificationsUpdate);
    };
  }, [openedHub]);

  const fetchMembers = async (hubId: string) => {
    setLoadingMembers(true);
    setMembersError("");
    try {
      const res = await fetch(`/api/hubs/members?hubId=${hubId}`);
      if (res.ok) {
        const data = await res.json();
        setHubMembers({
          owner: data.owner || null,
          members: data.members || [],
          pending: data.pending || [],
          invitations: data.invitations || [],
          userRole: data.userRole || "member",
        });
      } else {
        const data = await res.json();
        setMembersError(data.error || "Failed to load member records.");
      }
    } catch {
      setMembersError("Failed to fetch member list due to a connection error.");
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleInviteLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setLookupLoading(true);
    setLookupError("");
    setLookedUpUser(null);
    setLookupSearched(false);

    try {
      const res = await fetch("/api/hubs/invite/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.exists) {
          setLookedUpUser(data.user);
        } else {
          setLookedUpUser(null);
        }
        setLookupSearched(true);
      } else {
        setLookupError(data.error || "Lookup failed.");
      }
    } catch {
      setLookupError("Failed to look up user.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!openedHub) return;
    setSendingInviteSpinner(true);
    setInviteError("");
    setInviteSuccess("");

    try {
      const res = await fetch("/api/hubs/invite/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          hubId: openedHub.id,
          customMessage: inviteCustomMsg,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setInviteSuccess(data.message || "Invitation sent successfully!");
        setInviteEmail("");
        setLookedUpUser(null);
        setLookupSearched(false);
        setInviteCustomMsg("");
        fetchMembers(openedHub.id);
        window.dispatchEvent(new Event("refresh_notifications"));
      } else {
        setInviteError(data.error || "Failed to send invitation.");
      }
    } catch {
      setInviteError("Network error. Please try again.");
    } finally {
      setSendingInviteSpinner(false);
    }
  };

  const handleApproveMember = (userId: string, name: string) => {
    if (!openedHub) return;
    setConfirmDialog({
      isOpen: true,
      title: "Approve Member Request",
      message: `Are you sure you want to approve ${name} to join this Hub?`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch("/api/hubs/members/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hubId: openedHub.id, userId }),
          });
          if (res.ok) {
            fetchMembers(openedHub.id);
            window.dispatchEvent(new Event("refresh_notifications"));
          } else {
            const data = await res.json();
            alert(data.error || "Failed to approve member.");
          }
        } catch {
          alert("Network error. Failed to approve member.");
        }
      }
    });
  };

  const handleRejectMember = (userId: string, name: string) => {
    if (!openedHub) return;
    setConfirmDialog({
      isOpen: true,
      title: "Reject Member Request",
      message: `Are you sure you want to reject ${name}'s request to join this Hub?`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch("/api/hubs/members/reject", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hubId: openedHub.id, userId }),
          });
          if (res.ok) {
            fetchMembers(openedHub.id);
            window.dispatchEvent(new Event("refresh_notifications"));
          } else {
            const data = await res.json();
            alert(data.error || "Failed to reject member.");
          }
        } catch {
          alert("Network error. Failed to reject member.");
        }
      }
    });
  };

  const handleResendInvite = (email: string) => {
    if (!openedHub) return;
    setConfirmDialog({
      isOpen: true,
      title: "Resend Invitation",
      message: `Are you sure you want to resend the invitation email to ${email}?`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch("/api/hubs/invite/resend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hubId: openedHub.id, email }),
          });
          if (res.ok) {
            alert("Invitation resent successfully!");
          } else {
            const data = await res.json();
            alert(data.error || "Failed to resend invitation.");
          }
        } catch {
          alert("Network error. Failed to resend invitation.");
        }
      }
    });
  };

  const handleRevokeInvite = (email: string) => {
    if (!openedHub) return;
    setConfirmDialog({
      isOpen: true,
      title: "Revoke Invitation",
      message: `Are you sure you want to revoke the invitation for ${email}? They will no longer be able to join using that link.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch("/api/hubs/invite/revoke", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hubId: openedHub.id, email }),
          });
          if (res.ok) {
            fetchMembers(openedHub.id);
          } else {
            const data = await res.json();
            alert(data.error || "Failed to revoke invitation.");
          }
        } catch {
          alert("Network error. Failed to revoke invitation.");
        }
      }
    });
  };

  const handleRemoveMember = (userId: string, name: string) => {
    if (!openedHub) return;
    setConfirmDialog({
      isOpen: true,
      title: "Remove Member",
      message: `Are you sure you want to remove ${name} from this Hub? They will immediately lose access.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch("/api/hubs/members/remove", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hubId: openedHub.id, userId }),
          });
          if (res.ok) {
            fetchMembers(openedHub.id);
          } else {
            const data = await res.json();
            alert(data.error || "Failed to remove member.");
          }
        } catch {
          alert("Network error. Failed to remove member.");
        }
      }
    });
  };

  const handleLeaveHub = () => {
    if (!openedHub) return;
    setConfirmDialog({
      isOpen: true,
      title: "Leave Hub",
      message: "Are you sure you want to leave this Hub?",
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch("/api/hubs/members/leave", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hubId: openedHub.id }),
          });
          if (res.ok) {
            setOpenedHub(null);
            setActiveTab("dashboard");
            fetchHubs();
          } else {
            const data = await res.json();
            alert(data.error || "Failed to leave hub.");
          }
        } catch {
          alert("Network error. Failed to leave hub.");
        }
      }
    });
  };

  const handleUpdateBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openedHub) return;
    setSavingSettings(true);
    setSettingsError("");
    setSettingsSuccess(false);

    try {
      const res = await fetch("/api/hubs/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hubId: openedHub.id,
          name: editName,
          description: editDesc,
          hubImage: editImage,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSettingsSuccess(true);
        setOpenedHub(prev => prev ? { ...prev, name: editName, description: editDesc, hubImage: editImage } : null);
        fetchHubs();
      } else {
        setSettingsError(data.error || "Failed to update settings.");
      }
    } catch {
      setSettingsError("Network error. Failed to update settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRequestDeleteHub = () => {
    if (!openedHub) return;
    setConfirmDialog({
      isOpen: true,
      title: "Delete Hub",
      message: `Are you sure you want to delete the Hub "${openedHub.name}"? This is a permanent, destructive action and cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch("/api/hubs/delete/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hubId: openedHub.id }),
          });
          if (res.ok) {
            setDeleteOtpCode("");
            setDeleteOtpError("");
            setDeleteOtpModalOpen(true);
          } else {
            const data = await res.json();
            alert(data.error || "Failed to request deletion.");
          }
        } catch {
          alert("Network error. Failed to initiate deletion.");
        }
      }
    });
  };

  const handleConfirmDeleteHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openedHub || !deleteOtpCode) return;
    setDeletingHubSpinner(true);
    setDeleteOtpError("");

    try {
      const res = await fetch("/api/hubs/delete/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hubId: openedHub.id, otp: deleteOtpCode }),
      });

      const data = await res.json();
      if (res.ok) {
        setDeleteOtpModalOpen(false);
        setOpenedHub(null);
        setActiveTab("dashboard");
        fetchHubs();
      } else {
        setDeleteOtpError(data.error || "Failed to confirm deletion.");
      }
    } catch {
      setDeleteOtpError("Network error. Failed to confirm deletion.");
    } finally {
      setDeletingHubSpinner(false);
    }
  };

  // Handle Hub Creation Submit
  const handleHubSubmit = async () => {
    setHubCreateError("");
    setCreatingHubSpinner(true);

    try {
      const res = await fetch("/api/hubs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: hubName,
          description: hubDescription,
          vaultPassword: vaultPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setHubCreateError(data.error || "Failed to create Hub.");
        setCreateStep("password"); // Fallback to password step to retry
        return;
      }

      // Success, get recovery code
      setGeneratedRecoveryCode(data.recoveryCode);
      setCreateStep("recovery");
    } catch {
      setHubCreateError("A network error occurred. Please try again.");
      setCreateStep("password");
    } finally {
      setCreatingHubSpinner(false);
    }
  };

  // Download recovery file
  const handleDownloadRecoveryFile = (name: string, code: string) => {
    const content = `Hub Name: ${name}\nRecovery Code: ${code}\nCreation Date: ${new Date().toLocaleDateString()}\n\nWarning: Save this file securely. This recovery code will only be shown once.`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recovery-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy recovery code
  const handleCopyRecoveryCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedRecovery(true);
    setTimeout(() => setCopiedRecovery(false), 2000);
  };

  // Finish Hub wizard
  const handleFinishWizard = () => {
    setCreateStep("idle");
    setHubName("");
    setHubDescription("");
    setVaultPassword("");
    setConfirmPassword("");
    setGeneratedRecoveryCode("");
    setSavedRecoveryCheck(false);
    fetchHubs(); // Refresh lists
  };

  // Phase 4 Meeting & Transcription Handlers

  // Start speech recognition for local participant
  const startLocalTranscription = (meetingId: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition not supported in this browser.");
      return;
    }

    try {
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = false;
      recog.lang = "en-US";

      recog.onresult = async (event: any) => {
        const resultIndex = event.resultIndex;
        const text = event.results[resultIndex][0].transcript;
        if (text && text.trim().length > 0) {
          try {
            await fetch("/api/meetings/transcript/append", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                meetingId,
                text: text.trim(),
                userEmail: user.email,
                livekitIdentity: user.email,
              }),
            });
            // Update local state to render immediately
            setTranscriptChunks((prev) => [
              ...prev,
              { speaker: user.name, text: text.trim() },
            ]);
          } catch (err) {
            console.error("Failed to append transcript chunk:", err);
          }
        }
      };

      recog.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== "aborted" && meetingStatus === "connected") {
          try { recog.start(); } catch {}
        }
      };

      recog.onend = () => {
        if (meetingStatus === "connected") {
          try { recog.start(); } catch {}
        }
      };

      recog.start();
      setRecognitionInstance(recog);
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
    }
  };

  const handleScheduleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openedHub) return;

    setSchedulingError("");
    setSchedulingSpinner(true);

    try {
      const res = await fetch("/api/meetings/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hubId: openedHub.id,
          title: schedTitle,
          description: schedDesc,
          scheduledAt: schedAt,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setWelcomeBanner("Meeting scheduled successfully and members notified!");
        setSchedTitle("");
        setSchedDesc("");
        setSchedAt("");
        fetchMeetings(openedHub.id);
      } else {
        setSchedulingError(data.error || "Failed to schedule meeting.");
      }
    } catch {
      setSchedulingError("A network error occurred. Please try again.");
    } finally {
      setSchedulingSpinner(false);
    }
  };

  const handleStartMeeting = (meeting: any) => {
    handleJoinMeeting(meeting);
  };

  const handleJoinMeeting = async (meeting: any) => {
    if (!openedHub) return;
    setMeetingStatus("connecting");
    setActiveMeeting(meeting);
    setTranscriptChunks([]);
    setMeetingTimer(0);

    try {
      const res = await fetch(`/api/meetings/token?meetingId=${meeting.id}`);
      const data = await res.json();

      if (res.ok) {
        setLivekitToken(data.token);
        setMeetingStatus("connected");
        const timerId = setInterval(() => {
          setMeetingTimer((prev) => prev + 1);
        }, 1000);
        (window as any)._meetingTimerInterval = timerId;

        startLocalTranscription(meeting.id);
      } else {
        alert(data.error || "Failed to join meeting.");
        setMeetingStatus("ended");
        setActiveMeeting(null);
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Failed to join meeting.");
      setMeetingStatus("ended");
      setActiveMeeting(null);
    }
  };

  const handleEndMeeting = async () => {
    if (!activeMeeting || !openedHub) return;

    if (recognitionInstance) {
      try {
        recognitionInstance.onend = null;
        recognitionInstance.stop();
      } catch {}
      setRecognitionInstance(null);
    }

    if ((window as any)._meetingTimerInterval) {
      clearInterval((window as any)._meetingTimerInterval);
      (window as any)._meetingTimerInterval = null;
    }

    const currentDuration = meetingTimer;
    setMeetingStatus("ended");

    try {
      await fetch("/api/meetings/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: activeMeeting.id }),
      });
    } catch (err) {
      console.error("Failed to mark meeting as ended on server:", err);
    }

    setIsAnalyzing(true);
    setShowReviewScreen(false);

    try {
      const res = await fetch("/api/meetings/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: activeMeeting.id }),
      });
      const data = await res.json();

      if (res.ok) {
        setAnalysisDraft({
          ...data.draft,
          duration: currentDuration,
        });
        setShowReviewScreen(true);
      } else {
        alert(data.error || "Failed to analyze transcript.");
        setActiveMeeting(null);
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Failed to generate AI analysis.");
      setActiveMeeting(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLeaveMeeting = () => {
    if (recognitionInstance) {
      try {
        recognitionInstance.onend = null;
        recognitionInstance.stop();
      } catch {}
      setRecognitionInstance(null);
    }

    if ((window as any)._meetingTimerInterval) {
      clearInterval((window as any)._meetingTimerInterval);
      (window as any)._meetingTimerInterval = null;
    }

    setMeetingStatus("ended");
    setActiveMeeting(null);
    setLivekitToken(null);
    setTranscriptChunks([]);
  };

  const handleApproveMeeting = async (finalTitle: string, finalSummary: any, finalAssignments: any[], finalScore: any) => {
    if (!activeMeeting || !openedHub) return;

    try {
      const res = await fetch("/api/meetings/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId: activeMeeting.id,
          title: finalTitle,
          date: activeMeeting.scheduledAt,
          duration: analysisDraft.duration,
          summary: finalSummary,
          assignments: finalAssignments,
          score: finalScore,
        }),
      });

      if (res.ok) {
        setWelcomeBanner("Meeting approved and secure record saved to Vault!");
        setShowReviewScreen(false);
        setAnalysisDraft(null);
        setActiveMeeting(null);
        fetchMeetings(openedHub.id);
        fetchMembers(openedHub.id);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to approve meeting.");
      }
    } catch {
      alert("Network error. Failed to approve meeting.");
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitTaskMeetingId || submitTaskIndex === null || !submitTaskDesc.trim()) return;
    setSubmittingWorkSpinner(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/meetings/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultMeetingId: submitTaskMeetingId,
          taskIndex: submitTaskIndex,
          title: submitTaskTitle,
          description: submitTaskDesc,
          attachments: submitTaskAttachments,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitTaskModalOpen(false);
        setSubmitTaskTitle("");
        setSubmitTaskDesc("");
        setSubmitTaskAttachments([]);
        setNewAttachmentUrl("");
        setWelcomeBanner("Work submitted successfully!");
        if (openedHub) {
          fetchMeetings(openedHub.id);
        }
      } else {
        setSubmitError(data.error || "Failed to submit work.");
      }
    } catch {
      setSubmitError("Network error. Failed to submit work.");
    } finally {
      setSubmittingWorkSpinner(false);
    }
  };

  const handleReviewSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewSubmissionId || !reviewTaskMeetingId || reviewTaskIndex === null) return;
    if (reviewAction === "reject" && !reviewFeedback.trim()) {
      setReviewError("Feedback is required when rejecting a submission.");
      return;
    }
    setReviewSpinner(true);
    setReviewError("");

    try {
      const res = await fetch("/api/meetings/review-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultMeetingId: reviewTaskMeetingId,
          taskIndex: reviewTaskIndex,
          action: reviewAction,
          feedback: reviewFeedback,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setReviewSubmissionModalOpen(false);
        setReviewFeedback("");
        setWelcomeBanner(`Submission successfully ${reviewAction}d!`);
        if (openedHub) {
          fetchMeetings(openedHub.id);
        }
      } else {
        setReviewError(data.error || "Failed to submit review.");
      }
    } catch {
      setReviewError("Network error. Failed to submit review.");
    } finally {
      setReviewSpinner(false);
    }
  };

  const handleUpdateVaultRecord = async (
    vaultMeetingId: string,
    title: string,
    summary: any,
    assignments: any[],
    score: any,
    changeReason: string
  ) => {
    setUpdatingRecordSpinner(true);
    setUpdatingRecordError("");

    try {
      const res = await fetch("/api/meetings/update-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultMeetingId,
          title,
          summary,
          assignments,
          score,
          changeReason,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setWelcomeBanner(`Meeting record updated to Version ${data.activeVersionNumber}!`);
        setEditingRecord(null);
        setEditRecordChangeReason("");
        if (openedHub) {
          fetchMeetings(openedHub.id);
        }
      } else {
        setUpdatingRecordError(data.error || "Failed to update meeting record.");
      }
    } catch {
      setUpdatingRecordError("Network error. Failed to update meeting record.");
    } finally {
      setUpdatingRecordSpinner(false);
    }
  };

  // Handle Unlock Vault Password
  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openedHub) return;

    setUnlockError("");
    setUnlockingSpinner(true);

    try {
      const res = await fetch("/api/hubs/vault/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hubId: openedHub.id,
          password: unlockPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setUnlockError(data.error || "Invalid password.");
        return;
      }

      // Success - add to unlocked list
      setUnlockedHubs((prev) => [...prev, openedHub.id]);
      setUnlockPassword("");
    } catch {
      setUnlockError("Network error. Please try again.");
    } finally {
      setUnlockingSpinner(false);
    }
  };

  // Handle Recover Vault Access
  const handleRecoverVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openedHub) return;

    setUnlockError("");
    setUnlockingSpinner(true);

    try {
      const res = await fetch("/api/hubs/vault/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hubId: openedHub.id,
          recoveryCode: unlockRecoveryCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setUnlockError(data.error || "Invalid recovery code.");
        return;
      }

      // Success - add to unlocked list
      setUnlockedHubs((prev) => [...prev, openedHub.id]);
      setUnlockRecoveryCode("");
      setUnlockMode("password");
    } catch {
      setUnlockError("Network error. Please try again.");
    } finally {
      setUnlockingSpinner(false);
    }
  };

  const handleOpenHub = (hub: HubItem) => {
    setOpenedHub(hub);
    setOpenedHubTab("overview");
    setUnlockPassword("");
    setUnlockRecoveryCode("");
    setUnlockMode("password");
    setUnlockError("");
    fetchMembers(hub.id);
  };
  return (
    <div className="flex-1 flex w-full max-w-7xl mx-auto px-6 py-8 gap-8 items-stretch relative min-h-[calc(100vh-64px)] z-10">
      
      {/* 1. Sidebar Panel */}
      {!openedHub ? (
        <aside className="w-64 shrink-0 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-slate-950/40 p-4 flex flex-col gap-1.5 shadow-sm">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab("owned-hubs")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "owned-hubs"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
            }`}
          >
            <ShieldAlert className="w-5 h-5" />
            Owned Hubs
            {ownedHubs.length > 0 && (
              <span className={`ml-auto px-2 py-0.5 rounded-full text-3xs font-bold ${activeTab === "owned-hubs" ? "bg-white text-primary" : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400"}`}>
                {ownedHubs.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("member-hubs")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "member-hubs"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
            }`}
          >
            <Users className="w-5 h-5" />
            Member Hubs
            {memberHubs.length > 0 && (
              <span className={`ml-auto px-2 py-0.5 rounded-full text-3xs font-bold ${activeTab === "member-hubs" ? "bg-white text-primary" : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400"}`}>
                {memberHubs.length}
              </span>
            )}
          </button>

          {pendingHubs.length > 0 && (
            <button
              onClick={() => setActiveTab("pending-hubs")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "pending-hubs"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
              }`}
            >
              <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
              Pending Hubs
              <span className={`ml-auto px-2 py-0.5 rounded-full text-3xs font-bold ${activeTab === "pending-hubs" ? "bg-white text-primary" : "bg-amber-500/10 text-amber-500"}`}>
                {pendingHubs.length}
              </span>
            </button>
          )}

          <div className="h-px bg-slate-100 dark:bg-slate-900 my-2" />

          <button
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "profile"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
            }`}
          >
            <User className="w-5 h-5" />
            Profile
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "settings"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
            }`}
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </aside>
      ) : (
        <aside className="w-64 shrink-0 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-slate-950/40 p-4 flex flex-col gap-1.5 shadow-sm">
          {/* Hub Branding Image & Header */}
          <div className="flex flex-col items-center gap-3 p-3.5 mb-2 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
            {openedHub.hubImage ? (
              <img
                src={openedHub.hubImage}
                alt={openedHub.name}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-red-500/10 dark:bg-red-950/20 flex items-center justify-center text-primary">
                <Flame className="w-6 h-6" />
              </div>
            )}
            <div className="text-center overflow-hidden w-full">
              <span className="block font-black text-sm text-slate-900 dark:text-white truncate">
                {openedHub.name}
              </span>
              <span className="inline-flex mt-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-3xs font-extrabold uppercase tracking-wide border border-red-500/10">
                {openedHub.role}
              </span>
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-900 my-1" />

          {/* Hub Tabs */}
          <button
            onClick={() => setOpenedHubTab("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
              openedHubTab === "overview"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
            }`}
          >
            <FolderOpen className="w-5 h-5" />
            Overview
          </button>

          <button
            onClick={() => setOpenedHubTab("meetings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
              openedHubTab === "meetings"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
            }`}
          >
            <Video className="w-5 h-5" />
            Meetings
          </button>

          <button
            onClick={() => setOpenedHubTab("assignments")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
              openedHubTab === "assignments"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
            }`}
          >
            <CheckCircle className="w-5 h-5" />
            Assignments
          </button>

          <button
            onClick={() => setOpenedHubTab("agent")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
              openedHubTab === "agent"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
            }`}
          >
            <Sparkles className="w-5 h-5" />
            AI Assistant
          </button>

          <button
            onClick={() => setOpenedHubTab("vault")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
              openedHubTab === "vault"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
            }`}
          >
            {unlockedHubs.includes(openedHub.id) ? (
              <Unlock className="w-5 h-5 text-emerald-500" />
            ) : (
              <Lock className="w-5 h-5" />
            )}
            Vault Storage
          </button>

          <button
            onClick={() => setOpenedHubTab("members")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
              openedHubTab === "members"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
            }`}
          >
            <Users className="w-5 h-5" />
            Members
            {hubMembers.pending.length > 0 && (
              <span className="ml-auto w-2 h-2 rounded-full bg-red-600 animate-pulse animate-duration-1000" />
            )}
          </button>

          {openedHub.role === "Owner" && (
            <button
              onClick={() => setOpenedHubTab("settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                openedHubTab === "settings"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
              }`}
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          )}

          <div className="h-px bg-slate-100 dark:bg-slate-900 my-2 mt-auto" />

          {/* Leave Hub Button (only show if role !== owner) */}
          {openedHub.actualRole !== "owner" && (
            <button
              onClick={handleLeaveHub}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all cursor-pointer mb-1"
            >
              <LogOut className="w-5 h-5 text-red-500" />
              Leave Hub
            </button>
          )}

          <button
            onClick={() => setOpenedHub(null)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
        </aside>
      )}

      {/* 2. Main Content Area */}
      <section className="flex-1 flex flex-col min-w-0">
        
        {/* Banner Alert Toast */}
        {welcomeBanner && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400 text-center animate-in fade-in slide-in-from-top-3 duration-300">
            <Sparkles className="inline-block w-4 h-4 mr-1.5 text-emerald-500 animate-pulse" /> {welcomeBanner}
          </div>
        )}

        {openedHub ? (
          /* Opened Hub Content View */
          <div className="flex-1 flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Overview Tab */}
            {openedHubTab === "overview" && (
              <div className="space-y-6">
                <div className="p-8 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-slate-950/40 shadow-sm flex flex-col md:flex-row items-center gap-6">
                  {openedHub.hubImage ? (
                    <img
                      src={openedHub.hubImage}
                      alt={openedHub.name}
                      className="w-24 h-24 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shadow-inner shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-red-500/10 dark:bg-red-950/20 flex items-center justify-center text-primary shrink-0">
                      <Flame className="w-12 h-12" />
                    </div>
                  )}
                  <div className="text-center md:text-left min-w-0 flex-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                      {openedHub.name}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-xl">
                      {openedHub.description || "No description set for this Hub workspace."}
                    </p>
                    <div className="flex items-center justify-center md:justify-start gap-4 mt-4 text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        Created {new Date(openedHub.createdAt).toLocaleDateString()}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        {(hubMembers.owner ? 1 : 0) + hubMembers.members.length} Members
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info Card */}
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-900 text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-200 mb-2 uppercase tracking-wide text-2xs">Workspace Integrity Policies</h3>
                  <ul className="space-y-2 list-disc pl-4">
                    <li>This workspace is secure and all invitations are private.</li>
                    <li>Membership status requires administrator validation.</li>
                    <li>Decryption keys for vault storage are stored strictly hashed in Atlas.</li>
                  </ul>
                </div>
              </div>
            )}
            {/* Meetings Tab */}
            {openedHubTab === "meetings" && (
              <div className="space-y-6">
                {/* 1. Meeting Connecting State */}
                {meetingStatus === "connecting" && (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-1">Connecting to Room</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold max-w-xs leading-relaxed">
                      Establishing connection to CatchUp LiveKit nodes and verifying user identity...
                    </p>
                  </div>
                )}

                {/* 2. Live Meeting Room View */}
                {meetingStatus === "connected" && activeMeeting && (
                  <div className="flex-1 flex flex-col gap-6 animate-in fade-in">
                    {/* Meeting Header */}
                    <div className="p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-3xs font-extrabold uppercase tracking-wide border border-red-500/10 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Live Session
                        </span>
                        <h2 className="text-lg font-black text-slate-950 dark:text-white mt-1.5">{activeMeeting.title}</h2>
                        <p className="text-3xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                          Room: {activeMeeting.livekitRoomId}
                        </p>
                      </div>

                      {/* Timer Display */}
                      <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>
                          {Math.floor(meetingTimer / 3600).toString().padStart(2, "0")}:
                          {Math.floor((meetingTimer % 3600) / 60).toString().padStart(2, "0")}:
                          {(meetingTimer % 60).toString().padStart(2, "0")}
                        </span>
                      </div>
                    </div>

                    {/* Room Layout Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                      {/* Video/Audio Feeds Panel (2/3 columns) */}
                      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-fr">
                        {/* Box 1: Local User (Self Feed) */}
                        <div className="p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-slate-950 text-white flex flex-col justify-between min-h-[260px] relative overflow-hidden shadow-inner group">
                          {/* Animated Voice/Waveform background when camera off */}
                          {!localVideoEnabled && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-10">
                              <div className="flex items-end gap-1 h-20">
                                <div className="w-1 bg-white animate-bounce animate-duration-1000 h-12" />
                                <div className="w-1 bg-white animate-bounce animate-duration-700 h-20" />
                                <div className="w-1 bg-white animate-bounce animate-duration-1000 h-16" />
                                <div className="w-1 bg-white animate-bounce animate-duration-500 h-8" />
                                <div className="w-1 bg-white animate-bounce animate-duration-700 h-14" />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between z-10">
                            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Local User (Host)</span>
                            <span className="flex items-center gap-1">
                              {!localAudioEnabled && <MicOff className="w-4 h-4 text-red-500" />}
                              {!localVideoEnabled && <VideoOff className="w-4 h-4 text-red-500" />}
                            </span>
                          </div>

                          <div className="flex flex-col items-center justify-center flex-1 py-4 z-10">
                            {localVideoEnabled ? (
                              <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 shadow-md">
                                <Video className="w-8 h-8 text-primary animate-pulse" />
                              </div>
                            ) : (
                              <div className="w-20 h-20 rounded-full bg-red-500/10 text-primary border border-red-500/20 flex items-center justify-center font-extrabold text-xl shadow-md">
                                {getInitials(user.name)}
                              </div>
                            )}
                            <span className="block font-black text-sm text-slate-200 mt-3">{user.name}</span>
                            <span className="block text-3xs text-slate-500 font-semibold mt-0.5">{user.email}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-3xs font-extrabold uppercase tracking-wider text-slate-400 z-10">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Connected
                          </div>
                        </div>

                        {/* Box 2: Guest/Mock Participant Box */}
                        <div className="p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex flex-col justify-between min-h-[260px] relative overflow-hidden shadow-inner select-none">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Remote Participant</span>
                          </div>

                          <div className="flex flex-col items-center justify-center flex-1 py-4 text-slate-400 dark:text-slate-600">
                            <Users className="w-12 h-12 mb-3 opacity-60" />
                            <span className="block font-bold text-xs">Waiting for participants...</span>
                            <span className="block text-3xs text-slate-500 mt-1">Share the Hub credentials or send invitations to join.</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-3xs font-extrabold uppercase tracking-wider text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                            Disconnected
                          </div>
                        </div>
                      </div>

                      {/* Right Panel: Transcription Feed (1/3 column) */}
                      <div className="p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col gap-4 max-h-[380px] lg:max-h-none shadow-sm min-h-[320px]">
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-905 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                            Live Transcription
                          </h3>
                          <p className="text-3xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Capturing spoken dialogue and mapping speakers in real-time.</p>
                        </div>

                        {/* Transcript log scroll wrapper */}
                        <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-900/60 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl p-4 font-sans text-xs space-y-3 scrollbar-thin">
                          {transcriptChunks.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
                              <span className="w-2 h-2 rounded-full bg-primary animate-ping mb-2" />
                              <span className="font-bold text-3xs uppercase tracking-wider">Listening for audio...</span>
                              <span className="text-3xs text-slate-400 mt-0.5 leading-relaxed max-w-[180px]">Start speaking to test browser speech capture.</span>
                            </div>
                          ) : (
                            transcriptChunks.map((chunk, idx) => (
                              <div key={idx} className="flex flex-col gap-1 select-text">
                                <span className="font-extrabold text-[10px] text-primary">{chunk.speaker}:</span>
                                <p className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 leading-normal font-medium shadow-sm">
                                  {chunk.text}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Room Control Bar */}
                    <div className="p-4 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between gap-4 shadow-sm select-none">
                      {/* Audio/Video Mutes */}
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => setLocalAudioEnabled(!localAudioEnabled)}
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                            localAudioEnabled
                              ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-850 hover:bg-slate-100 text-slate-700 dark:text-slate-300"
                              : "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                          }`}
                        >
                          {localAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                        </button>

                        <button
                          onClick={() => setLocalVideoEnabled(!localVideoEnabled)}
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                            localVideoEnabled
                              ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-850 hover:bg-slate-100 text-slate-700 dark:text-slate-300"
                              : "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                          }`}
                        >
                          {localVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                        </button>

                        <button
                          onClick={() => setScreenShareEnabled(!screenShareEnabled)}
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                            screenShareEnabled
                              ? "bg-primary text-primary-foreground border-transparent shadow-md shadow-primary/15"
                              : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-850 hover:bg-slate-100 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <Monitor className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Exit Meeting Action */}
                      <div>
                        {openedHub.role === "Owner" ? (
                          <button
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                title: "End Meeting Session",
                                message: "Are you sure you want to end this meeting? This will terminate transcription and generate AI analysis.",
                                onConfirm: () => {
                                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                  handleEndMeeting();
                                }
                              });
                            }}
                            className="px-6 py-2.5 rounded-2xl bg-primary hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                          >
                            End Meeting
                          </button>
                        ) : (
                          <button
                            onClick={handleLeaveMeeting}
                            className="px-6 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                          >
                            Leave Meeting
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. AI Analysis Processing State */}
                {isAnalyzing && (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
                    <div className="relative mb-6">
                      <Sparkles className="w-12 h-12 text-primary animate-bounce" />
                      <Loader2 className="w-12 h-12 text-slate-200 dark:text-slate-800 border-t-primary animate-spin absolute inset-0" />
                    </div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-1">Processing AI Analytics</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold max-w-sm leading-relaxed p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-900">
                      Generating structured summaries, capturing action points, and validating assignments using Gemini 1.5 Pro... Please do not close this window.
                    </p>
                  </div>
                )}

                {/* 4. Owner Review and Approval Panel */}
                {showReviewScreen && analysisDraft && (
                  <div className="flex-1 flex flex-col gap-6 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-black text-slate-950 dark:text-white">AI Meeting Output Review</h2>
                        <p className="text-2xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Edit topics, override assignments, and configure deadlines before approving Vault storage.</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              title: "Discard Draft",
                              message: "Are you sure you want to discard this analysis? The transcript record remains safe in history, but this draft summary will be deleted.",
                              onConfirm: () => {
                                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                setShowReviewScreen(false);
                                setAnalysisDraft(null);
                                setActiveMeeting(null);
                              }
                            });
                          }}
                          className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
                        >
                          Discard
                        </button>
                        <button
                          onClick={() => handleApproveMeeting(analysisDraft.topic, analysisDraft, analysisDraft.assignments, analysisDraft.score)}
                          className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Approve & Store
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                      {/* Review details (2/3 columns) */}
                      <div className="lg:col-span-2 space-y-6">
                        {/* Title and Overview Panel */}
                        <div className="p-8 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">
                              Meeting Topic / Title
                            </label>
                            <input
                              type="text"
                              required
                              value={analysisDraft.topic}
                              onChange={(e) => setAnalysisDraft({ ...analysisDraft, topic: e.target.value })}
                              className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:border-red-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">
                              Discussion Overview
                            </label>
                            <textarea
                              rows={4}
                              value={analysisDraft.overview}
                              onChange={(e) => setAnalysisDraft({ ...analysisDraft, overview: e.target.value })}
                              className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-red-500 leading-relaxed"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div>
                              <span className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1">Outcome Summary</span>
                              <input
                                type="text"
                                value={analysisDraft.outcome}
                                onChange={(e) => setAnalysisDraft({ ...analysisDraft, outcome: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:border-red-500"
                              />
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1">Meeting Duration</span>
                              <span className="block px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-150 dark:border-slate-850">
                                {formatDuration(analysisDraft.duration)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Decisions Panel */}
                        <div className="p-8 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Decisions Extracted</span>
                            <button
                              type="button"
                              onClick={() => {
                                const decs = [...(analysisDraft.decisions || [])];
                                decs.push("New Decision Item");
                                setAnalysisDraft({ ...analysisDraft, decisions: decs });
                              }}
                              className="text-3xs font-extrabold uppercase tracking-wide text-primary hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              Add Decision
                            </button>
                          </div>

                          <div className="space-y-3">
                            {(analysisDraft.decisions || []).length === 0 ? (
                              <p className="text-2xs text-slate-400 italic">No key decisions extracted.</p>
                            ) : (
                              (analysisDraft.decisions || []).map((dec: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={dec}
                                    onChange={(e) => {
                                      const decs = [...(analysisDraft.decisions || [])];
                                      decs[idx] = e.target.value;
                                      setAnalysisDraft({ ...analysisDraft, decisions: decs });
                                    }}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:border-red-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const decs = (analysisDraft.decisions || []).filter((_: any, i: number) => i !== idx);
                                      setAnalysisDraft({ ...analysisDraft, decisions: decs });
                                    }}
                                    className="p-2.5 rounded-xl border border-red-500/10 hover:bg-red-500/10 text-red-500 transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Assignments Panel */}
                        <div className="p-8 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-extrabold text-sm text-slate-955 dark:text-white">Assignments</h3>
                              <p className="text-3xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Configure tasks and deadlines assigned to members.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const assigns = [...(analysisDraft.assignments || [])];
                                assigns.push({
                                  memberEmail: "",
                                  memberName: "",
                                  task: "New Task Description",
                                  deadline: null,
                                });
                                setAnalysisDraft({ ...analysisDraft, assignments: assigns });
                              }}
                              className="text-3xs font-extrabold uppercase tracking-wide text-primary hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              Add Task
                            </button>
                          </div>

                          <div className="space-y-4">
                            {(analysisDraft.assignments || []).length === 0 ? (
                              <p className="text-2xs text-slate-400 italic">No task assignments extracted.</p>
                            ) : (
                              (analysisDraft.assignments || []).map((assign: any, idx: number) => (
                                <div key={idx} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 flex flex-col gap-3 relative animate-in fade-in">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const assigns = (analysisDraft.assignments || []).filter((_: any, i: number) => i !== idx);
                                      setAnalysisDraft({ ...analysisDraft, assignments: assigns });
                                    }}
                                    className="absolute top-4 right-4 p-2 rounded-xl hover:bg-red-500/10 text-red-500 transition-all cursor-pointer border border-transparent hover:border-red-500/10"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mr-10">
                                    <div>
                                      <span className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1">Assignee Name</span>
                                      <input
                                        type="text"
                                        required
                                        value={assign.memberName}
                                        onChange={(e) => {
                                          const assigns = [...(analysisDraft.assignments || [])];
                                          assigns[idx].memberName = e.target.value;
                                          setAnalysisDraft({ ...analysisDraft, assignments: assigns });
                                        }}
                                        placeholder="Name"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200/85 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <span className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1">Assignee Email</span>
                                      <input
                                        type="email"
                                        required
                                        value={assign.memberEmail}
                                        onChange={(e) => {
                                          const assigns = [...(analysisDraft.assignments || [])];
                                          assigns[idx].memberEmail = e.target.value;
                                          setAnalysisDraft({ ...analysisDraft, assignments: assigns });
                                        }}
                                        placeholder="email@example.com"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200/85 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="sm:col-span-2">
                                      <span className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1">Assigned Task</span>
                                      <input
                                        type="text"
                                        required
                                        value={assign.task}
                                        onChange={(e) => {
                                          const assigns = [...(analysisDraft.assignments || [])];
                                          assigns[idx].task = e.target.value;
                                          setAnalysisDraft({ ...analysisDraft, assignments: assigns });
                                        }}
                                        placeholder="Task instructions"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200/85 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <span className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1">Task Deadline</span>
                                      <input
                                        type="date"
                                        value={assign.deadline || ""}
                                        onChange={(e) => {
                                          const assigns = [...(analysisDraft.assignments || [])];
                                          assigns[idx].deadline = e.target.value || null;
                                          setAnalysisDraft({ ...analysisDraft, assignments: assigns });
                                        }}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200/85 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none font-mono"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* AI Quality Metrics drawer (1/3 column) */}
                      <div className="p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm space-y-5 select-none">
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-955 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            AI Quality Index
                          </h3>
                          <p className="text-3xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Speech clarity & transcript confidence calculations.</p>
                        </div>

                        <div className="flex flex-col items-center justify-center py-6 relative">
                          <span className="text-4xl font-black text-slate-950 dark:text-white">{analysisDraft.score?.overall}%</span>
                          <span className="text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5">Overall Quality Score</span>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-3xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                              <span>Audio Fidelity</span>
                              <span>{analysisDraft.score?.audio}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${analysisDraft.score?.audio}%` }} />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-3xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                              <span>Transcription Confidence</span>
                              <span>{analysisDraft.score?.transcriptConfidence}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${analysisDraft.score?.transcriptConfidence}%` }} />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-3xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                              <span>Speech Clarity</span>
                              <span>{analysisDraft.score?.clarity}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${analysisDraft.score?.clarity}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Default Meetings List and Schedule View */}
                {!showReviewScreen && !isAnalyzing && meetingStatus === "ended" && (
                  <div className="space-y-8 animate-in fade-in">
                    {/* Schedule Meeting Section (Owner Only) */}
                    {openedHub.role === "Owner" && (
                      <div className="p-8 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm flex flex-col gap-4">
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-955 dark:text-white flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            Schedule New Meeting
                          </h3>
                          <p className="text-2xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Arrange upcoming dialogue sessions and trigger notifications for members.</p>
                        </div>

                        {schedulingError && (
                          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-900/30 text-2xs text-red-600 dark:text-red-400 font-bold text-center leading-relaxed">
                            {schedulingError}
                          </div>
                        )}

                        <form onSubmit={handleScheduleMeetingSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                          <div>
                            <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">Meeting Title</label>
                            <input
                              type="text"
                              required
                              value={schedTitle}
                              onChange={(e) => setSchedTitle(e.target.value)}
                              placeholder="Sprint Sync / Design Review"
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:border-red-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">Scheduled At</label>
                            <input
                              type="datetime-local"
                              required
                              value={schedAt}
                              onChange={(e) => setSchedAt(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:border-red-500 font-mono"
                            />
                          </div>

                          <div>
                            <button
                              type="submit"
                              disabled={schedulingSpinner || !schedTitle || !schedAt}
                              className="w-full py-3 rounded-xl bg-primary hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                            >
                              {schedulingSpinner ? "Scheduling..." : "Schedule Meeting"}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Upcoming Meetings Grid */}
                    <div className="space-y-4">
                      <h3 className="font-extrabold text-xs text-slate-405 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500" />
                        Upcoming Scheduled Sessions
                      </h3>

                      {meetings.length === 0 ? (
                        <div className="p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center bg-white dark:bg-slate-950/20">
                          <Video className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
                          <span className="block font-bold text-sm text-slate-700 dark:text-slate-300">No Meetings Scheduled</span>
                          <span className="block text-2xs text-slate-400 dark:text-slate-500 mt-1 leading-normal max-w-[200px] mx-auto">
                            {openedHub.role === "Owner"
                              ? "Schedule a meeting session above to kick off transcription analytics."
                              : "Ask the Hub Owner to schedule a new meeting session."}
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {meetings.map((m) => {
                            const isLive = m.status === "active";
                            const startText = new Date(m.scheduledAt).toLocaleString();
                            const countdownText = getCountdownText(m.scheduledAt);

                            return (
                              <div key={m.id} className="p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col justify-between gap-5 shadow-sm animate-in fade-in">
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-3xs font-mono font-bold text-slate-400 dark:text-slate-500">
                                      {startText}
                                    </span>
                                    {isLive ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 text-[10px] font-extrabold uppercase border border-red-500/10 animate-pulse">
                                        <span className="w-1 h-1 rounded-full bg-red-500" />
                                        LIVE NOW
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
                                        {countdownText}
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white mt-3 leading-snug">
                                    {m.title}
                                  </h4>
                                  {m.description && (
                                    <p className="text-2xs text-slate-500 dark:text-slate-400 font-semibold mt-1 max-w-xs truncate leading-normal">
                                      {m.description}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center justify-end">
                                  {openedHub.role === "Owner" ? (
                                    <button
                                      onClick={() => handleStartMeeting(m)}
                                      className="px-4 py-2 rounded-xl bg-primary hover:opacity-90 text-white font-bold text-2xs transition-all shadow-sm cursor-pointer"
                                    >
                                      Start Session
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleJoinMeeting(m)}
                                      className="px-4 py-2 rounded-xl bg-primary hover:opacity-90 text-white font-bold text-2xs transition-all shadow-sm cursor-pointer disabled:opacity-40"
                                    >
                                      Join Session
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Vault Storage Tab */}
            {openedHubTab === "vault" && (
              <div className="flex-1 flex flex-col justify-center">
                {!unlockedHubs.includes(openedHub.id) ? (
                  /* Lock Screen inline prompt */
                  <div className="w-full max-w-[420px] mx-auto rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-xl flex flex-col items-center">
                    <div className="w-11 h-11 rounded-xl bg-red-500/10 dark:bg-red-950/20 flex items-center justify-center text-primary mb-4 shadow-sm">
                      <Lock className="w-5 h-5" />
                    </div>

                    <h2 className="font-extrabold text-lg text-slate-900 dark:text-white mb-1">Unlock Vault</h2>
                    <p className="text-2xs text-slate-500 dark:text-slate-400 font-semibold mb-6">
                      Decryption password required to open vault storage.
                    </p>

                    {unlockError && (
                      <div className="w-full mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-900/30 text-2xs text-red-600 dark:text-red-400 font-semibold text-center leading-relaxed">
                        {unlockError}
                      </div>
                    )}

                    {unlockMode === "password" ? (
                      <form onSubmit={handleUnlockVault} className="w-full space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">
                            Vault Password
                          </label>
                          <input
                            type="password"
                            required
                            value={unlockPassword}
                            onChange={(e) => setUnlockPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={unlockingSpinner || !unlockPassword}
                          className="w-full py-3.5 rounded-2xl bg-primary hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                        >
                          {unlockingSpinner ? "Decrypting..." : "Unlock Vault"}
                        </button>

                        <div className="text-center pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setUnlockMode("recovery");
                              setUnlockError("");
                            }}
                            className="text-2xs font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                          >
                            Forgot Password?
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={handleRecoverVault} className="w-full space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">
                            Recovery Code
                          </label>
                          <input
                            type="text"
                            required
                            value={unlockRecoveryCode}
                            onChange={(e) => setUnlockRecoveryCode(e.target.value)}
                            placeholder="AB7X-PQ29-ZM81-RK44"
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="submit"
                            disabled={unlockingSpinner || !unlockRecoveryCode}
                            className="flex-1 py-3.5 rounded-2xl bg-primary hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                          >
                            {unlockingSpinner ? "Recovering..." : "Recover"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUnlockMode("password");
                              setUnlockError("");
                            }}
                            className="flex-1 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                          >
                            Go Back
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  /* Decrypted vault storage content */
                  <div className="space-y-6">
                    <div className="p-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-4 text-emerald-600 dark:text-emerald-400">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <Unlock className="w-5 h-5 animate-pulse animate-duration-1000" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm">Vault Decrypted</h4>
                        <p className="text-2xs font-semibold uppercase tracking-wider opacity-85 mt-0.5">Secure Credentials Verified</p>
                      </div>
                      <button
                        onClick={() => setUnlockedHubs(prev => prev.filter(id => id !== openedHub.id))}
                        className="ml-auto px-3 py-1.5 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/10 text-2xs font-extrabold transition-all cursor-pointer"
                      >
                        Lock Vault
                      </button>
                    </div>

                    {/* List of Decrypted Meetings */}
                    {vaultMeetings.length === 0 ? (
                      <div className="p-12 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                        <FolderOpen className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                        <h4 className="font-bold text-sm text-slate-700 dark:text-slate-350">No Decrypted Meeting Records</h4>
                        <p className="text-2xs text-slate-400 dark:text-slate-500 mt-1 max-w-[280px] mx-auto leading-normal font-semibold">
                          Approved meeting summaries and vault-locked transcription analytics will be listed here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {vaultMeetings.map((meeting) => {
                          const isExpanded = expandedMeetingId === meeting.id;
                          const formattedDate = new Date(meeting.date).toLocaleDateString();
                          const formattedDuration = formatDuration(meeting.duration);

                          // Check if any assignment deadline has passed (Lock Record Check)
                          const todayStr = new Date().toISOString().split("T")[0];
                          const hasPassedDeadline = (meeting.assignments || []).some((assign: any) => {
                            return assign.deadline && assign.deadline < todayStr;
                          });

                          return (
                            <div
                              key={meeting.id}
                              className="rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden transition-all duration-200"
                            >
                              {/* Header Card */}
                              <div
                                onClick={() => setExpandedMeetingId(isExpanded ? null : meeting.id)}
                                className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-all select-none"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-red-500/10 dark:bg-red-955/20 text-primary flex items-center justify-center font-extrabold">
                                    <Video className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                                      {meeting.title}
                                    </h4>
                                    <div className="flex items-center gap-3 text-3xs font-semibold text-slate-450 dark:text-slate-500 mt-0.5">
                                      <span>Date: {formattedDate}</span>
                                      <span>•</span>
                                      <span>Duration: {formattedDuration}</span>
                                      <span>•</span>
                                      <span>Version: V{meeting.activeVersionNumber}</span>
                                      {hasPassedDeadline && (
                                        <>
                                          <span>•</span>
                                          <span className="text-amber-500 font-bold uppercase tracking-wider">Historical Lock</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <ChevronRight
                                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                                    isExpanded ? "rotate-90 text-primary" : ""
                                  }`}
                                />
                              </div>

                              {/* Expanded Content */}
                              {isExpanded && (
                                <div className="border-t border-slate-100 dark:border-slate-900 p-6 space-y-6 bg-slate-50/30 dark:bg-slate-900/5 animate-in fade-in duration-200">
                                  {/* Overview */}
                                  <div>
                                    <span className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1">
                                      Overview Summary
                                    </span>
                                    <p className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed font-semibold">
                                      {meeting.summary?.overview || "No overview available."}
                                    </p>
                                  </div>

                                  {/* Details Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                      <span className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">
                                        Topic & Outcome
                                      </span>
                                      <div className="space-y-3">
                                        <div className="p-3.5 rounded-xl border border-slate-150 dark:border-slate-850 bg-white dark:bg-slate-950 text-2xs font-semibold text-slate-800 dark:text-slate-200">
                                          <strong>Topic:</strong> {meeting.summary?.topic || "N/A"}
                                        </div>
                                        <div className="p-3.5 rounded-xl border border-slate-150 dark:border-slate-850 bg-white dark:bg-slate-950 text-2xs font-semibold text-slate-800 dark:text-slate-200">
                                          <strong>Outcome:</strong> {meeting.summary?.outcome || "N/A"}
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      <span className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">
                                        Decisions Extracted
                                      </span>
                                      <ul className="list-disc pl-5 text-2xs font-semibold text-slate-705 dark:text-slate-300 space-y-1">
                                        {(meeting.summary?.decisions || []).map((dec: string, idx: number) => (
                                          <li key={idx}>{dec}</li>
                                        ))}
                                        {(meeting.summary?.decisions || []).length === 0 && (
                                          <li className="text-slate-400 italic list-none pl-0">No decisions.</li>
                                        )}
                                      </ul>
                                    </div>
                                  </div>

                                  {/* Advantages & Concerns */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                      <span className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">
                                        Advantages
                                      </span>
                                      <ul className="list-disc pl-5 text-2xs font-semibold text-slate-700 dark:text-slate-350 space-y-1">
                                        {(meeting.summary?.advantages || []).map((adv: string, idx: number) => (
                                          <li key={idx} className="text-emerald-600 dark:text-emerald-400">{adv}</li>
                                        ))}
                                        {(meeting.summary?.advantages || []).length === 0 && (
                                          <li className="text-slate-400 italic list-none pl-0">No advantages logged.</li>
                                        )}
                                      </ul>
                                    </div>

                                    <div>
                                      <span className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">
                                        Concerns
                                      </span>
                                      <ul className="list-disc pl-5 text-2xs font-semibold text-slate-700 dark:text-slate-350 space-y-1">
                                        {(meeting.summary?.concerns || []).map((con: string, idx: number) => (
                                          <li key={idx} className="text-red-500 dark:text-red-400">{con}</li>
                                        ))}
                                        {(meeting.summary?.concerns || []).length === 0 && (
                                          <li className="text-slate-400 italic list-none pl-0">No concerns logged.</li>
                                        )}
                                      </ul>
                                    </div>
                                  </div>

                                  {/* Assignments */}
                                  <div>
                                    <span className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">
                                      Assignments & Tasks
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      {(meeting.assignments || []).map((assign: any, idx: number) => {
                                        const calendarUrl = assign.deadline
                                          ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                                              `Task: ${assign.task} [${openedHub.name}]`
                                            )}&dates=${assign.deadline.replace(/-/g, "")}/${new Date(
                                              new Date(assign.deadline).setDate(new Date(assign.deadline).getDate() + 1)
                                            )
                                              .toISOString()
                                              .split("T")[0]
                                              .replace(/-/g, "")}&details=${encodeURIComponent(
                                              `Meeting: ${meeting.title}\nAssigned Task: ${assign.task}\nDeadline: ${assign.deadline}`
                                            )}`
                                          : "";

                                        return (
                                          <div
                                            key={idx}
                                            className="p-4 rounded-2xl border border-slate-150 dark:border-slate-850 bg-white dark:bg-slate-950 flex flex-col justify-between gap-3 shadow-2xs"
                                          >
                                            <div>
                                              <span className="block text-3xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                                                Assignee
                                              </span>
                                              <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                                                {assign.memberName}
                                              </span>
                                              <span className="block text-3xs text-slate-450 dark:text-slate-500">
                                                {assign.memberEmail}
                                              </span>
                                              <span className="block text-2xs text-slate-700 dark:text-slate-300 font-semibold mt-2.5 leading-relaxed">
                                                {assign.task}
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-900 pt-3 mt-1">
                                              <span className="text-3xs font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider">
                                                Deadline: {assign.deadline || "No Deadline"}
                                              </span>
                                              {assign.deadline && (
                                                <a
                                                  href={calendarUrl}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="text-3xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary hover:underline transition-all cursor-pointer flex items-center gap-1.5"
                                                >
                                                  <Calendar className="w-3.5 h-3.5 text-slate-400 hover:text-primary" /> Calendar
                                                </a>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                      {(meeting.assignments || []).length === 0 && (
                                        <p className="text-2xs text-slate-450 italic col-span-2 font-semibold">No tasks assigned.</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Version History Timeline */}
                                  <div>
                                    <span className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-3">
                                      Version History Timeline
                                    </span>
                                    <div className="border border-slate-100 dark:border-slate-900 rounded-2xl bg-white dark:bg-slate-950/20 divide-y divide-slate-100 dark:divide-slate-900 text-3xs font-semibold overflow-hidden">
                                      {(meeting.versions || []).map((ver: any, vidx: number) => (
                                        <div
                                          key={vidx}
                                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 cursor-pointer"
                                          onClick={() => setSelectedVersionSnapshot(ver)}
                                        >
                                          <div>
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-350 font-bold uppercase mr-2.5">
                                              V{ver.versionNumber}
                                            </span>
                                            <span className="text-slate-700 dark:text-slate-350 font-bold">
                                              {ver.changeReason}
                                            </span>
                                          </div>
                                          <div className="text-slate-400 text-right">
                                            <span>{new Date(ver.editedAt).toLocaleString()}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Actions Bar */}
                                  {openedHub.role === "Owner" && (
                                    <div className="flex items-center justify-end border-t border-slate-100 dark:border-slate-900 pt-4 mt-2">
                                      {hasPassedDeadline ? (
                                        <div className="w-full text-center p-3 rounded-2xl border border-red-200/50 dark:border-red-900/30 bg-red-500/5 text-2xs text-red-550 font-bold leading-normal flex items-center justify-center gap-1.5">
                                          <AlertTriangle className="w-4 h-4 text-red-500" /> Historical Record - This record contains passed deadlines and can no longer be modified.
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setEditingRecord(meeting);
                                            setEditRecordTitle(meeting.title);
                                            setEditRecordSummary({ ...meeting.summary });
                                            setEditRecordAssignments([...meeting.assignments]);
                                            setEditRecordScore({ ...meeting.score });
                                            setEditRecordChangeReason("");
                                          }}
                                          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-900 text-xs font-bold transition-all cursor-pointer text-slate-750 dark:text-slate-350"
                                        >
                                          Edit Record
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {openedHubTab === "assignments" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-955 dark:text-white">Workspace Assignments</h2>
                  <p className="text-2xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Track task deadlines, submission attempts, and review cycles.</p>
                </div>
                
                {openedHub.role === "Owner" ? (
                  /* OWNER VIEW: SUBMISSION REVIEW PANEL */
                  <div className="space-y-8 animate-in fade-in">
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
                      
                      {/* PENDING REVIEWS COLUMN */}
                      <div className="p-5 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-900">
                          <h3 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">Pending Review</h3>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-3xs font-bold">
                            {vaultMeetings.flatMap(vm => (vm.assignments || []).map((a: any, idx: number) => ({ ...a, meetingId: vm.id, taskIndex: idx, meetingTitle: vm.title }))).filter(a => a.status === "pending_review").length}
                          </span>
                        </div>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                          {vaultMeetings.flatMap(vm => (vm.assignments || []).map((a: any, idx: number) => ({ ...a, meetingId: vm.id, taskIndex: idx, meetingTitle: vm.title })))
                            .filter(a => a.status === "pending_review").length === 0 ? (
                              <p className="text-3xs text-slate-450 italic text-center py-4 font-semibold">No pending reviews.</p>
                            ) : (
                              vaultMeetings.flatMap(vm => (vm.assignments || []).map((a: any, idx: number) => ({ ...a, meetingId: vm.id, taskIndex: idx, meetingTitle: vm.title })))
                                .filter(a => a.status === "pending_review").map((assign, i) => {
                                  const warn = getDeadlineWarning(assign.deadline, assign.status);
                                  const sub = submissions.find(s => s.vaultMeetingId === assign.meetingId && s.taskIndex === assign.taskIndex);
                                  const lastAttempt = sub?.attempts?.[sub.attempts.length - 1];

                                  return (
                                    <div key={i} className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3 shadow-2xs hover:shadow-xs transition-all">
                                      <div>
                                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${warn.style}`}>
                                          {warn.label}
                                        </span>
                                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white mt-2 leading-snug">{assign.task}</h4>
                                        <span className="block text-4xs text-slate-400 font-bold uppercase tracking-wider mt-1">Assignee: {assign.memberName}</span>
                                        <span className="block text-4xs text-slate-400 font-mono mt-0.5">{assign.memberEmail}</span>
                                      </div>

                                      {lastAttempt && (
                                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-900 text-3xs font-semibold">
                                          <p className="font-bold text-slate-700 dark:text-slate-300">Submitted Attempt #{lastAttempt.attemptNumber}</p>
                                          <p className="text-slate-550 dark:text-slate-450 mt-1 line-clamp-3 italic">"{lastAttempt.description}"</p>
                                          {lastAttempt.attachments && lastAttempt.attachments.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                                              {lastAttempt.attachments.map((link: string, li: number) => (
                                                <a key={li} href={link} target="_blank" rel="noreferrer" className="text-4xs text-primary hover:underline font-mono truncate max-w-[130px]">
                                                  🔗 {link.split("/").pop() || "Link"}
                                                </a>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      <div className="flex gap-2 justify-end pt-1">
                                        <button
                                          onClick={() => {
                                            setReviewTaskMeetingId(assign.meetingId);
                                            setReviewTaskIndex(assign.taskIndex);
                                            setReviewSubmissionId(sub?.id || "");
                                            setReviewAction("reject");
                                            setReviewFeedback("");
                                            setReviewError("");
                                            setReviewSubmissionModalOpen(true);
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 text-red-500 text-3xs font-bold transition-all cursor-pointer"
                                        >
                                          Reject
                                        </button>
                                        <button
                                          onClick={() => {
                                            setConfirmDialog({
                                              isOpen: true,
                                              title: "Approve Task Completion",
                                              message: "You are marking this assignment as completed. This action will stop future reminders. Do you want to continue?",
                                              onConfirm: async () => {
                                                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                                setReviewSpinner(true);
                                                try {
                                                  const res = await fetch("/api/meetings/review-submission", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                      vaultMeetingId: assign.meetingId,
                                                      taskIndex: assign.taskIndex,
                                                      action: "approve",
                                                      feedback: "Approved by Owner.",
                                                    }),
                                                  });
                                                  if (res.ok) {
                                                    setWelcomeBanner("Submission approved successfully!");
                                                    fetchMeetings(openedHub.id);
                                                  } else {
                                                    const d = await res.json();
                                                    alert(d.error || "Failed to approve.");
                                                  }
                                                } catch {
                                                  alert("Network error.");
                                                } finally {
                                                  setReviewSpinner(false);
                                                }
                                              }
                                            });
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-3xs font-bold shadow-sm transition-all cursor-pointer"
                                        >
                                          Approve
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                            )}
                        </div>
                      </div>

                      {/* REJECTED REVIEWS COLUMN */}
                      <div className="p-5 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-955/20 space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-900">
                          <h3 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">Rejected Reviews</h3>
                          <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-3xs font-bold">
                            {vaultMeetings.flatMap(vm => (vm.assignments || []).map((a: any, idx: number) => ({ ...a, meetingId: vm.id, taskIndex: idx, meetingTitle: vm.title }))).filter(a => a.status === "rejected").length}
                          </span>
                        </div>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                          {vaultMeetings.flatMap(vm => (vm.assignments || []).map((a: any, idx: number) => ({ ...a, meetingId: vm.id, taskIndex: idx, meetingTitle: vm.title })))
                            .filter(a => a.status === "rejected").length === 0 ? (
                              <p className="text-3xs text-slate-450 italic text-center py-4 font-semibold">No rejected reviews.</p>
                            ) : (
                              vaultMeetings.flatMap(vm => (vm.assignments || []).map((a: any, idx: number) => ({ ...a, meetingId: vm.id, taskIndex: idx, meetingTitle: vm.title })))
                                .filter(a => a.status === "rejected").map((assign, i) => {
                                  const sub = submissions.find(s => s.vaultMeetingId === assign.meetingId && s.taskIndex === assign.taskIndex);
                                  const lastAttempt = sub?.attempts?.[sub.attempts.length - 1];

                                  return (
                                    <div key={i} className="p-4 rounded-2xl border border-slate-200/50 dark:border-slate-850 bg-white dark:bg-slate-950/50 space-y-3 shadow-3xs">
                                      <div>
                                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white leading-snug">{assign.task}</h4>
                                        <span className="block text-4xs text-slate-400 font-bold uppercase tracking-wider mt-1">Assignee: {assign.memberName}</span>
                                        <span className="block text-4xs text-slate-400 font-mono mt-0.5">{assign.memberEmail}</span>
                                      </div>
                                      {lastAttempt && (
                                        <div className="p-3 bg-red-500/5 dark:bg-red-500/2 rounded-xl border border-red-500/10 text-3xs font-semibold">
                                          <p className="font-bold text-red-500">Feedback: "{lastAttempt.feedback}"</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                            )}
                        </div>
                      </div>

                      {/* APPROVED REVIEWS COLUMN */}
                      <div className="p-5 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-955/20 space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-900">
                          <h3 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">Completed / Approved</h3>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-3xs font-bold">
                            {vaultMeetings.flatMap(vm => (vm.assignments || []).map((a: any, idx: number) => ({ ...a, meetingId: vm.id, taskIndex: idx, meetingTitle: vm.title }))).filter(a => a.status === "approved").length}
                          </span>
                        </div>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                          {vaultMeetings.flatMap(vm => (vm.assignments || []).map((a: any, idx: number) => ({ ...a, meetingId: vm.id, taskIndex: idx, meetingTitle: vm.title })))
                            .filter(a => a.status === "approved").length === 0 ? (
                              <p className="text-3xs text-slate-450 italic text-center py-4 font-semibold">No approved tasks.</p>
                            ) : (
                              vaultMeetings.flatMap(vm => (vm.assignments || []).map((a: any, idx: number) => ({ ...a, meetingId: vm.id, taskIndex: idx, meetingTitle: vm.title })))
                                .filter(a => a.status === "approved").map((assign, i) => (
                                  <div key={i} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-955 space-y-2 shadow-3xs">
                                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white leading-snug">{assign.task}</h4>
                                    <span className="block text-4xs text-slate-450 font-bold uppercase tracking-wider">Assignee: {assign.memberName}</span>
                                    <span className="block text-4xs text-slate-450 font-mono mt-0.5">{assign.memberEmail}</span>
                                  </div>
                                ))
                            )}
                        </div>
                      </div>

                      {/* OVERDUE TASKS COLUMN */}
                      <div className="p-5 rounded-3xl border border-red-500/10 dark:border-red-950/20 bg-red-500/5 dark:bg-red-950/5 space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-red-500/10">
                          <h3 className="font-extrabold text-xs text-red-650 dark:text-red-400 uppercase tracking-wider">Overdue Tasks</h3>
                          <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-3xs font-bold animate-pulse">
                            {vaultMeetings.flatMap(vm => (vm.assignments || []).map((a: any, idx: number) => ({ ...a, meetingId: vm.id, taskIndex: idx, meetingTitle: vm.title }))).filter(a => a.status === "overdue").length}
                          </span>
                        </div>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                          {vaultMeetings.flatMap(vm => (vm.assignments || []).map((a: any, idx: number) => ({ ...a, meetingId: vm.id, taskIndex: idx, meetingTitle: vm.title })))
                            .filter(a => a.status === "overdue").length === 0 ? (
                              <p className="text-3xs text-red-400 dark:text-red-400/80 italic text-center py-4 font-semibold">No overdue tasks.</p>
                            ) : (
                              vaultMeetings.flatMap(vm => (vm.assignments || []).map((a: any, idx: number) => ({ ...a, meetingId: vm.id, taskIndex: idx, meetingTitle: vm.title })))
                                .filter(a => a.status === "overdue").map((assign, i) => (
                                  <div key={i} className="p-4 rounded-2xl border border-red-200/50 dark:border-red-900/30 bg-white dark:bg-slate-950 space-y-2 shadow-2xs border-l-4 border-l-red-500">
                                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white leading-snug">{assign.task}</h4>
                                    <span className="block text-4xs text-slate-450 font-bold uppercase tracking-wider">Assignee: {assign.memberName}</span>
                                    <span className="block text-4xs text-red-500 font-bold mt-1">Deadline Passed: {assign.deadline}</span>
                                  </div>
                                ))
                            )}
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  /* MEMBER VIEW: THEIR ASSIGNED CARDS */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                    {(() => {
                      const cleanEmail = user.email.trim().toLowerCase();
                      const myAssignments = vaultMeetings.flatMap(vm => 
                        (vm.assignments || []).map((a: any, idx: number) => ({
                          ...a,
                          meetingId: vm.id,
                          taskIndex: idx,
                          meetingTitle: vm.title
                        }))
                      ).filter(a => a.memberEmail.trim().toLowerCase() === cleanEmail);

                      if (myAssignments.length === 0) {
                        return (
                          <div className="p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center bg-white dark:bg-slate-950/20 col-span-2">
                            <CheckCircle className="w-10 h-10 text-slate-350 dark:text-slate-700 mb-3" />
                            <span className="block font-bold text-sm text-slate-700 dark:text-slate-300">All commitments clear!</span>
                            <span className="block text-2xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px] mx-auto font-medium">You have no tasks assigned in this Hub workspace.</span>
                          </div>
                        );
                      }

                      return myAssignments.map((assign, i) => {
                        const warn = getDeadlineWarning(assign.deadline, assign.status);
                        const sub = submissions.find(s => s.vaultMeetingId === assign.meetingId && s.taskIndex === assign.taskIndex);
                        const hasSub = !!sub;

                        return (
                          <div key={i} className="p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col justify-between gap-5 shadow-sm">
                            <div className="space-y-3.5">
                              <div className="flex items-center justify-between">
                                <span className={`inline-flex px-2 py-0.5 rounded text-3xs font-extrabold border uppercase tracking-wider ${warn.style}`}>
                                  {warn.label}
                                </span>
                                <span className="text-4xs text-slate-450 font-mono font-bold uppercase tracking-wider">
                                  Meeting: {assign.meetingTitle}
                                </span>
                              </div>

                              <div>
                                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">{assign.task}</h4>
                                <p className="text-3xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-1.5">
                                  Deadline: {assign.deadline || "No deadline set"}
                                </p>
                              </div>

                              {/* Owner Feedback */}
                              {assign.status === "rejected" && sub?.attempts?.[sub.attempts.length - 1]?.feedback && (
                                <div className="p-3.5 rounded-2xl bg-red-500/5 border border-red-500/10 text-3xs font-semibold">
                                  <span className="block text-red-500 font-extrabold uppercase tracking-wide">Owner Feedback:</span>
                                  <p className="text-red-500 mt-1">"{sub.attempts[sub.attempts.length - 1].feedback}"</p>
                                </div>
                              )}

                              {/* Submission History timeline */}
                              {hasSub && (
                                <div className="border-t border-slate-100 dark:border-slate-900 pt-3.5 space-y-2">
                                  <span className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Submission History</span>
                                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                    {sub.attempts.map((att: any, attIdx: number) => (
                                      <div key={attIdx} className="p-3 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900 rounded-xl text-3xs font-semibold flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-slate-800 dark:text-slate-200">Attempt #{att.attemptNumber}</span>
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                                            att.status === "approved" ? "bg-emerald-500/10 text-emerald-500" :
                                            att.status === "rejected" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                                          }`}>
                                            {att.status}
                                          </span>
                                        </div>
                                        {att.title && <p className="font-extrabold text-slate-700 dark:text-slate-350">{att.title}</p>}
                                        <p className="text-slate-500 dark:text-slate-400 leading-normal">"{att.description}"</p>
                                        
                                        {att.attachments && att.attachments.length > 0 && (
                                          <div className="flex flex-wrap gap-1.5 pt-1">
                                            {att.attachments.map((link: string, li: number) => (
                                              <a key={li} href={link} target="_blank" rel="noreferrer" className="text-4xs text-primary hover:underline font-mono truncate max-w-[150px]">
                                                🔗 {link.split("/").pop() || "Attachment"}
                                              </a>
                                            ))}
                                          </div>
                                        )}

                                        <div className="flex justify-between items-center text-4xs text-slate-450 dark:text-slate-500 border-t border-slate-100 dark:border-slate-900/60 pt-2 mt-1">
                                          <span>Submitted: {new Date(att.submittedAt).toLocaleString()}</span>
                                          {att.reviewedAt && (
                                            <span>Reviewed: {new Date(att.reviewedAt).toLocaleString()}</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex justify-end border-t border-slate-100 dark:border-slate-900 pt-4">
                              {assign.status === "approved" ? (
                                <span className="text-3xs text-emerald-500 font-extrabold flex items-center gap-1">
                                  ✓ Mark Completed & Approved
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSubmitTaskMeetingId(assign.meetingId);
                                    setSubmitTaskIndex(assign.taskIndex);
                                    setSubmitTaskTitle("");
                                    setSubmitTaskDesc("");
                                    setSubmitTaskAttachments([]);
                                    setNewAttachmentUrl("");
                                    setSubmitError("");
                                    setSubmitTaskModalOpen(true);
                                  }}
                                  className="px-4 py-2 rounded-xl bg-primary hover:opacity-90 text-white font-bold text-2xs transition-all shadow-sm cursor-pointer"
                                >
                                  {assign.status === "rejected" ? "Resubmit Work" : "Submit Work"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            )}

            {openedHubTab === "agent" && (
              <div className="space-y-6 flex-1 flex flex-col min-h-[500px]">
                <div>
                  <h2 className="text-lg font-black text-slate-955 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Hub Intelligence Assistant
                  </h2>
                  <p className="text-2xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                    Query decisions, assignments, timelines, dependencies, and generate custom reports.
                  </p>
                </div>

                {/* Chat Message Box */}
                <div className="flex-1 min-h-[350px] border border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-slate-950/40 rounded-3xl p-5 flex flex-col gap-4 shadow-sm">
                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto space-y-4 max-h-[420px] pr-2 scrollbar-thin">
                    {agentMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-600 py-12">
                        <Sparkles className="w-10 h-10 mb-3 opacity-60 text-primary animate-pulse" />
                        <span className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">Hub Intelligence Active</span>
                        <p className="text-3xs text-slate-450 dark:text-slate-500 mt-1 max-w-[280px] leading-relaxed">
                          Ask me about assignments, deadlines, meeting outcomes, or analyze task dependencies.
                        </p>
                      </div>
                    ) : (
                      <AnimatePresence initial={false}>
                        {agentMessages.map((msg, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 15, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            className={`flex flex-col max-w-[85%] ${
                              msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                            }`}
                          >
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase">
                              {msg.sender === "user" ? "You" : "Hub Assistant"}
                            </span>
                            <div
                              className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed font-sans shadow-2xs select-text border ${
                                msg.sender === "user"
                                  ? "bg-slate-900 border-slate-950 text-white dark:bg-slate-900 dark:border-slate-800 whitespace-pre-wrap"
                                  : "bg-white border-slate-205/65 dark:bg-slate-950 dark:border-slate-800 text-slate-850 dark:text-slate-200"
                              }`}
                            >
                              {msg.sender === "user" ? msg.message : renderMarkdown(msg.message)}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}

                    {agentLoading && (
                      <div className="flex flex-col mr-auto items-start max-w-[85%] animate-pulse">
                        <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">Hub Assistant</span>
                        <div className="p-3.5 rounded-2xl text-xs font-semibold bg-slate-50 border border-slate-100 dark:bg-slate-900 dark:border-slate-800 text-slate-500 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span>Consulting Hub records...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Horizontal Quick Actions Bar */}
                  <div className="border-t border-slate-100 dark:border-slate-900 pt-3.5">
                    <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Quick Commands</span>
                    <div className="flex flex-wrap gap-2">
                      {openedHub.role === "Owner" ? (
                        <>
                          <button
                            type="button"
                            disabled={agentLoading}
                            onClick={() => handleAgentQuerySubmit("Show Pending Assignments")}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-3xs font-bold text-slate-650 dark:text-slate-350 cursor-pointer transition-all"
                          >
                            Show Pending Assignments
                          </button>
                          <button
                            type="button"
                            disabled={agentLoading}
                            onClick={() => handleAgentQuerySubmit("Show Overdue Work")}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-3xs font-bold text-slate-650 dark:text-slate-350 cursor-pointer transition-all"
                          >
                            Show Overdue Work
                          </button>
                          <button
                            type="button"
                            disabled={agentLoading}
                            onClick={() => handleAgentQuerySubmit("Generate Status Report")}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-3xs font-bold text-slate-650 dark:text-slate-350 cursor-pointer transition-all"
                          >
                            Generate Status Report
                          </button>
                          <button
                            type="button"
                            disabled={agentLoading}
                            onClick={() => handleAgentQuerySubmit("Summarize Latest Meeting")}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-3xs font-bold text-slate-650 dark:text-slate-350 cursor-pointer transition-all"
                          >
                            Summarize Latest Meeting
                          </button>
                          <button
                            type="button"
                            disabled={agentLoading}
                            onClick={() => handleAgentQuerySubmit("Show Submission Statistics")}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-3xs font-bold text-slate-650 dark:text-slate-350 cursor-pointer transition-all"
                          >
                            Show Submission Statistics
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={agentLoading}
                            onClick={() => handleAgentQuerySubmit("Show My Tasks")}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-3xs font-bold text-slate-650 dark:text-slate-350 cursor-pointer transition-all"
                          >
                            Show My Tasks
                          </button>
                          <button
                            type="button"
                            disabled={agentLoading}
                            onClick={() => handleAgentQuerySubmit("Show My Deadlines")}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-3xs font-bold text-slate-650 dark:text-slate-350 cursor-pointer transition-all"
                          >
                            Show My Deadlines
                          </button>
                          <button
                            type="button"
                            disabled={agentLoading}
                            onClick={() => handleAgentQuerySubmit("Show My Feedback")}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-3xs font-bold text-slate-650 dark:text-slate-350 cursor-pointer transition-all"
                          >
                            Show My Feedback
                          </button>
                          <button
                            type="button"
                            disabled={agentLoading}
                            onClick={() => handleAgentQuerySubmit("Summarize Latest Meeting")}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-855 hover:bg-slate-50 dark:hover:bg-slate-900 text-3xs font-bold text-slate-650 dark:text-slate-355 cursor-pointer transition-all"
                          >
                            Summarize Latest Meeting
                          </button>
                          <button
                            type="button"
                            disabled={agentLoading}
                            onClick={() => handleAgentQuerySubmit("What Should I Work On Next")}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-3xs font-bold text-slate-650 dark:text-slate-350 cursor-pointer transition-all"
                          >
                            What Should I Work On Next
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Form Submission */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAgentQuerySubmit();
                    }}
                    className="flex gap-2 border-t border-slate-100 dark:border-slate-900 pt-3"
                  >
                    <input
                      type="text"
                      required
                      value={agentQuery}
                      onChange={(e) => setAgentQuery(e.target.value)}
                      placeholder="Ask the Hub Assistant..."
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="submit"
                      disabled={agentLoading || !agentQuery.trim()}
                      className="px-5 rounded-xl bg-primary hover:opacity-90 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      Query
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Members Tab */}
            {openedHubTab === "members" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-950 dark:text-white">Workspace Members</h2>
                    <p className="text-2xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Manage members, view requests, and configure roles.</p>
                  </div>
                  {hubMembers.userRole === "owner" && (
                    <button
                      onClick={() => {
                        setInviteModalOpen(true);
                        setInviteEmail("");
                        setLookedUpUser(null);
                        setLookupSearched(false);
                        setInviteCustomMsg("");
                        setInviteError("");
                        setInviteSuccess("");
                      }}
                      className="px-4 py-2.5 rounded-2xl bg-primary hover:opacity-90 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer animate-in fade-in"
                    >
                      <UserPlus className="w-4 h-4" />
                      Invite Member
                    </button>
                  )}
                </div>

                {loadingMembers ? (
                  <div className="flex items-center justify-center py-12 text-xs text-slate-500 font-semibold">
                    <Loader2 className="w-5 h-5 text-primary animate-spin mr-2" />
                    Loading members...
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* SECTION 1: PENDING REQUESTS (Only visible for Owner) */}
                    {hubMembers.userRole === "owner" && hubMembers.pending.length > 0 && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                        <h3 className="font-extrabold text-xs text-slate-405 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse animate-duration-1000" />
                          Pending Requests ({hubMembers.pending.length})
                        </h3>
                        <div className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800 text-2xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider select-none">
                                <th className="p-4">User Details</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Requested Hub</th>
                                <th className="p-4">Requested Date</th>
                                <th className="p-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {hubMembers.pending.map((m) => (
                                <tr key={m.userId} className="border-b border-slate-100 dark:border-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      {m.image ? (
                                        <img src={m.image} alt={m.name} className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-800" />
                                      ) : (
                                        <div className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-2xs">
                                          {getInitials(m.name)}
                                        </div>
                                      )}
                                      <span className="font-extrabold text-slate-900 dark:text-white">{m.name}</span>
                                    </div>
                                  </td>
                                  <td className="p-4 font-mono text-2xs text-slate-500 dark:text-slate-400">{m.email}</td>
                                  <td className="p-4 text-slate-705 dark:text-slate-300 font-extrabold">{openedHub?.name || "Hub Workspace"}</td>
                                  <td className="p-4 text-slate-505 dark:text-slate-400 font-mono text-2xs">{new Date(m.createdAt).toLocaleDateString()}</td>
                                  <td className="p-4 text-right space-x-2">
                                    <button
                                      onClick={() => handleRejectMember(m.userId, m.name)}
                                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-2xs transition-all cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                    <button
                                      onClick={() => handleApproveMember(m.userId, m.name)}
                                      className="px-3 py-1.5 rounded-lg bg-primary hover:opacity-90 text-white font-bold text-2xs transition-all cursor-pointer"
                                    >
                                      Approve
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* SECTION 2: WORKSPACE OWNER */}
                    <div className="space-y-3">
                      <h3 className="font-extrabold text-xs text-slate-405 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-red-500" />
                        Workspace Owner
                      </h3>
                      {hubMembers.owner ? (
                        <div className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800 text-2xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider select-none">
                                <th className="p-4">Owner Details</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Role Tag</th>
                                <th className="p-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const m = hubMembers.owner;
                                const isSelf = m.userId === user.id;
                                return (
                                  <tr className="border-b border-slate-100 dark:border-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                    <td className="p-4">
                                      <div className="flex items-center gap-3">
                                        {m.image ? (
                                          <img src={m.image} alt={m.name} className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-800" />
                                        ) : (
                                          <div className="w-7 h-7 rounded-full bg-red-500/10 text-primary flex items-center justify-center font-bold text-2xs">
                                            {getInitials(m.name)}
                                          </div>
                                        )}
                                        <span className="font-extrabold text-slate-900 dark:text-white">
                                          {m.name} {isSelf && <span className="text-3xs font-extrabold text-slate-400 dark:text-slate-500 lowercase">(you)</span>}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-4 font-mono text-2xs text-slate-500 dark:text-slate-400">{m.email}</td>
                                    <td className="p-4">
                                      <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/10 text-3xs font-bold uppercase tracking-wider animate-in fade-in">
                                        Owner
                                      </span>
                                    </td>
                                    <td className="p-4 text-right">
                                      <span className="text-slate-300 dark:text-slate-700 font-bold text-2xs select-none">—</span>
                                    </td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic p-4">No owner information loaded.</div>
                      )}
                    </div>

                    {/* SECTION 3: MEMBERS */}
                    <div className="space-y-3">
                      <h3 className="font-extrabold text-xs text-slate-405 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-500" />
                        Members ({hubMembers.members.length})
                      </h3>
                      <div className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800 text-2xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider select-none">
                              <th className="p-4">Member Details</th>
                              <th className="p-4">Email</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {hubMembers.members.length === 0 ? (
                              <tr>
                                <td colSpan={3} className="p-8 text-center text-slate-400 dark:text-slate-500 text-2xs font-semibold uppercase tracking-wider select-none">
                                  No Standard Members Yet
                                </td>
                              </tr>
                            ) : (
                              hubMembers.members.map((m) => {
                                const isSelf = m.userId === user.id;
                                return (
                                  <tr key={m.userId} className="border-b border-slate-100 dark:border-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                    <td className="p-4">
                                      <div className="flex items-center gap-3">
                                        {m.image ? (
                                          <img src={m.image} alt={m.name} className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-800" />
                                        ) : (
                                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 flex items-center justify-center font-bold text-2xs">
                                            {getInitials(m.name)}
                                          </div>
                                        )}
                                        <span className="font-extrabold text-slate-900 dark:text-white">
                                          {m.name} {isSelf && <span className="text-3xs font-extrabold text-slate-400 dark:text-slate-500 lowercase">(you)</span>}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-4 font-mono text-2xs text-slate-500 dark:text-slate-400">{m.email}</td>
                                    <td className="p-4 text-right">
                                      {hubMembers.userRole === "owner" ? (
                                        <button
                                          onClick={() => handleRemoveMember(m.userId, m.name)}
                                          className="px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 text-red-500 font-bold text-2xs transition-all cursor-pointer"
                                        >
                                          Remove Member
                                        </button>
                                      ) : (
                                        <span className="text-slate-300 dark:text-slate-700 font-bold text-2xs select-none">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* SECTION 4: PENDING INVITATIONS (Only visible for Owner) */}
                    {hubMembers.userRole === "owner" && hubMembers.invitations && hubMembers.invitations.length > 0 && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                        <h3 className="font-extrabold text-xs text-slate-405 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-500" />
                          Pending Invitations ({hubMembers.invitations.length})
                        </h3>
                        <div className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800 text-2xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider select-none">
                                <th className="p-4">Email</th>
                                <th className="p-4">Sent Date</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {hubMembers.invitations.map((inv) => (
                                <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                  <td className="p-4 font-mono text-2xs text-slate-700 dark:text-slate-300">{inv.email}</td>
                                  <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-2xs">
                                    {new Date(inv.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="p-4">
                                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/10 text-3xs font-bold uppercase tracking-wider animate-in fade-in">
                                      Sent
                                    </span>
                                  </td>
                                  <td className="p-4 text-right space-x-2">
                                    <button
                                      onClick={() => handleResendInvite(inv.email)}
                                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-2xs transition-all cursor-pointer"
                                    >
                                      Resend
                                    </button>
                                    <button
                                      onClick={() => handleRevokeInvite(inv.email)}
                                      className="px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 text-red-500 font-bold text-2xs transition-all cursor-pointer"
                                    >
                                      Revoke
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab (Only visible if Owner role) */}
            {openedHubTab === "settings" && openedHub.role === "Owner" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Branding Panel */}
                <div className="p-8 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm flex flex-col gap-5">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-955 dark:text-white">Hub Branding Settings</h3>
                    <p className="text-2xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Customize Hub title, description, and visual logo.</p>
                  </div>

                  {settingsError && (
                    <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-900/30 text-2xs text-red-600 dark:text-red-400 font-bold text-center leading-relaxed">
                      {settingsError}
                    </div>
                  )}
                  {settingsSuccess && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 text-2xs text-emerald-600 dark:text-emerald-400 font-bold text-center leading-relaxed">
                      Branding settings updated successfully!
                    </div>
                  )}

                  <form onSubmit={handleUpdateBranding} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">Hub Name (Required)</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="E.g. Marketing Team"
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">Hub Description</label>
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Enter Hub purpose or description..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:border-red-500 resize-none font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">Hub Logo Image URL</label>
                      <input
                        type="url"
                        value={editImage}
                        onChange={(e) => setEditImage(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingSettings || !editName.trim()}
                      className="w-full py-3.5 rounded-2xl bg-primary hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Save Branding
                    </button>
                  </form>
                </div>

                {/* Destructive Card (Only Owner role) */}
                {openedHub.actualRole === "owner" && (
                  <div className="p-8 rounded-3xl border border-red-500/10 bg-white dark:bg-slate-950 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-red-600 dark:text-red-400">Danger Zone</h3>
                      <p className="text-2xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Permanently delete this Hub workspace and all associated secure storages.</p>
                      
                      <div className="mt-5 p-4 rounded-2xl bg-red-500/10 border border-red-505/20 text-3xs text-red-700 dark:text-red-400 leading-normal font-semibold">
                        ⚠️ <strong>Warning:</strong> This action is permanent and cannot be undone. All vault storages, invitations, and member accesses will be deleted instantly.
                      </div>
                    </div>

                    <button
                      onClick={handleRequestDeleteHub}
                      className="w-full mt-6 py-3.5 rounded-2xl bg-red-650 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Hub Workspace
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Regular content views */
          <>
            {activeTab === "dashboard" && (
              <div className="flex-1 flex flex-col gap-8 animate-in fade-in duration-300">
                {/* Welcome Banner Box */}
                <div className="flex items-center gap-4 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white/70 dark:bg-slate-950/40 shadow-sm">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="w-16 h-16 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-extrabold text-2xl shadow-sm">
                      {getInitials(user.name)}
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-905 dark:text-white leading-tight">
                      Welcome, {user.name}
                    </h1>
                    <p className="text-2xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                      Platform Dashboard Account
                    </p>
                  </div>
                </div>

                {/* Create Hub Card Trigger */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div 
                    onClick={() => setCreateStep("form")}
                    className="p-8 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col items-start gap-4 shadow-sm hover:shadow-md hover:border-primary/30 dark:hover:border-primary/30 transition-all group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 dark:bg-red-950/20 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg text-slate-905 dark:text-white mb-1">
                        Create Hub
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal max-w-xs">
                        Start a secure private environment for your meeting commitments, analysis pipelines, and task lists.
                      </p>
                    </div>
                    <button className="text-xs font-bold text-primary flex items-center gap-1 mt-2">
                      Create Hub
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Quick Summary Section */}
                <div className="space-y-4">
                  <h3 className="font-extrabold text-sm text-slate-405 dark:text-slate-500 uppercase tracking-wider">
                    Quick Summary
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-900 bg-white/40 dark:bg-slate-950/20 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Owned Hubs</span>
                      <span className="text-xl font-extrabold text-slate-900 dark:text-white">{ownedHubs.length}</span>
                    </div>
                    <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-900 bg-white/40 dark:bg-slate-950/20 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Member Hubs</span>
                      <span className="text-xl font-extrabold text-slate-900 dark:text-white">{memberHubs.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Owned Hubs */}
            {activeTab === "owned-hubs" && (
              <div className="flex-1 flex flex-col gap-6 animate-in fade-in duration-300">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Owned Hubs
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Hubs that you created and own.
                  </p>
                </div>

                {loadingHubs ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-500">Loading Hubs...</div>
                ) : ownedHubs.length === 0 ? (
                  <div className="p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center">
                    <ShieldAlert className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
                    <span className="block font-bold text-sm text-slate-700 dark:text-slate-300">No Owned Hubs Yet</span>
                    <span className="block text-2xs text-slate-400 dark:text-slate-500 mt-1">Create a hub to get started.</span>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800 text-2xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider select-none">
                          <th className="p-4">Hub Name</th>
                          <th className="p-4 hidden sm:table-cell">Description</th>
                          <th className="p-4 hidden md:table-cell">Created Date</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Vault Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ownedHubs.map((hub) => (
                          <tr key={hub.id} className="border-b border-slate-100 dark:border-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 text-xs font-semibold text-slate-700 dark:text-slate-200">
                            <td className="p-4 font-extrabold text-slate-900 dark:text-white">
                              <div className="flex items-center gap-2.5">
                                {hub.hubImage && (
                                  <img src={hub.hubImage} alt={hub.name} className="w-6 h-6 rounded-md object-cover border border-slate-100 dark:border-slate-900" />
                                )}
                                <span>{hub.name}</span>
                              </div>
                            </td>
                            <td className="p-4 hidden sm:table-cell max-w-xs truncate text-slate-500 dark:text-slate-400">{hub.description || "—"}</td>
                            <td className="p-4 hidden md:table-cell text-slate-500 dark:text-slate-400 font-mono text-2xs">
                              {new Date(hub.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 text-3xs font-bold uppercase tracking-wider border border-red-500/10">
                                Owner
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="flex items-center gap-1.5 text-emerald-500 font-extrabold">
                                <ShieldCheck className="w-4 h-4" />
                                Protected
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleOpenHub(hub)}
                                className="px-3.5 py-1.5 rounded-lg bg-primary hover:opacity-90 text-white font-bold text-2xs transition-all cursor-pointer"
                              >
                                Open Hub
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Member Hubs */}
            {activeTab === "member-hubs" && (
              <div className="flex-1 flex flex-col gap-6 animate-in fade-in duration-300">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Member Hubs
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Hubs where you belong as a team member contributing to task commitments.
                  </p>
                </div>

                {loadingHubs ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-500">Loading Hubs...</div>
                ) : memberHubs.length === 0 ? (
                  <div className="p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center">
                    <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
                    <span className="block font-bold text-sm text-slate-700 dark:text-slate-300">No Member Hubs Yet</span>
                    <span className="block text-2xs text-slate-400 dark:text-slate-500 mt-1">Ask the hub owner to invite you.</span>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800 text-2xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                          <th className="p-4">Hub Name</th>
                          <th className="p-4 hidden sm:table-cell">Description</th>
                          <th className="p-4 hidden md:table-cell">Created Date</th>
                          <th className="p-4">Role</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memberHubs.map((hub) => (
                          <tr key={hub.id} className="border-b border-slate-100 dark:border-slate-900/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 text-xs font-semibold text-slate-700 dark:text-slate-200">
                            <td className="p-4 font-extrabold text-slate-900 dark:text-white">
                              <div className="flex items-center gap-2.5">
                                {hub.hubImage && (
                                  <img src={hub.hubImage} alt={hub.name} className="w-6 h-6 rounded-md object-cover border border-slate-105 dark:border-slate-900" />
                                )}
                                <span>{hub.name}</span>
                              </div>
                            </td>
                            <td className="p-4 hidden sm:table-cell max-w-xs truncate text-slate-500 dark:text-slate-400">{hub.description || "—"}</td>
                            <td className="p-4 hidden md:table-cell text-slate-500 dark:text-slate-400 font-mono text-2xs">
                              {new Date(hub.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-3xs font-bold uppercase tracking-wider">
                                Member
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleOpenHub(hub)}
                                className="px-3.5 py-1.5 rounded-lg bg-primary hover:opacity-90 text-white font-bold text-2xs transition-all cursor-pointer"
                              >
                                Open Hub
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Profile */}
            {activeTab === "profile" && (
              <div className="flex-1 flex flex-col gap-6 animate-in fade-in duration-300 max-w-md mx-auto w-full justify-center">
                <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 flex flex-col items-center text-center shadow-md">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="w-20 h-20 rounded-full border-2 border-slate-105 dark:border-slate-900 mb-4 object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-extrabold text-2xl mb-4">
                      {getInitials(user.name)}
                    </div>
                  )}
                  <h2 className="font-extrabold text-xl text-slate-900 dark:text-white">{user.name}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 mb-6">{user.email}</p>

                  <div className="w-full border-t border-slate-100 dark:border-slate-900 pt-5 space-y-3.5 text-left text-xs font-semibold">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 dark:text-slate-500">Provider</span>
                      <span className="text-slate-800 dark:text-slate-200 capitalize">{user.authProvider}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 dark:text-slate-500">Account ID</span>
                      <span className="text-slate-800 dark:text-slate-200 font-mono text-3xs select-all">{user.id}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Settings */}
            {activeTab === "settings" && (
              <div className="flex-1 flex flex-col gap-6 animate-in fade-in duration-300 max-w-md mx-auto w-full justify-center">
                <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 text-center shadow-md">
                  <Settings className="w-10 h-10 text-primary mx-auto mb-4" />
                  <h2 className="font-extrabold text-xl text-slate-900 dark:text-white mb-2">Settings Panel</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Configure your notification alerts, SMTP mail settings securely in upcoming phases.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

      </section>

      {/* 3. Create Hub Wizard Dialog Layer */}
      {createStep !== "idle" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          
          {/* STEP A: Creation Modal */}
          {createStep === "form" && (
            <div className="w-full max-w-[460px] rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-2xl flex flex-col">
              <div className="w-11 h-11 rounded-xl bg-red-500/10 dark:bg-red-950/20 flex items-center justify-center text-primary mb-4 shadow-sm">
                <Plus className="w-6 h-6" />
              </div>
              <h2 className="font-extrabold text-xl text-slate-900 dark:text-white mb-1">Create Hub</h2>
              <p className="text-2xs text-slate-500 dark:text-slate-400 font-medium mb-6">Initialize a private workspace for your team.</p>

              <form onSubmit={(e) => { e.preventDefault(); setCreateStep("confirm"); }} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">Hub Name (Required)</label>
                  <input
                    type="text"
                    required
                    value={hubName}
                    onChange={(e) => setHubName(e.target.value)}
                    placeholder="E.g. Marketing Team"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:border-red-500 animate-in fade-in"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">Hub Description (Optional)</label>
                  <textarea
                    value={hubDescription}
                    onChange={(e) => setHubDescription(e.target.value)}
                    placeholder="Enter Hub purpose or description..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:border-red-500 resize-none font-medium"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateStep("idle")}
                    className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!hubName.trim()}
                    className="flex-1 py-3 rounded-2xl bg-primary hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    Create Hub
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP B: Confirmation Popup */}
          {createStep === "confirm" && (
            <div className="w-full max-w-[420px] rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-2xl flex flex-col text-center items-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 dark:bg-amber-950/20 flex items-center justify-center text-amber-500 mb-4 shadow-sm animate-bounce">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="font-extrabold text-lg text-slate-900 dark:text-white mb-2">Are you sure?</h2>
              
              <div className="my-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-left w-full text-xs font-semibold space-y-2">
                <p className="text-slate-400 dark:text-slate-500">You are creating a new Hub.</p>
                <div>
                  <span className="block text-2xs text-slate-400 uppercase font-bold tracking-wider">Hub Name</span>
                  <span className="block text-slate-800 dark:text-slate-200 text-sm mt-0.5">{hubName}</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-semibold">Are you sure you want to continue?</p>

              {/* Yes on Left, No on Right */}
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setCreateStep("password");
                    setVaultPassword("");
                    setConfirmPassword("");
                    setPasswordError("");
                  }}
                  className="flex-1 py-3 rounded-2xl bg-primary hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setCreateStep("form")}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                >
                  No
                </button>
              </div>
            </div>
          )}

          {/* STEP C: Vault Password Setup */}
          {createStep === "password" && (
            <div className="w-full max-w-[460px] rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-2xl flex flex-col">
              <div className="w-11 h-11 rounded-xl bg-red-500/10 dark:bg-red-950/20 flex items-center justify-center text-primary mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="font-extrabold text-xl text-slate-900 dark:text-white mb-1">Setup Vault Password</h2>
              <p className="text-2xs text-slate-500 dark:text-slate-400 font-medium mb-6">Create a password to encrypt this Hub's secure storage.</p>

              {passwordError && (
                <div className="w-full mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-900/30 text-xs text-red-600 dark:text-red-400 font-bold text-center">
                  {passwordError}
                </div>
              )}
              {hubCreateError && (
                <div className="w-full mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-900/30 text-xs text-red-600 dark:text-red-400 font-bold text-center">
                  {hubCreateError}
                </div>
              )}

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (vaultPassword !== confirmPassword) {
                    setPasswordError("Passwords do not match.");
                    return;
                  }
                  handleHubSubmit();
                }} 
                className="space-y-4"
              >
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">Vault Password</label>
                  <input
                    type="password"
                    required
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">Confirm Vault Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                {/* Warning note */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-3xs text-amber-800 dark:text-amber-400 leading-normal select-none">
                  ⚠️ <strong>Rule:</strong> Vault Passwords cannot be edited, changed, or reset later.
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={creatingHubSpinner}
                    onClick={() => setCreateStep("form")}
                    className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={creatingHubSpinner || !vaultPassword}
                    className="flex-1 py-3 rounded-2xl bg-primary hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {creatingHubSpinner ? "Creating Hub..." : "Setup Vault"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP D: Recovery Code Screen */}
          {createStep === "recovery" && (
            <div className="w-full max-w-[480px] rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-2xl flex flex-col text-center items-center animate-in zoom-in duration-200">
              <div className="w-12 h-12 rounded-full bg-red-500/10 dark:bg-red-950/20 flex items-center justify-center text-primary mb-4 shadow-sm">
                <ShieldAlert className="w-6 h-6 animate-pulse animate-duration-1000" />
              </div>
              <h2 className="font-extrabold text-xl text-slate-900 dark:text-white mb-2">Vault Recovery Code</h2>
              <p className="text-2xs text-slate-500 dark:text-slate-400 font-semibold max-w-xs leading-normal mb-6">
                This code is the only alternative method to access your Hub secure storage if you lose your password.
              </p>

              {/* Code Display Container */}
              <div className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between mb-4 shadow-inner">
                <span className="font-mono font-bold text-base md:text-lg text-slate-900 dark:text-white select-all tracking-wider pl-2">
                  {generatedRecoveryCode}
                </span>
                <button
                  onClick={() => handleCopyRecoveryCode(generatedRecoveryCode)}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 transition-all cursor-pointer shadow-sm"
                  title="Copy to Clipboard"
                >
                  {copiedRecovery ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Danger Warning Box */}
              <div className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-left text-2xs text-red-600 dark:text-red-400 leading-normal font-semibold mb-6">
                <h4 className="font-black uppercase tracking-wider text-xs mb-1.5 flex items-center gap-1.5">
                  <span>⚠️</span> IMPORTANT
                </h4>
                <p className="space-y-1">
                  <span className="block">• This recovery code will only be shown once.</span>
                  <span className="block">• Save it somewhere safe.</span>
                  <span className="block">• We cannot show this recovery code again.</span>
                </p>
              </div>

              {/* File Download and Checkbox Confirmation */}
              <div className="w-full space-y-4 mb-6">
                <button
                  type="button"
                  onClick={() => handleDownloadRecoveryFile(hubName, generatedRecoveryCode)}
                  className="w-full py-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  Download Recovery File (recovery.txt)
                </button>

                <label className="flex items-start gap-3 text-left cursor-pointer p-1">
                  <input
                    type="checkbox"
                    checked={savedRecoveryCheck}
                    onChange={(e) => setSavedRecoveryCheck(e.target.checked)}
                    className="w-4.5 h-4.5 rounded-lg border-slate-300 text-primary focus:ring-primary mt-0.5 cursor-pointer accent-primary"
                  />
                  <span className="text-2xs text-slate-500 dark:text-slate-400 leading-normal font-semibold select-none">
                    I Have Saved My Recovery Code. I understand that recovery is impossible without it.
                  </span>
                </label>
              </div>

              <button
                onClick={handleFinishWizard}
                disabled={!savedRecoveryCheck}
                className="w-full py-3.5 rounded-2xl bg-primary hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                I Have Saved My Recovery Code
              </button>
            </div>
          )}

        </div>
      )}

      {/* 4. Member Invitation Modal Layer */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-[460px] rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-2xl flex flex-col">
            <div className="w-11 h-11 rounded-xl bg-red-500/10 dark:bg-red-950/20 flex items-center justify-center text-primary mb-4 shadow-sm">
              <UserPlus className="w-6 h-6" />
            </div>
            <h2 className="font-extrabold text-xl text-slate-900 dark:text-white mb-1">Invite Member</h2>
            <p className="text-2xs text-slate-505 dark:text-slate-400 font-medium mb-6">Search user by email to invite them to this Hub.</p>

            {inviteError && (
              <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-900/30 text-2xs text-red-600 dark:text-red-400 font-bold text-center">
                {inviteError}
              </div>
            )}
            {inviteSuccess && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 text-2xs text-emerald-600 dark:text-emerald-400 font-bold text-center">
                {inviteSuccess}
              </div>
            )}

            {/* Email Lookup Form */}
            <form onSubmit={handleInviteLookup} className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      setLookedUpUser(null);
                      setLookupSearched(false);
                      setInviteError("");
                      setInviteSuccess("");
                    }}
                    placeholder="colleague@company.com"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:border-red-500 font-medium"
                  />
                </div>
                <button
                  type="submit"
                  disabled={lookupLoading || !inviteEmail}
                  className="px-4 rounded-2xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search
                </button>
              </div>
            </form>

            {/* Lookup Result Panel */}
            {lookupSearched && (
              <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/55 border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                {lookedUpUser ? (
                  <div className="flex items-center gap-3">
                    {lookedUpUser.image ? (
                      <img src={lookedUpUser.image} alt={lookedUpUser.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-800" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-500/10 text-primary flex items-center justify-center font-bold text-sm">
                        {getInitials(lookedUpUser.name)}
                      </div>
                    )}
                    <div>
                      <span className="block text-xs font-extrabold text-slate-900 dark:text-white">{lookedUpUser.name}</span>
                      <span className="block text-3xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">{lookedUpUser.email}</span>
                    </div>
                    <span className="ml-auto px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 text-3xs font-extrabold uppercase tracking-wide">
                      Registered
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                      ?
                    </div>
                    <div>
                      <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-200">User not registered</span>
                      <span className="block text-3xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">{inviteEmail}</span>
                    </div>
                    <span className="ml-auto px-2 py-0.5 rounded bg-amber-505/10 text-amber-600 border border-amber-505/10 text-3xs font-extrabold uppercase tracking-wide">
                      Unregistered
                    </span>
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">Custom Message (Optional)</label>
                  <textarea
                    value={inviteCustomMsg}
                    onChange={(e) => setInviteCustomMsg(e.target.value)}
                    placeholder="E.g. Join our secure hub to track meeting execution commitments."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:outline-none focus:border-red-500 resize-none font-medium"
                  />
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: "Confirm Invitation",
                        message: "Do you want to send this invitation?",
                        recipientPreview: {
                          email: inviteEmail.trim().toLowerCase(),
                          name: lookedUpUser?.name,
                          image: lookedUpUser?.image,
                          exists: !!lookedUpUser,
                        },
                        onConfirm: () => {
                          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                          handleSendInvite();
                        }
                      });
                    }}
                    disabled={sendingInviteSpinner}
                    className="flex-1 py-3 rounded-2xl bg-primary hover:opacity-90 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {sendingInviteSpinner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Send Invite
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setInviteModalOpen(false)}
              className="mt-6 w-full py-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-905 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 5. Delete Hub OTP Verification Modal Layer */}
      {deleteOtpModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-[420px] rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-2xl flex flex-col text-center items-center">
            <div className="w-12 h-12 rounded-full bg-red-505/10 dark:bg-red-955/20 flex items-center justify-center text-primary mb-4 animate-pulse">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="font-extrabold text-xl text-slate-900 dark:text-white mb-1">Verify Deletion OTP</h2>
            <p className="text-2xs text-slate-500 dark:text-slate-400 font-semibold mb-6">
              Enter the 6-digit verification code sent to your owner email address.
            </p>

            {deleteOtpError && (
              <div className="w-full mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-955/20 border border-red-100/50 dark:border-red-900/30 text-2xs text-red-600 dark:text-red-400 font-bold text-center leading-relaxed">
                {deleteOtpError}
              </div>
            )}

            <form onSubmit={handleConfirmDeleteHub} className="w-full space-y-4">
              <div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={deleteOtpCode}
                  onChange={(e) => setDeleteOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="E.g. 123456"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-base font-black tracking-widest text-center focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={deletingHubSpinner || deleteOtpCode.length !== 6}
                  className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {deletingHubSpinner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Confirm Purge
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteOtpModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Generic Confirmation Modal Layer */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="w-full max-w-[400px] rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-2xl flex flex-col text-center items-center">
            {confirmDialog.recipientPreview ? (
              <div className="w-full mb-5 flex flex-col items-center">
                {confirmDialog.recipientPreview.exists ? (
                  <>
                    <div className="mb-4">
                      {confirmDialog.recipientPreview.image ? (
                        <img
                          src={confirmDialog.recipientPreview.image}
                          alt={confirmDialog.recipientPreview.name || ""}
                          className="w-16 h-16 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-red-500/10 text-primary flex items-center justify-center font-extrabold text-xl border border-red-500/20 shadow-sm">
                          {getInitials(confirmDialog.recipientPreview.name)}
                        </div>
                      )}
                    </div>
                    <h2 className="font-extrabold text-lg text-slate-900 dark:text-white mb-0.5">{confirmDialog.recipientPreview.name}</h2>
                    <p className="text-2xs text-slate-450 dark:text-slate-500 font-mono mb-4">{confirmDialog.recipientPreview.email}</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center font-black text-2xl border border-slate-200/40 dark:border-slate-800/80 mb-4 shadow-sm">
                      ?
                    </div>
                    <h2 className="font-extrabold text-lg text-amber-600 dark:text-amber-500 mb-1">Account not found.</h2>
                    <p className="text-2xs text-slate-450 dark:text-slate-500 font-mono mb-2">{confirmDialog.recipientPreview.email}</p>
                    <p className="text-3xs text-slate-500 dark:text-slate-400 font-semibold mb-4 leading-normal max-w-[280px]">
                      Invitation can still be sent.<br />Profile image and name unavailable.
                    </p>
                  </>
                )}
                <p className="text-xs text-slate-650 dark:text-slate-350 font-bold mt-2">
                  {confirmDialog.message}
                </p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-red-500/10 dark:bg-red-950/20 flex items-center justify-center text-primary mb-4">
                  <AlertTriangle className="w-6 h-6 animate-pulse animate-duration-1000" />
                </div>
                <h2 className="font-extrabold text-lg text-slate-900 dark:text-white mb-2">{confirmDialog.title}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed font-semibold">{confirmDialog.message}</p>
              </>
            )}
            
            {/* Yes on Left, No on Right */}
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-3 rounded-2xl bg-primary hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Task Modal Layer */}
      {submitTaskModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-[500px] my-8 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto animate-in zoom-in duration-200">
            <div>
              <h2 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                Submit Assignment Proof
              </h2>
              <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">Upload attachments and enter a description of your submission.</p>
            </div>

            {submitError && (
              <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-955/20 border border-red-100/50 dark:border-red-900/30 text-2xs text-red-600 dark:text-red-400 font-bold text-center">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitWork} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">Submission Title (Optional)</label>
                <input
                  type="text"
                  value={submitTaskTitle}
                  onChange={(e) => setSubmitTaskTitle(e.target.value)}
                  placeholder="e.g. Completed Phase 5 UI styling"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2">Proof / Description (Compulsory)</label>
                <textarea
                  required
                  rows={4}
                  value={submitTaskDesc}
                  onChange={(e) => setSubmitTaskDesc(e.target.value)}
                  placeholder="Describe the work completed. E.g. Completed all backend tasks and verified integration."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:border-red-500 leading-normal"
                />
              </div>

              {/* Attachments Section */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Attachments (Urls)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newAttachmentUrl}
                    onChange={(e) => setNewAttachmentUrl(e.target.value)}
                    placeholder="https://github.com/myrepo or google drive link"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newAttachmentUrl.trim() && isValidAbsoluteUrl(newAttachmentUrl.trim())) {
                        setSubmitTaskAttachments([...submitTaskAttachments, newAttachmentUrl.trim()]);
                        setNewAttachmentUrl("");
                      } else {
                        alert("Please provide a valid absolute URL.");
                      }
                    }}
                    className="px-3 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-250 text-2xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {submitTaskAttachments.length > 0 && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900 rounded-xl space-y-1.5">
                    {submitTaskAttachments.map((att, index) => (
                      <div key={index} className="flex items-center justify-between text-3xs font-semibold text-slate-650 dark:text-slate-350 font-mono">
                        <span className="truncate max-w-[360px]">🔗 {att}</span>
                        <button
                          type="button"
                          onClick={() => setSubmitTaskAttachments(submitTaskAttachments.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-650 cursor-pointer font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-900">
                <button
                  type="submit"
                  disabled={submittingWorkSpinner || !submitTaskDesc.trim()}
                  className="flex-1 py-3 rounded-2xl bg-primary hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingWorkSpinner ? "Submitting..." : "Submit Proof"}
                </button>
                <button
                  type="button"
                  onClick={() => setSubmitTaskModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Submission Modal Layer */}
      {reviewSubmissionModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-[460px] rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-2xl flex flex-col gap-5">
            <div>
              <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">
                {reviewAction === "reject" ? "Reject Submission" : "Approve Submission"}
              </h2>
              <p className="text-2xs text-slate-505 dark:text-slate-400 mt-1 font-medium">
                {reviewAction === "reject" ? "State the feedback reasons for rejecting the task completion." : "Confirm approving the member task as successfully completed."}
              </p>
            </div>

            {reviewError && (
              <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-955/20 border border-red-100/50 dark:border-red-900/30 text-2xs text-red-655 dark:text-red-400 font-bold text-center">
                {reviewError}
              </div>
            )}

            <form onSubmit={handleReviewSubmission} className="space-y-4">
              {reviewAction === "reject" && (
                <div>
                  <label className="block text-[10px] font-bold tracking-wider text-slate-450 dark:text-slate-550 uppercase mb-2">Rejection Feedback (Required)</label>
                  <textarea
                    required
                    rows={4}
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    placeholder="Enter detailed feedback on what needs to be fixed..."
                    className="w-full px-4 py-2.5 rounded-xl border border-red-500/30 dark:border-red-500/20 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:border-red-500 leading-normal"
                  />
                </div>
              )}

              {/* Yes on Left, No on Right */}
              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-900">
                <button
                  type="submit"
                  disabled={reviewSpinner || (reviewAction === "reject" && !reviewFeedback.trim())}
                  className="flex-1 py-3 rounded-2xl bg-primary hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {reviewSpinner ? "Processing..." : "Yes"}
                </button>
                <button
                  type="button"
                  onClick={() => setReviewSubmissionModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                >
                  No
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Vault Record Editing Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-[640px] my-8 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-2xl flex flex-col gap-6 max-h-[85vh] overflow-y-auto animate-in zoom-in duration-200">
            <div>
              <h2 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-primary" />
                Edit Vault Record: V{editingRecord.activeVersionNumber}
              </h2>
              <p className="text-2xs text-slate-505 dark:text-slate-400 mt-1 font-medium">Modify meeting summary, decisions, and tasks. Date, time, and duration are read-only.</p>
            </div>

            {updatingRecordError && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-955/20 border border-red-100 dark:border-red-900/30 text-2xs text-red-600 dark:text-red-400 font-bold text-center">
                {updatingRecordError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateVaultRecord(
                  editingRecord.id,
                  editRecordTitle,
                  editRecordSummary,
                  editRecordAssignments,
                  editRecordScore,
                  editRecordChangeReason
                );
              }}
              className="space-y-5"
            >
              {/* Title Input */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-450 dark:text-slate-500 uppercase mb-1.5">Meeting Title</label>
                <input
                  type="text"
                  required
                  value={editRecordTitle}
                  onChange={(e) => setEditRecordTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Read-Only Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10">
                <div>
                  <span className="block text-[8px] font-bold tracking-wider text-slate-400 uppercase">Original Date</span>
                  <span className="block text-2xs font-extrabold text-slate-600 dark:text-slate-400 mt-0.5">
                    {new Date(editingRecord.date).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] font-bold tracking-wider text-slate-400 uppercase">Original Duration</span>
                  <span className="block text-2xs font-extrabold text-slate-600 dark:text-slate-400 mt-0.5">
                    {formatDuration(editingRecord.duration)}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] font-bold tracking-wider text-slate-400 uppercase">Active Version</span>
                  <span className="block text-2xs font-extrabold text-slate-600 dark:text-slate-400 mt-0.5">
                    V{editingRecord.activeVersionNumber}
                  </span>
                </div>
              </div>

              {/* Topic & Overview */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1.5">Topic</label>
                <input
                  type="text"
                  required
                  value={editRecordSummary?.topic || ""}
                  onChange={(e) => setEditRecordSummary({ ...editRecordSummary, topic: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1.5">Overview Summary</label>
                <textarea
                  required
                  rows={3}
                  value={editRecordSummary?.overview || ""}
                  onChange={(e) => setEditRecordSummary({ ...editRecordSummary, overview: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:border-red-500 leading-normal"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1.5">Outcome</label>
                <input
                  type="text"
                  required
                  value={editRecordSummary?.outcome || ""}
                  onChange={(e) => setEditRecordSummary({ ...editRecordSummary, outcome: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Decisions Panel */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Key Decisions</span>
                  <button
                    type="button"
                    onClick={() => {
                      const decs = [...(editRecordSummary?.decisions || [])];
                      decs.push("New Decision Item");
                      setEditRecordSummary({ ...editRecordSummary, decisions: decs });
                    }}
                    className="text-3xs font-extrabold uppercase tracking-wide text-primary hover:underline cursor-pointer"
                  >
                    + Add Decision
                  </button>
                </div>
                <div className="space-y-2">
                  {(editRecordSummary?.decisions || []).map((dec: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={dec}
                        onChange={(e) => {
                          const decs = [...(editRecordSummary.decisions)];
                          decs[idx] = e.target.value;
                          setEditRecordSummary({ ...editRecordSummary, decisions: decs });
                        }}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-855 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-none focus:border-red-500 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const decs = editRecordSummary.decisions.filter((_: any, i: number) => i !== idx);
                          setEditRecordSummary({ ...editRecordSummary, decisions: decs });
                        }}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assignments Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Task Assignments</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditRecordAssignments([
                        ...editRecordAssignments,
                        { memberEmail: "", memberName: "", task: "New Task Description", deadline: null }
                      ]);
                    }}
                    className="text-3xs font-extrabold uppercase tracking-wide text-primary hover:underline cursor-pointer"
                  >
                    + Add Task
                  </button>
                </div>
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                  {editRecordAssignments.map((assign, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 flex flex-col gap-2 relative">
                      <button
                        type="button"
                        onClick={() => {
                          setEditRecordAssignments(editRecordAssignments.filter((_, i) => i !== idx));
                        }}
                        className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="grid grid-cols-2 gap-3 mr-6">
                        <div>
                          <input
                            type="text"
                            required
                            placeholder="Assignee Name"
                            value={assign.memberName}
                            onChange={(e) => {
                              const updated = [...editRecordAssignments];
                              updated[idx].memberName = e.target.value;
                              setEditRecordAssignments(updated);
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-3xs font-semibold focus:outline-none"
                          />
                        </div>
                        <div>
                          <input
                            type="email"
                            required
                            placeholder="Assignee Email"
                            value={assign.memberEmail}
                            onChange={(e) => {
                              const updated = [...editRecordAssignments];
                              updated[idx].memberEmail = e.target.value;
                              setEditRecordAssignments(updated);
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-3xs font-semibold focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <input
                            type="text"
                            required
                            placeholder="Task description"
                            value={assign.task}
                            onChange={(e) => {
                              const updated = [...editRecordAssignments];
                              updated[idx].task = e.target.value;
                              setEditRecordAssignments(updated);
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-3xs font-semibold focus:outline-none"
                          />
                        </div>
                        <div>
                          <input
                            type="date"
                            value={assign.deadline || ""}
                            onChange={(e) => {
                              const updated = [...editRecordAssignments];
                              updated[idx].deadline = e.target.value || null;
                              setEditRecordAssignments(updated);
                            }}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-900 text-3xs font-semibold focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Change Reason Requirement */}
              <div>
                <label className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-1.5">
                  Reason for Change <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editRecordChangeReason}
                  onChange={(e) => setEditRecordChangeReason(e.target.value)}
                  placeholder="E.g., Extended deadline for phase completion."
                  className="w-full px-4 py-2.5 rounded-xl border border-red-500/30 dark:border-red-500/20 bg-slate-50 dark:bg-slate-900 text-xs font-semibold focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-900">
                <button
                  type="submit"
                  disabled={updatingRecordSpinner || !editRecordChangeReason}
                  className="flex-1 py-3 rounded-2xl bg-primary hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {updatingRecordSpinner ? "Saving V..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History Snapshot Modal */}
      {selectedVersionSnapshot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-[600px] my-8 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 shadow-2xl flex flex-col gap-5 max-h-[80vh] overflow-y-auto animate-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">
                  Version V{selectedVersionSnapshot.versionNumber} Snapshot
                </h2>
                <p className="text-3xs text-slate-500 font-semibold mt-0.5">
                  Change Reason: {selectedVersionSnapshot.changeReason}
                </p>
              </div>
              <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase select-none">
                Read-only
              </span>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              {/* Topic & Overview */}
              <div>
                <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">Topic</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">{selectedVersionSnapshot.summary?.topic}</p>
              </div>
              <div>
                <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">Overview Summary</span>
                <p className="font-semibold text-slate-700 dark:text-slate-305 leading-normal">{selectedVersionSnapshot.summary?.overview}</p>
              </div>
              <div>
                <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">Outcome</span>
                <p className="font-semibold text-slate-700 dark:text-slate-350">{selectedVersionSnapshot.summary?.outcome}</p>
              </div>

              {/* Decisions */}
              <div>
                <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">Key Decisions</span>
                <ul className="list-disc pl-5 font-semibold text-slate-700 dark:text-slate-300 space-y-1">
                  {(selectedVersionSnapshot.summary?.decisions || []).map((dec: string, i: number) => (
                    <li key={i}>{dec}</li>
                  ))}
                </ul>
              </div>

              {/* Assignments */}
              <div>
                <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">Assignments</span>
                <div className="space-y-2">
                  {(selectedVersionSnapshot.assignments || []).map((assign: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-3xs font-semibold">
                      <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                        <span>{assign.memberName} ({assign.memberEmail})</span>
                        <span className="text-red-500 font-mono">Deadline: {assign.deadline || "No deadline"}</span>
                      </div>
                      <p className="mt-1 text-slate-650 dark:text-slate-400 font-semibold">{assign.task}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedVersionSnapshot(null)}
              className="w-full py-3.5 mt-2 rounded-2xl bg-primary hover:opacity-90 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Close Snapshot
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
