import { getDb } from "./db";
import { cookies, headers } from "next/headers";
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

export async function getUserAccounts(): Promise<Array<{ id: string; email: string; name: string; image: string | null }>> {
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

export async function getActiveAccountId(request?: Request | any): Promise<string | null> {
  // 1. Try to read from direct request if provided
  if (request) {
    if (typeof request === "string") return request;
    if (typeof request.headers?.get === "function") {
      const headerAccount = request.headers.get("x-active-account");
      if (headerAccount) return headerAccount;
    }
    if (request.url) {
      try {
        const url = new URL(request.url);
        const accountParam = url.searchParams.get("account");
        if (accountParam) return accountParam;
      } catch {}
    }
  }

  // 2. Try to read from global headers list
  try {
    const headersList = await headers();
    const headerAccount = headersList.get("x-active-account");
    if (headerAccount) return headerAccount;

    const referer = headersList.get("referer");
    if (referer) {
      try {
        const url = new URL(referer);
        const accountParam = url.searchParams.get("account");
        if (accountParam) return accountParam;
      } catch {}
    }
  } catch {}

  // 3. Fallback to active_account cookie
  const cookieStore = await cookies();
  return cookieStore.get("active_account")?.value || null;
}

export async function getActiveUser(request?: any) {
  const accountId = await getActiveAccountId(request);
  if (!accountId) {
    console.log(`[Failed Account Access] No accountId provided or resolved.`);
    return null;
  }

  // Verify accountId exists inside: user_accounts cookie
  const accounts = await getUserAccounts();
  const accountExists = accounts.some(acc => acc.id === accountId);
  if (!accountExists) {
    console.log(`[Failed Account Access] Account ID "${accountId}" not found in user_accounts list.`);
    return null;
  }

  const tokens = await getSessionTokens();
  const token = tokens[accountId];
  if (!token) {
    console.log(`[Failed Account Access] No session token found for account ID "${accountId}".`);
    return null;
  }

  const db = await getDb();
  const session = await db.collection("sessions").findOne({ token });
  if (!session) {
    console.log(`[Failed Account Access] Session token for account ID "${accountId}" not found in database.`);
    await removeAccountFromSession(accountId);
    return null;
  }

  // Check 5-day inactivity
  const now = new Date();
  const lastActive = new Date(session.lastActiveAt);
  if (now.getTime() - lastActive.getTime() > SESSION_INACTIVITY_MS) {
    console.log(`[Failed Account Access] Session for account ID "${accountId}" has expired due to inactivity.`);
    await db.collection("sessions").deleteOne({ token });
    await removeAccountFromSession(accountId);
    throw new Error("Session expired. Please sign in again.");
  }

  // Update lastActiveAt
  await db.collection("sessions").updateOne(
    { token },
    { $set: { lastActiveAt: now } }
  );

  const user = await db.collection("users").findOne({ _id: new ObjectId(session.userId) });
  if (!user) {
    console.log(`[Failed Account Access] User record for account ID "${accountId}" not found in database.`);
    return null;
  }

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
  
  // Enforce session limit of 3 simultaneous accounts
  let accounts = await getUserAccounts();
  const existingIndex = accounts.findIndex(acc => acc.id === userId);
  if (existingIndex === -1 && accounts.length >= 3) {
    throw new Error("Maximum of 3 accounts reached. Please logout of another account first.");
  }

  // Delete existing session for this userId in database
  await db.collection("sessions").deleteMany({ userId: new ObjectId(userId) });

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

  console.log(`[Account Login] Account ID: ${userId}, Email: ${email}`);

  // Update cookies
  const cookieStore = await cookies();
  
  // 1. Update session_tokens
  const tokens = await getSessionTokens();
  tokens[userId] = token;
  cookieStore.set("session_tokens", JSON.stringify(tokens), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  // 2. Set active_account
  cookieStore.set("active_account", userId, {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  // 3. Update user_accounts
  if (existingIndex !== -1) {
    accounts[existingIndex] = { id: userId, email, name, image: image || getGravatarUrl(email) };
  } else {
    accounts.push({ id: userId, email, name, image: image || getGravatarUrl(email) });
  }
  cookieStore.set("user_accounts", JSON.stringify(accounts), {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function switchSession(accountId: string) {
  const tokens = await getSessionTokens();
  if (!tokens[accountId]) {
    console.log(`[Failed Account Access] Attempted to switch to invalid account ID "${accountId}".`);
    throw new Error("No session found for this account.");
  }
  
  console.log(`[Account Switch] Switching to account ID: ${accountId}`);
  const cookieStore = await cookies();
  cookieStore.set("active_account", accountId, {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function removeAccountFromSession(accountId: string) {
  const db = await getDb();
  const tokens = await getSessionTokens();
  const token = tokens[accountId];
  if (token) {
    await db.collection("sessions").deleteOne({ token });
  }

  console.log(`[Account Logout] Logging out account ID: ${accountId}`);

  // Remove from cookies
  delete tokens[accountId];
  const cookieStore = await cookies();

  if (Object.keys(tokens).length === 0) {
    // Clear everything
    cookieStore.delete("session_tokens");
    cookieStore.delete("active_account");
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
    accounts = accounts.filter((acc) => acc.id !== accountId);
    cookieStore.set("user_accounts", JSON.stringify(accounts), {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    // If active_account was the one removed, switch fallback to another account
    const activeAccount = cookieStore.get("active_account")?.value;
    if (activeAccount === accountId) {
      const remainingAccountId = Object.keys(tokens)[0];
      cookieStore.set("active_account", remainingAccountId, {
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
  cookieStore.delete("active_account");
  cookieStore.delete("user_accounts");
}

export async function updateSessionUser(accountId: string, name: string, image: string | null) {
  const cookieStore = await cookies();
  let accounts = await getUserAccounts();
  
  accounts = accounts.map((acc) => {
    if (acc.id === accountId) {
      return { ...acc, name, image: image || getGravatarUrl(acc.email) };
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
