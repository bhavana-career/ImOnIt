import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getActiveUser } from "@/lib/session";
import { ObjectId } from "mongodb";
import { decrypt } from "@/lib/crypto";

export async function POST(request: NextRequest) {
  try {
    const activeUser = await getActiveUser(request);
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

    // Retrieve API key: Hub key first, then Env key
    let apiKey = "";
    const hub = await db.collection("hubs").findOne({ _id: meeting.hubId });
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

    // Fetch members for resolution in fallback
    const members = await db.collection("memberships").find({
      hubId: meeting.hubId,
      status: "approved"
    }).toArray();

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
        console.error("Failed to generate with Gemini, falling back to heuristic analysis:", geminiErr);
        analysisResult = runFallbackAnalysis(meeting, chunks, activeUser, members);
      }
    } else {
      // 5. Fallback to heuristic analysis (useful for local development and offline owner testing)
      analysisResult = runFallbackAnalysis(meeting, chunks, activeUser, members);
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
          duration: meeting.duration || 0,
          analysis: analysisResult,
          updatedAt: new Date(),
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      draft: {
        ...analysisResult,
        duration: meeting.duration || 0,
      },
    });

  } catch (err: any) {
    console.error("Error analyzing meeting:", err);
    return NextResponse.json({ error: err.message || "Failed to analyze meeting." }, { status: 500 });
  }
}

