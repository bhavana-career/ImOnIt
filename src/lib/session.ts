import { getDb } from "./db";
import { cookies } from "next/headers";
import crypto from "crypto";
import { ObjectId } from "mongodb";

export interface UserSession {
  token: string;
  userId: string;
  email: string;
  createdAt: Date;
  lastActiveAt: Date;
}

const SESSION_INACTIVITY_MS = 5 * 24 * 60 * 60 * 1000; // 5 days in ms

export async function getSessionTokens(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const rawTokens = cookieStore.get("session_tokens")?.value;
  if (!rawTokens) return {};
  try {
    return JSON.parse(rawTokens);
  } catch {
    return {};
  }
}

export async function getActiveEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("active_email")?.value || null;
}

export async function getUserAccounts(): Promise<Array<{ email: string; name: string; image: string | null }>> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("user_accounts")?.value;
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getGravatarUrl(email: string): string {
  const hash = crypto.createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?d=identicon`;
}

export async function getActiveUser() {
  const activeEmail = await getActiveEmail();
  if (!activeEmail) return null;

  const tokens = await getSessionTokens();
  const token = tokens[activeEmail];
  if (!token) return null;

  const db = await getDb();
  const session = await db.collection("sessions").findOne({ token });
  if (!session) {
    // Clean up local cookie state if session not in DB
    await removeAccountFromSession(activeEmail);
    return null;
  }

  // Check 5-day inactivity
  const now = new Date();
  const lastActive = new Date(session.lastActiveAt);
  if (now.getTime() - lastActive.getTime() > SESSION_INACTIVITY_MS) {
    // Expired
    await db.collection("sessions").deleteOne({ token });
    await removeAccountFromSession(activeEmail);
    throw new Error("Session expired. Please sign in again.");
  }

  // Update lastActiveAt
  await db.collection("sessions").updateOne(
    { token },
    { $set: { lastActiveAt: now } }
  );

  const user = await db.collection("users").findOne({ _id: session.userId });
  if (!user) return null;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: user.image || getGravatarUrl(user.email),
    authProvider: user.authProvider || user.provider,
  };
}

export async function createSession(userId: string, email: string, name: string, image: string | null) {
  const db = await getDb();
  
  // Delete existing session for this email in database
  await db.collection("sessions").deleteMany({ email });

  // Create new session token
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();

  await db.collection("sessions").insertOne({
    token,
    userId: new ObjectId(userId),
    email,
    createdAt: now,
    lastActiveAt: now,
  });

  // Update cookies
  const cookieStore = await cookies();
  
  // 1. Update session_tokens
  const tokens = await getSessionTokens();
  tokens[email] = token;
  cookieStore.set("session_tokens", JSON.stringify(tokens), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days cookie retention
  });

  // 2. Set active_email
  cookieStore.set("active_email", email, {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  // 3. Update user_accounts
  let accounts = await getUserAccounts();
  // Remove if email already exists in list
  accounts = accounts.filter((acc) => acc.email !== email);
  accounts.push({ email, name, image: image || getGravatarUrl(email) });
  cookieStore.set("user_accounts", JSON.stringify(accounts), {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function switchSession(email: string) {
  const tokens = await getSessionTokens();
  if (!tokens[email]) {
    throw new Error("No session found for this account.");
  }
  const cookieStore = await cookies();
  cookieStore.set("active_email", email, {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function removeAccountFromSession(email: string) {
  const db = await getDb();
  const tokens = await getSessionTokens();
  const token = tokens[email];
  if (token) {
    await db.collection("sessions").deleteOne({ token });
  }

  // Remove from cookies
  delete tokens[email];
  const cookieStore = await cookies();

  if (Object.keys(tokens).length === 0) {
    // Clear everything
    cookieStore.delete("session_tokens");
    cookieStore.delete("active_email");
    cookieStore.delete("user_accounts");
  } else {
    // Update cookies
    cookieStore.set("session_tokens", JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    let accounts = await getUserAccounts();
    accounts = accounts.filter((acc) => acc.email !== email);
    cookieStore.set("user_accounts", JSON.stringify(accounts), {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    // If active email was the one removed, switch to another account
    const activeEmail = cookieStore.get("active_email")?.value;
    if (activeEmail === email) {
      const remainingEmail = Object.keys(tokens)[0];
      cookieStore.set("active_email", remainingEmail, {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
    }
  }
}

export async function clearAllSessions() {
  const db = await getDb();
  const tokens = await getSessionTokens();
  
  for (const token of Object.values(tokens)) {
    await db.collection("sessions").deleteOne({ token });
  }

  const cookieStore = await cookies();
  cookieStore.delete("session_tokens");
  cookieStore.delete("active_email");
  cookieStore.delete("user_accounts");
}

export async function updateSessionUser(email: string, name: string, image: string | null) {
  const cookieStore = await cookies();
  let accounts = await getUserAccounts();
  
  accounts = accounts.map((acc) => {
    if (acc.email.toLowerCase() === email.toLowerCase()) {
      return { ...acc, name, image: image || getGravatarUrl(email) };
    }
    return acc;
  });

  cookieStore.set("user_accounts", JSON.stringify(accounts), {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}
