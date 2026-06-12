import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { ObjectId } from "mongodb";
import { decrypt } from "@/lib/crypto";

export async function POST(request: NextRequest) {
  try {
    const activeUser = await getActiveUser();
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { hubId, message } = await request.json();
    if (!hubId || !message || !message.trim()) {
      return NextResponse.json({ error: "Hub ID and query message are required." }, { status: 400 });
    }

    const db = await getDb();
    const userObjectId = new ObjectId(activeUser.id);
    const hubObjectId = new ObjectId(hubId);

    // 1. Verify user membership and role
    const membership = await db.collection("memberships").findOne({
      hubId: hubObjectId,
      userId: userObjectId,
      status: { $in: ["Approved", "approved"] },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied. You are not a member of this Hub." }, { status: 403 });
    }

    const role = (membership.role || "").toLowerCase();
    const isOwner = role === "owner";
    const cleanUserEmail = activeUser.email.trim().toLowerCase();

    // 2. Fetch Hub details
    const hub = await db.collection("hubs").findOne({ _id: hubObjectId });
    if (!hub) {
      return NextResponse.json({ error: "Hub not found." }, { status: 404 });
    }

    // 3. Compile RAG context based on Role
    let contextData: any = {};
    contextData.hubName = hub.hubName;
    contextData.hubDescription = hub.description || "";
    contextData.userRole = isOwner ? "owner" : "member";
    contextData.currentTime = new Date().toISOString();

    // Fetch Scheduled/Active Meetings
    const meetings = await db.collection("meetings").find({ hubId: hubObjectId }).toArray();
    contextData.scheduledMeetings = meetings.map(m => ({
      title: m.title,
      scheduledAt: m.scheduledAt,
      status: m.status,
    }));

    // Fetch Vault Records (Meeting Summaries & Assignments)
    const vaultRecords = await db.collection("vaultMeetings").find({ hubId: hubObjectId }).toArray();

    if (isOwner) {
      // Owner gets all vault details (excluding raw transcripts to keep payload slim, but including summary + assignments)
      contextData.vaultMeetings = vaultRecords.map(vr => ({
        meetingTitle: vr.title,
        date: vr.date,
        duration: vr.duration,
        summary: vr.summary,
        assignments: vr.assignments || [],
        versionCount: vr.versions?.length || 1,
        activeVersion: vr.activeVersionNumber || 1,
      }));

      // Owner gets all submissions
      const submissions = await db.collection("submissions").find({ hubId: hubObjectId }).toArray();
      contextData.submissions = submissions.map(s => ({
        assigneeName: s.assigneeName,
        assigneeEmail: s.assigneeEmail,
        task: s.task,
        deadline: s.deadline,
        status: s.status,
        attemptsCount: s.attempts?.length || 0,
        lastAttempt: s.attempts?.[s.attempts.length - 1] ? {
          submittedAt: s.attempts[s.attempts.length - 1].submittedAt,
          description: s.attempts[s.attempts.length - 1].description,
          attachments: s.attempts[s.attempts.length - 1].attachments || [],
          feedback: s.attempts[s.attempts.length - 1].feedback || "",
        } : null
      }));

      // Owner gets membership list for stats
      const allMemberships = await db.collection("memberships").find({ hubId: hubObjectId }).toArray();
      contextData.members = allMemberships.map(m => ({
        name: m.name,
        email: m.email,
        role: m.role,
        status: m.status
      }));

    } else {
      // Member gets filtered vault data: only meeting summaries and their own assignments
      contextData.vaultMeetings = vaultRecords.map(vr => {
        const myAssignments = (vr.assignments || []).filter(
          (a: any) => a.memberEmail?.trim().toLowerCase() === cleanUserEmail
        );
        return {
          meetingTitle: vr.title,
          date: vr.date,
          duration: vr.duration,
          summary: vr.summary, // Summaries and decisions are allowed
          myAssignments: myAssignments,
        };
      });

      // Member gets only their own submissions
      const mySubmissions = await db.collection("submissions").find({
        hubId: hubObjectId,
        assigneeEmail: cleanUserEmail
      }).toArray();

      contextData.mySubmissions = mySubmissions.map(s => ({
        task: s.task,
        deadline: s.deadline,
        status: s.status,
        attempts: (s.attempts || []).map((att: any) => ({
          attemptNumber: att.attemptNumber,
          submittedAt: att.submittedAt,
          description: att.description,
          attachments: att.attachments || [],
          status: att.status,
          feedback: att.feedback || "",
          reviewedAt: att.reviewedAt || null
        }))
      }));
    }

    // Fetch Notifications for current user
    const userNotifications = await db.collection("notifications")
      .find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    contextData.recentNotifications = userNotifications.map(n => ({
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
    }));

    // 4. Retrieve chat history (capped to last 30 messages)
    const chatDoc = await db.collection("agentChats").findOne({
      hubId: hubObjectId,
      userId: userObjectId
    });

    const conversationHistory = chatDoc ? chatDoc.messages || [] : [];

    // 5. Build prompt with system instructions
    const systemPrompt = `
You are the Hub Intelligence Assistant, a professional workspace AI agent built as a core feature.
You must behave as a team assistant, meeting assistant, assignment assistant, and knowledge assistant.
You do NOT act as a generic chatbot.

CRITICAL RULES:
1. STRICT TRUTH: Answer questions ONLY using the RAG Context provided below. If the information is not in the context, respond: "I do not have enough Hub data to answer that question." Never invent or extrapolate any assignments, deadlines, summaries, or tasks.
2. PROFESSIONAL RESPONSE FORMAT: Maintain a premium, professional SaaS appearance. Use clear headings, bulleted lists, status indicators, and exact dates/deadlines.
3. NO DECORATIVE EMOJIS: Do not use decorative emojis (such as fire, rocket, party, sparkles, or sunglasses emojis). Keep response icons strictly functional (e.g. "✓ Completed", "⚠️ Overdue", "📅 Deadline").
4. SECURITY & ROLES: You are answering as a assistant to a Hub ${isOwner ? "OWNER" : "MEMBER"}. Keep all information restricted to what is contained in the RAG Context.
5. DEPENDENCY ANALYSIS: When asked about dependencies, timelines, or "Can I start my task?", analyze assignments, deadlines, task descriptions, and meeting decisions in the context. Explicitly deduce if a task is independent, or if it depends on another task (e.g. Frontend depends on Backend Completion). Explain your reasoning clearly and state the current status (e.g., Pending, Approved, Overdue).

RAG CONTEXT:
${JSON.stringify(contextData, null, 2)}
`;

    // 6. Call Gemini
    let apiKey = "";
    if (hub && hub.googleApiKey) {
      try {
        apiKey = decrypt(hub.googleApiKey);
      } catch (decErr) {
        console.error("Failed to decrypt Hub Google API key:", decErr);
      }
    }
    if (!apiKey) {
      apiKey = process.env.GOOGLE_API_KEY || "";
    }

    let agentResponseText = "";

    if (apiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
      
      const contentsList: any[] = [];
      contentsList.push({
        role: "user",
        parts: [{ text: systemPrompt }]
      });
      contentsList.push({
        role: "model",
        parts: [{ text: `Understood. I will strictly act as the Hub Intelligence Assistant using the provided RAG Context under the role of ${isOwner ? "Owner" : "Member"}. I will not invent details, will avoid decorative emojis, and format responses professionally.` }]
      });

      conversationHistory.slice(-20).forEach((msg: any) => {
        contentsList.push({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.message }]
        });
      });

      contentsList.push({
        role: "user",
        parts: [{ text: message }]
      });

      try {
        const geminiRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: contentsList,
          }),
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          agentResponseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } else {
          console.error("Gemini API Error details:", await geminiRes.text());
        }
      } catch (geminiErr) {
        console.error("Gemini request failed:", geminiErr);
      }
    }

    if (!agentResponseText || agentResponseText.includes("GOOGLE_API_KEY missing") || agentResponseText.includes("Error communicating with the Gemini")) {
      agentResponseText = generateMockAgentResponse(message, contextData);
    }

    // 7. Save conversation log (limit history to last 30 messages)
    const newUserMsg = { sender: "user", message: message.trim(), timestamp: new Date() };
    const newAgentMsg = { sender: "agent", message: agentResponseText.trim(), timestamp: new Date() };

    let updatedHistory = [...conversationHistory, newUserMsg, newAgentMsg];
    if (updatedHistory.length > 30) {
      updatedHistory = updatedHistory.slice(-30);
    }

    await db.collection("agentChats").updateOne(
      { hubId: hubObjectId, userId: userObjectId },
      {
        $set: {
          role: role,
          messages: updatedHistory,
          updatedAt: new Date()
        },
        $setOnInsert: {
          hubId: hubObjectId,
          userId: userObjectId,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      response: agentResponseText,
    });

  } catch (err: any) {
    console.error("Agent chat error:", err);
    return NextResponse.json({ error: err.message || "Failed to process query." }, { status: 500 });
  }
}

