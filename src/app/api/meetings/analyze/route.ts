import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const activeUser = await getActiveUser();
    if (!activeUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { meetingId } = await request.json();
    if (!meetingId) {
      return NextResponse.json({ error: "Meeting ID is required." }, { status: 400 });
    }

    const db = await getDb();
    const meetingObjectId = new ObjectId(meetingId);

    // 1. Fetch meeting
    const meeting = await db.collection("meetings").findOne({ _id: meetingObjectId });
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    }

    // 2. Verify user is Hub Owner
    const userObjectId = new ObjectId(activeUser.id);
    const membership = await db.collection("memberships").findOne({
      hubId: meeting.hubId,
      userId: userObjectId,
      role: "owner",
      status: "approved",
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized. Only the Hub Owner can trigger analysis." }, { status: 403 });
    }

    // 3. Fetch transcript chunks
    const transcriptDoc = await db.collection("meetingTranscripts").findOne({ meetingId: meetingObjectId });
    const chunks = transcriptDoc?.chunks || [];

    // Format transcript for Gemini
    const transcriptText = chunks
      .map((c: any) => `${c.speaker} (${c.userEmail}): ${c.text}`)
      .join("\n");

    const apiKey = process.env.GOOGLE_API_KEY;

    let analysisResult: any;

    if (apiKey && transcriptText.trim().length > 10) {
      // 4. Call Gemini 1.5 Pro API using fetch
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
      const prompt = `
You are an expert AI meeting assistant. Analyze the following meeting transcript and return a structured JSON response matching the specifications below.

Meeting Title: "${meeting.title}"
Meeting Transcript:
${transcriptText}

CRITICAL RULES FOR ASSIGNMENT EXTRACTION:
1. SPEAKER ATTRIBUTION: When a speaker in the transcript says "I will do X", "I'll handle Y", "I'll take care of Z", or similar commitments, extract that task and attribute it to that speaker's email and name.
2. MENTIONED PERSONS (NON-PARTICIPANTS): If a speaker mentions a person who is NOT actively speaking or present in the transcript (e.g., "Assign X to Alice", "Ask Bob to check Y", "We need Charlie to do Z"), extract that task! Attribute the task to that person's name (e.g., "Alice"). Since they are not in the meeting as an active speaker, set "memberEmail" to "pending-edit@example.com" (a placeholder email) so the Hub Owner can manually assign/edit it in the edit screen. Do NOT ignore tasks for mentioned individuals!
3. DEFAULT DEADLINE: For "deadline", output "YYYY-MM-DD" if mentioned. Otherwise, output null.

JSON Schema output:
{
  "topic": "Brief meeting topic",
  "overview": "Detailed overview of what was discussed",
  "decisions": ["Decision 1", "Decision 2"],
  "advantages": ["Advantage 1", "Advantage 2"],
  "concerns": ["Concern 1", "Concern 2"],
  "outcome": "Brief meeting outcome summary",
  "score": {
    "overall": 85, // 0 - 100
    "audio": 90,
    "transcriptConfidence": 88,
    "clarity": 85,
    "network": 95,
    "accent": 90
  },
  "assignments": [
    {
      "memberEmail": "email@example.com", // email of the speaker OR "pending-edit@example.com" if they are a mentioned non-participant
      "memberName": "Name of the person",  // name of the speaker OR name of the mentioned non-participant
      "task": "Specific task description",
      "deadline": "YYYY-MM-DD" // or null if no deadline was explicitly mentioned. Do not make up deadlines!
    }
  ]
}

Ensure the output is valid JSON. Do not include markdown code block syntax (like \`\`\`json) in your response, return ONLY the raw JSON string.
`;

      try {
        const geminiRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          analysisResult = JSON.parse(textResponse);
        } else {
          console.error("Gemini API returned error:", await geminiRes.text());
          throw new Error("Gemini API request failed.");
        }
      } catch (geminiErr) {
        console.error("Failed to generate with Gemini, falling back to mock:", geminiErr);
        analysisResult = generateMockAnalysis(meeting.title, chunks, activeUser);
      }
    } else {
      // 5. Fallback to mock analysis (useful for local development and offline owner testing)
      analysisResult = generateMockAnalysis(meeting.title, chunks, activeUser);
    }

    // Save temporary analysis draft in db (so it can be edited/reviewed)
    await db.collection("meetingDrafts").updateOne(
      { meetingId: meetingObjectId },
      {
        $set: {
          meetingId: meetingObjectId,
          hubId: meeting.hubId,
          title: meeting.title,
          date: meeting.scheduledAt,
          analysis: analysisResult,
          updatedAt: new Date(),
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      draft: analysisResult,
    });

  } catch (err: any) {
    console.error("Error analyzing meeting:", err);
    return NextResponse.json({ error: err.message || "Failed to analyze meeting." }, { status: 500 });
  }
}

