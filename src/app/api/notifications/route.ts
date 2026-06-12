import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    const activeUser = await getActiveUser();
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const db = await getDb();
    const userObjectId = new ObjectId(activeUser.id);

    // Fetch notifications sorted by date desc
    const notifications = await db.collection("notifications")
      .find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .toArray();

    const formatted = notifications.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      createdAt: n.createdAt,
      metadata: n.metadata || {},
    }));

    const unreadCount = formatted.filter((n) => !n.read).length;

    return NextResponse.json({
      success: true,
      notifications: formatted,
      unreadCount,
    });

  } catch (err: any) {
    console.error("Error fetching notifications:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch notifications." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const activeUser = await getActiveUser();
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { notificationId } = await request.json();
    const db = await getDb();
    const userObjectId = new ObjectId(activeUser.id);

    if (notificationId) {
      // Mark specific notification as read
      await db.collection("notifications").updateOne(
        { _id: new ObjectId(notificationId), userId: userObjectId },
        { $set: { read: true } }
      );
    } else {
      // Mark all as read
      await db.collection("notifications").updateMany(
        { userId: userObjectId, read: false },
        { $set: { read: true } }
      );
    }

    return NextResponse.json({ success: true, message: "Notifications marked as read." });

  } catch (err: any) {
    console.error("Error updating notifications:", err);
    return NextResponse.json({ error: err.message || "Failed to update notifications." }, { status: 500 });
  }
}
