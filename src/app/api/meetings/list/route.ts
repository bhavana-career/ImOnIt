import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { ObjectId } from "mongodb";
import { getAppUrl } from "@/lib/utils";

import { sendAssignmentOverdueEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  try {
    const appUrl = getAppUrl(request);
    const activeUser = await getActiveUser();
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

    // 1. Verify user membership
    const membership = await db.collection("memberships").findOne({
      hubId: hubObjectId,
      userId: userObjectId,
      status: { $in: ["Approved", "approved"] },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied. You are not an approved member of this Hub." }, { status: 403 });
    }

    // 2. Fetch scheduled/active meetings (sorted by scheduledAt)
    const meetings = await db.collection("meetings")
      .find({ hubId: hubObjectId })
      .sort({ scheduledAt: 1 })
      .toArray();

    const formattedMeetings = meetings.map((m) => ({
      id: m._id.toString(),
      title: m.title,
      description: m.description,
      scheduledAt: m.scheduledAt,
      status: m.status,
      livekitRoomId: m.livekitRoomId,
      createdAt: m.createdAt,
    }));

    // 3. Fetch Vault-stored meeting records and check for overdue tasks
    const vaultRecords = await db.collection("vaultMeetings")
      .find({ hubId: hubObjectId })
      .sort({ date: -1 })
      .toArray();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const vr of vaultRecords) {
      const assignments = vr.assignments || [];
      let changed = false;

      for (let i = 0; i < assignments.length; i++) {
        const assign = assignments[i];
        if (assign.deadline) {
          const target = new Date(assign.deadline);
          target.setHours(0, 0, 0, 0);
          if (target.getTime() < today.getTime() && assign.status !== "approved" && assign.status !== "overdue") {
            assign.status = "overdue";
            changed = true;

            const memberUser = await db.collection("users").findOne({ email: assign.memberEmail.trim().toLowerCase() });
            const hub = await db.collection("hubs").findOne({ _id: hubObjectId });
            const ownerMembership = await db.collection("memberships").findOne({
              hubId: hubObjectId,
              role: "owner",
              status: { $in: ["Approved", "approved"] },
            });

            if (memberUser && hub) {
              await db.collection("notifications").insertOne({
                userId: memberUser._id,
                type: "assignment_overdue",
                title: "Assignment Overdue",
                message: `Your assignment "${assign.task.slice(0, 50)}..." in Hub "${hub.hubName}" is overdue.`,
                read: false,
                metadata: {
                  hubId: hub._id.toString(),
                  vaultMeetingId: vr._id.toString(),
                  taskIndex: i,
                },
                createdAt: new Date(),
              });

              try {
                await sendAssignmentOverdueEmail({
                  to: assign.memberEmail,
                  memberName: assign.memberName,
                  hubName: hub.hubName,
                  meetingTitle: vr.title,
                  task: assign.task,
                  deadline: assign.deadline,
                  dashboardLink: `${appUrl}/dashboard`,
                });
              } catch (e) {
                console.error("Failed to send overdue email to member", e);
              }
            }

            if (ownerMembership && hub) {
              await db.collection("notifications").insertOne({
                userId: ownerMembership.userId,
                type: "assignment_overdue",
                title: "Assignment Overdue Alert",
                message: `Task assigned to ${assign.memberName} ("${assign.task.slice(0, 50)}...") in Hub "${hub.hubName}" is overdue.`,
                read: false,
                metadata: {
                  hubId: hub._id.toString(),
                  vaultMeetingId: vr._id.toString(),
                  taskIndex: i,
                  assigneeName: assign.memberName,
                },
                createdAt: new Date(),
              });

              try {
                await sendAssignmentOverdueEmail({
                  to: ownerMembership.email,
                  memberName: ownerMembership.name || "Owner",
                  hubName: hub.hubName,
                  meetingTitle: vr.title,
                  task: assign.task,
                  deadline: assign.deadline,
                  dashboardLink: `${appUrl}/dashboard`,
                });
              } catch (e) {
                console.error("Failed to send overdue email to owner", e);
              }
            }
          }
        }
      }

      if (changed) {
        await db.collection("vaultMeetings").updateOne(
          { _id: vr._id },
          { $set: { assignments, updatedAt: new Date() } }
        );
      }
    }

    const formattedVaultRecords = vaultRecords.map((vr) => ({
      id: vr._id.toString(),
      title: vr.title,
      date: vr.date,
      duration: vr.duration,
      transcript: vr.transcript || [],
      summary: vr.summary,
      assignments: vr.assignments || [],
      score: vr.score,
      versions: vr.versions || [],
      activeVersionNumber: vr.activeVersionNumber || 1,
      createdAt: vr.createdAt,
      updatedAt: vr.updatedAt,
    }));

    // 4. Fetch Submissions for the Hub (to display submission history and review states)
    const submissions = await db.collection("submissions")
      .find({ hubId: hubObjectId })
      .toArray();

    const formattedSubmissions = submissions.map((s) => ({
      id: s._id.toString(),
      vaultMeetingId: s.vaultMeetingId.toString(),
      taskIndex: s.taskIndex,
      assigneeEmail: s.assigneeEmail,
      assigneeName: s.assigneeName,
      task: s.task,
      deadline: s.deadline,
      status: s.status,
      attempts: s.attempts || [],
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      meetings: formattedMeetings,
      vaultMeetings: formattedVaultRecords,
      submissions: formattedSubmissions,
    });

  } catch (err: any) {
    console.error("Error listing meetings:", err);
    return NextResponse.json({ error: err.message || "Failed to list meetings." }, { status: 500 });
  }
}