function generateMockAgentResponse(query: string, context: any): string {
  const q = query.toLowerCase().trim();
  
  if (context.userRole === "owner") {
    // OWNER QUERIES
    if (q.includes("pending assignments") || q.includes("pending reviews")) {
      const pendingList = (context.vaultMeetings || []).flatMap((vm: any) => 
        (vm.assignments || []).filter((a: any) => a.status === "pending_review")
      );
      if (pendingList.length === 0) return "### Pending Assignments\nNo assignments are currently pending review.";
      return `### Pending Assignments\nHere are the assignments waiting for review:\n` + 
        pendingList.map((a: any) => `- **${a.task}** assigned to ${a.memberName} (${a.memberEmail})`).join("\n");
    }

    if (q.includes("overdue work") || q.includes("overdue tasks") || q.includes("show overdue")) {
      const overdueList = (context.vaultMeetings || []).flatMap((vm: any) => 
        (vm.assignments || []).filter((a: any) => a.status === "overdue")
      );
      if (overdueList.length === 0) return "### Overdue Assignments\nThere are currently no overdue tasks.";
      return `### Overdue Assignments\n⚠️ The following tasks have passed their deadlines:\n` + 
        overdueList.map((a: any) => `- **${a.task}** assigned to ${a.memberName} (Deadline: ${a.deadline || "None"})`).join("\n");
    }

    if (q.includes("status report") || q.includes("weekly report") || q.includes("progress report") || q.includes("project summary") || q.includes("project health") || q.includes("team progress")) {
      const allTasks = (context.vaultMeetings || []).flatMap((vm: any) => vm.assignments || []);
      const completed = allTasks.filter((t: any) => t.status === "approved").length;
      const pending = allTasks.filter((t: any) => t.status === "pending_review").length;
      const overdue = allTasks.filter((t: any) => t.status === "overdue").length;
      const rejected = allTasks.filter((t: any) => t.status === "rejected").length;

      return `### Workspace Progress Status Report
Generated on: ${new Date().toLocaleDateString()}

**Overall Task Metrics:**
- ✓ Approved/Completed: **${completed}**
- ⏳ Pending Review: **${pending}**
- ❌ Rejected/In Correction: **${rejected}**
- ⚠️ Overdue: **${overdue}**
- 📅 Total Tasks Tracked: **${allTasks.length}**

**Team Completion Rate:** ${allTasks.length ? Math.round((completed / allTasks.length) * 100) : 100}%
`;
    }

    if (q.includes("submission statistics") || q.includes("submissions stats")) {
      const subs = context.submissions || [];
      return `### Submission Statistics
Total submissions tracked: **${subs.length}**

Breakdown:
- Approved: **${subs.filter((s: any) => s.status === "approved").length}**
- Pending Review: **${subs.filter((s: any) => s.status === "pending_review").length}**
- Rejected: **${subs.filter((s: any) => s.status === "rejected").length}**
`;
    }
  } else {
    // MEMBER QUERIES
    if (q.includes("my tasks") || q.includes("my assignments") || q.includes("explain my assignments")) {
      const myAssignments = (context.vaultMeetings || []).flatMap((vm: any) => vm.myAssignments || []);
      if (myAssignments.length === 0) return "### My Assignments\nYou do not have any active assignments in this Hub.";
      return `### My Assignments\nHere are your current commitments:\n` + 
        myAssignments.map((a: any) => `- **${a.task}** [Status: ${a.status}]`).join("\n");
    }

    if (q.includes("my deadlines") || q.includes("show my deadlines")) {
      const myAssignments = (context.vaultMeetings || []).flatMap((vm: any) => vm.myAssignments || []);
      const withDeadlines = myAssignments.filter((a: any) => a.deadline);
      if (withDeadlines.length === 0) return "### My Deadlines\nYou have no approaching deadlines.";
      return `### My Deadlines\n` + 
        withDeadlines.map((a: any) => `- **${a.task}**: 📅 ${a.deadline}`).join("\n");
    }

    if (q.includes("my feedback") || q.includes("show my feedback") || q.includes("owner feedback")) {
      const subs = context.mySubmissions || [];
      const withFeedback = subs.flatMap((s: any) => (s.attempts || []).filter((a: any) => a.feedback));
      if (withFeedback.length === 0) return "### Owner Feedback\nNo feedback comments have been recorded for your submissions yet.";
      return `### Owner Feedback\nHere is feedback from recent review cycles:\n` + 
        withFeedback.map((a: any) => `- Attempt #${a.attemptNumber}: "${a.feedback}"`).join("\n");
    }

    if (q.includes("what should i work on next") || q.includes("what should i do next")) {
      const myAssignments = (context.vaultMeetings || []).flatMap((vm: any) => vm.myAssignments || []);
      const todo = myAssignments.filter((a: any) => a.status !== "approved");
      if (todo.length === 0) return "### Next Action Steps\nAll your assigned tasks are completed! You are up to date.";
      const highPrio = todo[0];
      return `### Next Action Steps\nYou should prioritize completing this assignment:
- **Task:** ${highPrio.task}
- **Deadline:** ${highPrio.deadline || "None"}
- **Current Status:** ${highPrio.status}`;
    }
  }

  // COMMON QUERIES
  if (q.includes("meeting") && (q.includes("summary") || q.includes("summarize") || q.includes("latest") || q.includes("last"))) {
    const latest = context.vaultMeetings?.[0];
    if (!latest) return "### Latest Meeting Summary\nNo meetings have been logged in the Vault yet.";
    return `### Latest Meeting Summary
**Topic:** ${latest.meetingTitle}
**Overview:** ${latest.summary?.overview || "No overview summary provided."}
**Key Decisions:**
${(latest.summary?.decisions || []).map((d: string) => `- ${d}`).join("\n") || "- None"}
`;
  }

  if (q.includes("dependency") || q.includes("can i start my work") || q.includes("can i start my task")) {
    const allAssignments = (context.vaultMeetings || []).flatMap((vm: any) => vm.assignments || vm.myAssignments || []);
    const backendTask = allAssignments.find((a: any) => a.task.toLowerCase().includes("backend") || a.task.toLowerCase().includes("api"));
    const frontendTask = allAssignments.find((a: any) => a.task.toLowerCase().includes("frontend") || a.task.toLowerCase().includes("ui") || a.task.toLowerCase().includes("client"));

    if (frontendTask && backendTask) {
      return `### Task Dependency Analysis
- **Your Request**: Dependency status check
- **Deduction**: The Frontend UI task (**"${frontendTask.task}"**) depends on the completion of the Backend API task (**"${backendTask.task}"**).
- **Current Status**: Backend task is currently **${backendTask.status}**.
- **Recommendation**: ${backendTask.status === "approved" ? "The backend is approved. You can start Frontend work independently." : "Please wait for Backend task completion."}
`;
    }

    return `### Task Dependency Analysis
Based on the current Hub assignments, your assigned tasks do not have any explicit sequential dependencies. You can complete your tasks independently.
`;
  }

  return `### Hub Intelligence Assistant
I am ready to assist you. Here is general Hub info:
- **Workspace Name:** ${context.hubName}
- **Current Role:** ${context.userRole.toUpperCase()}
- **Scheduled Meetings:** ${context.scheduledMeetings?.length || 0}
- **Vault records:** ${context.vaultMeetings?.length || 0}

Please feel free to ask about your tasks, deadlines, latest meeting summaries, or generate reports.
`;
}

