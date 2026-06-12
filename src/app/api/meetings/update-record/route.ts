import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { sendAssignmentNotificationEmail } from "@/lib/email";
import { ObjectId } from "mongodb";
import { getAppUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const activeUser = await getActiveUser();
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { vaultMeetingId, title, summary, assignments, score, changeReason } = await request.json();
    if (!vaultMeetingId || !title || !summary || !assignments || !score) {
      return NextResponse.json({ error: "Missing required fields for update." }, { status: 400 });
    }

    const db = await getDb();
    const vaultMeetingObjectId = new ObjectId(vaultMeetingId);

    // 1. Fetch current Vault Meeting record
    const vaultMeeting = await db.collection("vaultMeetings").findOne({ _id: vaultMeetingObjectId });
    if (!vaultMeeting) {
      return NextResponse.json({ error: "Vault meeting record not found." }, { status: 404 });
    }

    // 2. Verify user is Hub Owner
    const userObjectId = new ObjectId(activeUser.id);
    const membership = await db.collection("memberships").findOne({
      hubId: vaultMeeting.hubId,
      userId: userObjectId,
      role: "owner",
      status: { $in: ["Approved", "approved"] },
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized. Only the Hub Owner can modify approved records." }, { status: 403 });
    }

    const hub = await db.collection("hubs").findOne({ _id: vaultMeeting.hubId });
    if (!hub) {
      return NextResponse.json({ error: "Hub not found." }, { status: 404 });
    }

    // 3. Enforce HISTORICAL LOCKING
    // If any assignment deadline in the current active version has already passed, lock the record.
    const todayStr = new Date().toISOString().split("T")[0]; // format: 'YYYY-MM-DD'
    const currentAssignments = vaultMeeting.assignments || [];
    const hasPassedDeadline = currentAssignments.some((assign: any) => {
      return assign.deadline && assign.deadline < todayStr;
    });

    if (hasPassedDeadline) {
      return NextResponse.json({
        error: "Historical Record. This record contains assignments with passed deadlines and can no longer be modified."
      }, { status: 400 });
    }

    // 4. Create new version snapshot
    const nextVersionNumber = (vaultMeeting.activeVersionNumber || 1) + 1;
    const newVersion = {
      versionNumber: nextVersionNumber,
      editedBy: userObjectId,
      editedAt: new Date(),
      changeReason: changeReason || `Updated by Owner to Version ${nextVersionNumber}`,
      summary: JSON.parse(JSON.stringify(summary)),
      assignments: JSON.parse(JSON.stringify(assignments)),
    };

    // 5. Update DB record
    await db.collection("vaultMeetings").updateOne(
      { _id: vaultMeetingObjectId },
      {
        $set: {
          title: title.trim(),
          summary,
          assignments,
          score,
          activeVersionNumber: nextVersionNumber,
          updatedAt: new Date(),
        },
        $push: {
          versions: newVersion
        } as any
      }
    );

    // 6. REDISTRIBUTION: Notify members about the new active version (Private assignment diffs)
    const appUrl = getAppUrl(request);
    const dashboardLink = `${appUrl}/dashboard`;

    // Map old assignments by clean email + task description to calculate diffs
    const oldAssignmentsMap = new Map();
    currentAssignments.forEach((oldAssign: any) => {
      const emailKey = oldAssign.memberEmail.trim().toLowerCase();
      const taskKey = oldAssign.task.trim();
      oldAssignmentsMap.set(`${emailKey}|${taskKey}`, oldAssign);
    });

    // Notify each assigned member in the new version
    const notifyPromises = assignments.map(async (newAssign: any) => {
      const cleanEmail = newAssign.memberEmail.trim().toLowerCase();
      const taskKey = newAssign.task.trim();

      // Find member userId
      const memberMembership = await db.collection("memberships").findOne({
        hubId: vaultMeeting.hubId,
        email: cleanEmail,
        status: { $in: ["Approved", "approved"] },
      });

      if (memberMembership) {
        const oldAssign = oldAssignmentsMap.get(`${cleanEmail}|${taskKey}`);

        let isUpdate = false;
        let oldDeadline: string | null = null;

        if (oldAssign) {
          isUpdate = true;
          oldDeadline = oldAssign.deadline;
        }

        // Create website notification for member
        await db.collection("notifications").insertOne({
          userId: memberMembership.userId,
          type: "assignment_updated",
          title: "Assignment Updated",
          message: `Your task assignment has been updated in ${hub.hubName}: "${newAssign.task}" (from meeting "${title.trim()}").`,
          read: false,
          metadata: {
            hubId: hub._id.toString(),
            meetingId: vaultMeeting.meetingId?.toString() || "",
            vaultMeetingId: vaultMeetingId,
            task: newAssign.task,
            deadline: newAssign.deadline,
            oldDeadline,
            isUpdate,
          },
          createdAt: new Date(),
        });

        // Send Email: Private assignment only!
        try {
          await sendAssignmentNotificationEmail({
            to: cleanEmail,
            memberName: newAssign.memberName || cleanEmail.split("@")[0],
            hubName: hub.hubName,
            meetingTitle: title.trim(),
            task: newAssign.task,
            deadline: newAssign.deadline,
            oldDeadline,
            dashboardLink,
            isUpdate,
            overview: summary.overview,
            duration: vaultMeeting.duration,
            date: vaultMeeting.date,
            outcome: summary.outcome,
          });
        } catch (emailErr) {
          console.error(`Failed to send updated assignment email to ${cleanEmail}:`, emailErr);
        }
      }
    });

    await Promise.all(notifyPromises);

    return NextResponse.json({
      success: true,
      message: `Meeting record updated to Version ${nextVersionNumber} successfully!`,
      activeVersionNumber: nextVersionNumber,
    });

  } catch (err: any) {
    console.error("Error updating vault meeting record:", err);
    return NextResponse.json({ error: err.message || "Failed to update meeting record." }, { status: 500 });
  }
}