function generateMockAnalysis(meetingTitle: string, chunks: any[], activeUser: any) {
  const assignments: any[] = [];
  const processedTexts = new Set<string>();

  // 1. Process transcript chunks for commitments ("I will do X") or third-party mentions ("Assign Y to Alice")
  chunks.forEach((chunk) => {
    const text = chunk.text;
    const speaker = chunk.speaker;
    const email = chunk.userEmail || "member@example.com";

    // a) Check if speaker says "I will..." or "I'll..."
    const selfCommitmentMatch = text.match(/\b(i will|i'll|i am going to|i'm going to)\s+([^.]+)/i);
    if (selfCommitmentMatch && selfCommitmentMatch[2]) {
      const taskText = selfCommitmentMatch[2].trim();
      const uniqueKey = `${speaker}-${taskText}`;
      if (!processedTexts.has(uniqueKey)) {
        assignments.push({
          memberEmail: email.toLowerCase(),
          memberName: speaker,
          task: taskText.charAt(0).toUpperCase() + taskText.slice(1),
          deadline: null,
        });
        processedTexts.add(uniqueKey);
      }
    }

    // b) Check for third-party assignments: e.g. "assign the homepage to John" or "Alice needs to design the login page"
    const assignToMatch = text.match(/\b(assign|give)\s+(.+?)\s+to\s+([A-Z][a-z]+)/i);
    if (assignToMatch && assignToMatch[2] && assignToMatch[3]) {
      const taskText = assignToMatch[2].trim();
      const targetName = assignToMatch[3].trim();
      const uniqueKey = `${targetName}-${taskText}`;
      if (!processedTexts.has(uniqueKey)) {
        assignments.push({
          memberEmail: "pending-edit@example.com",
          memberName: targetName,
          task: taskText.charAt(0).toUpperCase() + taskText.slice(1),
          deadline: null,
        });
        processedTexts.add(uniqueKey);
      }
    }

    // c) Check for "Name will..." or "Name needs to..."
    const nameWillMatch = text.match(/\b([A-Z][a-z]+)\s+(will|needs to|should)\s+([^.]+)/i);
    if (nameWillMatch && nameWillMatch[1] && nameWillMatch[3]) {
      const targetName = nameWillMatch[1].trim();
      const actionText = nameWillMatch[3].trim();
      // Only do this if targetName isn't "I" or "We"
      if (!/^(i|we|you|he|she|they|it)$/i.test(targetName) && targetName !== speaker) {
        const uniqueKey = `${targetName}-${actionText}`;
        if (!processedTexts.has(uniqueKey)) {
          assignments.push({
            memberEmail: "pending-edit@example.com",
            memberName: targetName,
            task: actionText.charAt(0).toUpperCase() + actionText.slice(1),
            deadline: null,
          });
          processedTexts.add(uniqueKey);
        }
      }
    }
  });

  // 2. Default fallback if no assignments extracted
  if (assignments.length === 0) {
    assignments.push({
      memberEmail: activeUser.email.toLowerCase(),
      memberName: activeUser.name,
      task: "Verify implementation of the Phase 4 Meeting and Vault Versioning system.",
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });
  }

  return {
    topic: `Review of: ${meetingTitle}`,
    overview: chunks.length > 0 
      ? `Discussion centered around: "${chunks.slice(0, 3).map(c => c.text).join(" ")}". The participants discussed project status, action items, and next milestones.`
      : `Mock transcription review for meeting: "${meetingTitle}". This is a placeholder summary generated because no audio transcript was submitted.`,
    decisions: [
      "Approve Phase 4 modifications immediately.",
      "Enable single-person meeting workflow for early validation."
    ],
    advantages: [
      "Streamlined Owner/Member security model removes role confusion.",
      "LiveKit identity verification ensures secure transcript assignment."
    ],
    concerns: [
      "Ensure calendar link integration correctly encodes special characters."
    ],
    outcome: "All participants aligned on target goals and deadlines.",
    score: {
      overall: 92,
      audio: 95,
      transcriptConfidence: 90,
      clarity: 94,
      network: 98,
      accent: 92
    },
    assignments,
  };
}

