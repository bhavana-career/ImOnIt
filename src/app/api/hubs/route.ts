import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    const user = await getActiveUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const db = await getDb();
    const userObjectId = new ObjectId(user.id);

    const memberships = await db.collection("memberships")
      .find({ userId: userObjectId })
      .toArray();

    const hubIds = memberships.map(m => m.hubId);
    
    const hubs = await db.collection("hubs")
      .find({ _id: { $in: hubIds } })
      .toArray();

    const hubMap = new Map(hubs.map(h => [h._id.toString(), h]));

    const vaults = await db.collection("hubVaults")
      .find({ hubId: { $in: hubIds } })
      .project({ hubId: 1 })
      .toArray();
      
    const protectedHubIds = new Set(vaults.map(v => v.hubId.toString()));

    const ownedHubs = [];
    const memberHubs = [];
    const pendingHubs = [];

    for (const membership of memberships) {
      const hub = hubMap.get(membership.hubId.toString());
      if (!hub) continue;

      const hubData = {
        id: hub._id.toString(),
        name: hub.hubName,
        description: hub.hubDescription || "",
        hubImage: hub.hubImage || null,
        createdAt: hub.createdAt,
        role: membership.role === "owner" ? "Owner" : "Member",
        actualRole: membership.role,
        vaultStatus: protectedHubIds.has(hub._id.toString()) ? "Protected" : "Unprotected",
        status: membership.status,
      };

      const mStatus = membership.status?.toLowerCase();
      if (mStatus === "approved") {
        if (membership.role === "owner") {
          ownedHubs.push(hubData);
        } else {
          memberHubs.push(hubData);
        }
      } else if (mStatus === "pending" || mStatus === "pending_approval") {
        pendingHubs.push(hubData);
      }
    }

    return NextResponse.json({
      ownedHubs,
      memberHubs,
      pendingHubs,
    });

  } catch (err: any) {
    console.error("Error fetching hubs:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch hubs." }, { status: 500 });
  }
}