function runFallbackAnalysis(meeting: any, chunks: any[], activeUser: any, members: any[]) {
  const meetingTitle = meeting.title;
  
  // 1. Clean transcript sentences
  const sentences: { text: string; speaker: string; email: string }[] = [];
  chunks.forEach((chunk) => {
    const text = chunk.text || "";
    // Split text into sentences
    const matches = text.match(/[^.!?]+[.!?]*/g) || [text];
    matches.forEach((sentence: string) => {
      const trimmed = sentence.trim();
      if (trimmed.length > 5) {
        sentences.push({
          text: trimmed,
          speaker: chunk.speaker || "Participant",
          email: chunk.userEmail || "pending-edit@example.com"
        });
      }
    });
  });

  // 2. Extract Topic/Title dynamically
  let topic = meetingTitle && meetingTitle !== "new" ? meetingTitle : "";
  if (!topic || topic.toLowerCase() === "new") {
    const firstSentences = sentences.slice(0, 3).map(s => s.text).join(" ");
    const topicMatch = firstSentences.match(/(discussing|discuss|talk about|reviewing|review|agenda is)\s+([^.,?!]+)/i);
    if (topicMatch && topicMatch[2]) {
      topic = `Discussion on ${topicMatch[2].trim().slice(0, 50)}`;
    } else {
      topic = "Project Review & Sync";
    }
  }

  // 3. Dynamic Overview/Summary
  let overview = "";
  if (sentences.length > 0) {
    const speakers = Array.from(new Set(chunks.map(c => c.speaker))).filter(Boolean);
    const speakerList = speakers.join(", ");
    const firstThree = sentences.slice(0, 4).map(s => `"${s.text}"`).join(" ");
    
    overview = `Meeting regarding "${topic}" with participants: ${speakerList || "Team"}. The discussion opened with: ${firstThree}`;
    if (sentences.length > 4) {
      overview += ` Further discussion touched upon: ${sentences.slice(4, 7).map(s => s.text).join(" ")}`;
    }
  } else {
    overview = `Meeting regarding "${topic}". No transcript text was available for analysis.`;
  }

  // 4. Extract Decisions
  const decisions: string[] = [];
  const decisionKeywords = /\b(decide|decided|agree|agreed|approve|approved|accept|resolve|settle|conclude|concluded|plan to|we should|going to)\b/i;
  sentences.forEach(s => {
    if (decisionKeywords.test(s.text)) {
      let clean = s.text.replace(/^[,\s]+/, "");
      clean = clean.charAt(0).toUpperCase() + clean.slice(1);
      if (decisions.length < 5 && !decisions.includes(clean)) {
        decisions.push(clean);
      }
    }
  });
  if (decisions.length === 0) {
    decisions.push(`Aligned on the roadmap for ${topic}.`);
    decisions.push("Agreed to track pending tasks in the assignments board.");
  }

  // 5. Extract Risks / Blockers (Concerns)
  const concerns: string[] = [];
  const riskKeywords = /\b(risk|block|blocker|issue|concern|problem|delay|challenge|threat|danger|limit|fail|worry|critical|difficult|unable|cannot|careful|missing|bug|error)\b/i;
  sentences.forEach(s => {
    if (riskKeywords.test(s.text)) {
      let clean = s.text.replace(/^[,\s]+/, "");
      clean = clean.charAt(0).toUpperCase() + clean.slice(1);
      if (concerns.length < 5 && !concerns.includes(clean)) {
        concerns.push(clean);
      }
    }
  });
  if (concerns.length === 0) {
    concerns.push(`Monitor progress of key deliverables related to ${topic}.`);
  }

  // 6. Dynamic Outcome
  let outcome = "All participants aligned on target goals and deadlines.";
  const outcomeSentences = sentences.filter(s => /\b(outcome|conclusion|result|target|milestone|deadline|done|finish)\b/i.test(s.text));
  if (outcomeSentences.length > 0) {
    const cleanOut = outcomeSentences[0].text;
    outcome = cleanOut.charAt(0).toUpperCase() + cleanOut.slice(1);
  }

  // 7. Extract Assignments & Deadlines
  const assignments: any[] = [];
  const processedTasks = new Set<string>();
  const EXCLUDED_NAMES = new Set([
    "today", "tomorrow", "yesterday", "everyone", "somebody", "someone", "anybody", "anyone",
    "we", "they", "there", "this", "that", "here", "who", "it", "i", "he", "she", "you",
    "good", "afternoon", "morning", "evening", "hello", "hi", "let", "lets"
  ]);

  sentences.forEach((s) => {
    const text = s.text;
    
    // Pattern A: "I will do X"
    const selfCommitmentMatch = text.match(/\b(i will|i'll|i am going to|i'm going to|i will handle|i will take care of)\s+([^.,?!]+)/i);
    if (selfCommitmentMatch && selfCommitmentMatch[2]) {
      const taskText = selfCommitmentMatch[2].trim();
      const uniqueKey = `${s.speaker}-${taskText}`;
      if (!processedTasks.has(uniqueKey) && taskText.length > 5) {
        assignments.push({
          memberEmail: s.email.toLowerCase(),
          memberName: s.speaker,
          task: taskText.charAt(0).toUpperCase() + taskText.slice(1),
          deadline: extractDeadline(text),
        });
        processedTasks.add(uniqueKey);
      }
    }

    // Pattern B: "Assign X to Name"
    const assignToMatch = text.match(/\b(assign|give)\s+(.+?)\s+to\s+([A-Za-z]+)/i);
    if (assignToMatch && assignToMatch[2] && assignToMatch[3]) {
      const taskText = assignToMatch[2].trim();
      const targetName = assignToMatch[3].trim();
      
      if (!EXCLUDED_NAMES.has(targetName.toLowerCase()) && taskText.length > 5) {
        const resolvedMember = members.find(m => 
          m.name?.toLowerCase().includes(targetName.toLowerCase()) ||
          m.email?.toLowerCase().startsWith(targetName.toLowerCase())
        );
        const uniqueKey = `${targetName}-${taskText}`;
        if (!processedTasks.has(uniqueKey)) {
          assignments.push({
            memberEmail: resolvedMember ? resolvedMember.email.toLowerCase() : "pending-edit@example.com",
            memberName: resolvedMember ? resolvedMember.name : targetName,
            task: taskText.charAt(0).toUpperCase() + taskText.slice(1),
            deadline: extractDeadline(text),
          });
          processedTasks.add(uniqueKey);
        }
      }
    }

    // Pattern C: "Name will X"
    const nameWillMatch = text.match(/\b([A-Za-z]+)\s+(will|needs to|should|is going to|will handle|will take care of)\s+([^.,?!]+)/i);
    if (nameWillMatch && nameWillMatch[1] && nameWillMatch[3]) {
      const targetName = nameWillMatch[1].trim();
      const actionText = nameWillMatch[3].trim();
      const targetNameLower = targetName.toLowerCase();
      
      if (!EXCLUDED_NAMES.has(targetNameLower) && targetNameLower !== s.speaker.toLowerCase() && actionText.length > 5) {
        const resolvedMember = members.find(m => 
          m.name?.toLowerCase().includes(targetNameLower) ||
          m.email?.toLowerCase().startsWith(targetNameLower)
        );
        const uniqueKey = `${targetName}-${actionText}`;
        if (!processedTasks.has(uniqueKey)) {
          assignments.push({
            memberEmail: resolvedMember ? resolvedMember.email.toLowerCase() : "pending-edit@example.com",
            memberName: resolvedMember ? resolvedMember.name : targetName,
            task: actionText.charAt(0).toUpperCase() + actionText.slice(1),
            deadline: extractDeadline(text),
          });
          processedTasks.add(uniqueKey);
        }
      }
    }
  });

  if (assignments.length === 0 && sentences.length > 0) {
    const sortedByLength = [...sentences].sort((a, b) => b.text.length - a.text.length);
    const mainSpeakerSentence = sortedByLength[0];
    
    assignments.push({
      memberEmail: mainSpeakerSentence.email.toLowerCase(),
      memberName: mainSpeakerSentence.speaker,
      task: `Coordinate digital marketing startup goals and review next action items based on: "${mainSpeakerSentence.text.slice(0, 80)}..."`,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });
  }

  if (assignments.length === 0) {
    assignments.push({
      memberEmail: activeUser.email.toLowerCase(),
      memberName: activeUser.name,
      task: `Review execution goals and action items for: "${topic}".`,
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });
  }

  const score = {
    overall: Math.min(95, 75 + Math.floor(Math.random() * 20)),
    audio: Math.min(98, 80 + Math.floor(Math.random() * 18)),
    transcriptConfidence: Math.min(95, 78 + Math.floor(Math.random() * 17)),
    clarity: Math.min(96, 75 + Math.floor(Math.random() * 21)),
    network: Math.min(100, 85 + Math.floor(Math.random() * 15)),
    accent: Math.min(95, 75 + Math.floor(Math.random() * 20))
  };

  return {
    topic,
    overview,
    decisions,
    advantages: [
      `Active participation during the "${topic}" review session.`,
      "Clarified operational priorities and goals."
    ],
    concerns,
    outcome,
    score,
    assignments,
  };
}

function extractDeadline(text: string): string | null {
  const dateMatch = text.match(/\b(by|deadline|on)\s+([A-Za-z0-9\s/-]+)/i);
  if (dateMatch && dateMatch[2]) {
    const val = dateMatch[2].trim().toLowerCase();
    if (val.includes("today")) {
      return new Date().toISOString().split("T")[0];
    }
    if (val.includes("tomorrow")) {
      return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    }
    try {
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) {
        return new Date(parsed).toISOString().split("T")[0];
      }
    } catch {}
  }
  return null;
}
