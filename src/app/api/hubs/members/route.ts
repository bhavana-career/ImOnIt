import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    const activeUser = await getActiveUser(request);
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const hubId = searchParams.get("hubId");

    if (!hubId) {
      return NextResponse.json({ error: "Hub ID is required." }, { status: 400 });
    }

    const db = await getDb();
    const userObjectId = new ObjectId(activeUser.id);
    const hubObjectId = new ObjectId(hubId);

    // 1. Verify user membership in this Hub
    const requesterMembership = await db.collection("memberships").findOne({
      hubId: hubObjectId,
      userId: userObjectId,
      status: { $in: ["Approved", "approved"] },
    });

    if (!requesterMembership) {
      return NextResponse.json({ error: "Access denied. You are not a member of this Hub." }, { status: 403 });
    }

    const isOwnerRequester = requesterMembership.role === "owner";

    // 2. Fetch all memberships for this Hub
    const allMemberships = await db.collection("memberships")
      .find({ hubId: hubObjectId })
      .toArray();

    // Fetch user profile info
    const userIds = allMemberships.map((m) => m.userId);
    const users = await db.collection("users")
      .find({ _id: { $in: userIds } })
      .toArray();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    let owner: any = null;
    const members: any[] = [];
    const pending: any[] = [];

    for (const membership of allMemberships) {
      const u = userMap.get(membership.userId.toString());
      const memberData = {
        membershipId: membership._id.toString(),
        userId: membership.userId.toString(),
        name: u?.name || membership.email.split("@")[0],
        email: membership.email,
        image: u?.image || null,
        role: membership.role,
        status: membership.status,
        createdAt: membership.createdAt,
      };

      const mStatus = membership.status?.toLowerCase();
      if (mStatus === "approved") {
        if (membership.role === "owner") {
          owner = memberData;
        } else {
          members.push(memberData);
        }
      } else if (mStatus === "pending" || mStatus === "pending_approval") {
        // Only owner can see pending requests
        if (isOwnerRequester) {
          pending.push(memberData);
        }
      }
    }

    // 3. Fetch outstanding sent invitations for the owner
    const sentInvitations = isOwnerRequester
      ? await db.collection("invitations")
          .find({ hubId: hubObjectId, status: "sent" })
          .toArray()
      : [];

    const formattedInvitations = sentInvitations.map((inv) => ({
      id: inv._id.toString(),
      email: inv.email,
      token: inv.token,
      status: inv.status,
      createdAt: inv.createdAt,
    }));

    return NextResponse.json({
      success: true,
      owner,
      members,
      pending,
      invitations: formattedInvitations,
      userRole: requesterMembership.role,
    });

  } catch (err: any) {
    console.error("Error fetching members:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch members." }, { status: 500 });
  }
}
