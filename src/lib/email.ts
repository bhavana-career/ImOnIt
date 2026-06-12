import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

const BRAND_COLOR = "#dc2626"; // Crimson Red

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function isValidAbsoluteUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Reusable email container matching application branding
function renderBrandedEmail(title: string, bodyHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #ffffff;
            margin: 0;
            padding: 20px;
            -webkit-font-smoothing: antialiased;
          }
        </style>
      </head>
      <body>
        <div style="font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02); background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; vertical-align: middle; width: 32px; height: 32px; border-radius: 8px; background-color: #fef2f2; border: 1px solid #fee2e2; padding: 4px; box-sizing: border-box; text-align: center;">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="rgba(220, 38, 38, 0.1)" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
            </div>
            <span style="font-size: 24px; font-weight: 800; color: #111827; vertical-align: middle; margin-left: 8px; tracking-tight">I'm On It Bruh</span>
          </div>
          <h2 style="font-size: 20px; font-weight: 800; color: #111827; margin-bottom: 16px; text-align: center; font-family: 'Outfit', sans-serif;">${title}</h2>
          <div style="font-size: 15px; color: #374151; line-height: 1.6; margin-bottom: 24px; font-family: 'Outfit', sans-serif;">
            ${bodyHtml}
          </div>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 11px; color: #9ca3af; text-align: center; line-height: 1.4; margin: 0; font-family: 'Outfit', sans-serif;">
            This is an automated notification from <strong>I'm On It Bruh</strong>.
          </p>
        </div>
      </body>
    </html>
  `;
}

export async function sendInvitationEmail({
  to,
  ownerName,
  ownerImage,
  hubName,
  hubDescription,
  hubImage,
  inviteLink,
  customMessage,
}: {
  to: string;
  ownerName: string;
  ownerImage: string | null;
  hubName: string;
  hubDescription?: string;
  hubImage?: string | null;
  inviteLink: string;
  customMessage?: string;
}) {
  const ownerAvatarHtml = isValidAbsoluteUrl(ownerImage)
    ? `<img src="${ownerImage}" alt="${ownerName}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; display: inline-block; vertical-align: middle; border: 1px solid #e5e7eb;" />`
    : `<div style="width: 48px; height: 48px; border-radius: 50%; background-color: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; display: inline-block; text-align: center; line-height: 48px; font-weight: 800; font-size: 16px; font-family: 'Outfit', sans-serif; vertical-align: middle;">${getInitials(ownerName)}</div>`;

  const hubAvatarHtml = isValidAbsoluteUrl(hubImage)
    ? `<img src="${hubImage}" alt="${hubName}" style="width: 56px; height: 56px; border-radius: 12px; object-fit: cover; display: inline-block; border: 1px solid #e5e7eb; vertical-align: middle;" />`
    : `<div style="width: 56px; height: 56px; border-radius: 12px; background-color: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; display: inline-block; text-align: center; line-height: 56px; font-weight: 800; font-size: 18px; font-family: 'Outfit', sans-serif; vertical-align: middle;">${getInitials(hubName)}</div>`;

  const hubDescriptionHtml = hubDescription && hubDescription.trim()
    ? `<p style="font-size: 13px; color: #4b5563; margin: 8px 0 0 0; line-height: 1.5; font-family: 'Outfit', sans-serif;">${hubDescription.trim()}</p>`
    : "";

  const customMessageHtml = `
    <p style="margin-bottom: 24px; font-style: italic; color: #4b5563; text-align: center; background-color: #f9fafb; padding: 12px; border-radius: 8px; border-left: 4px solid #dc2626; font-family: 'Outfit', sans-serif;">
      "${customMessage && customMessage.trim() ? customMessage.trim() : `Please join our secure workspace to collaborate on commitments and action items.`}"
    </p>
  `;

  const bodyHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="margin-bottom: 8px;">
        ${ownerAvatarHtml}
      </div>
      <p style="margin: 0; font-size: 16px; font-weight: 700; color: #111827; font-family: 'Outfit', sans-serif;">${ownerName}</p>
      <p style="margin: 2px 0 16px 0; font-size: 13px; color: #6b7280; font-family: 'Outfit', sans-serif;">invited you to join:</p>
    </div>
    
    <div style="background-color: #f9fafb; padding: 20px; border-radius: 16px; border: 1px solid #f3f4f6; text-align: center; margin-bottom: 24px;">
      <div style="margin-bottom: 4px;">
        ${hubAvatarHtml}
      </div>
      <h3 style="margin: 8px 0 0 0; font-size: 18px; font-weight: 800; color: #dc2626; font-family: 'Outfit', sans-serif;">${hubName}</h3>
      ${hubDescriptionHtml}
    </div>
    
    ${customMessageHtml}
    
    <div style="text-align: center; margin: 28px 0;">
      <a href="${inviteLink}" style="background-color: #dc2626; color: #ffffff; padding: 12px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 50px; display: inline-block; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.15); font-family: 'Outfit', sans-serif;">
        Join Hub
      </a>
    </div>
  `;

  const msg = {
    to,
    from: process.env.EMAIL_FROM || "imonit.notifications@gmail.com",
    subject: `${ownerName} invited you to join the Hub: ${hubName}`,
    html: renderBrandedEmail("Workspace Invitation", bodyHtml),
  };

  await sgMail.send(msg);
}

export async function sendApprovalEmail({
  to,
  userName,
  hubName,
  hubLink,
}: {
  to: string;
  userName: string;
  hubName: string;
  hubLink: string;
}) {
  const bodyHtml = `
    <p>Hello <strong>${userName}</strong>,</p>
    <p>We have great news! The Hub Owner has <strong>approved</strong> your request to join the Hub:</p>
    <div style="font-size: 18px; font-weight: 800; text-align: center; margin: 20px 0; color: ${BRAND_COLOR};">
      ${hubName}
    </div>
    <p>You now have full member access to enter the workspace, view details, and manage task assignments.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${hubLink}" style="background-color: ${BRAND_COLOR}; color: #ffffff; padding: 12px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 50px; display: inline-block; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.15);">
        Open Hub Workspace
      </a>
    </div>
  `;

  const msg = {
    to,
    from: process.env.EMAIL_FROM || "imonit.notifications@gmail.com",
    subject: `Access Request Approved: ${hubName}`,
    html: renderBrandedEmail("Access Request Approved", bodyHtml),
  };

  await sgMail.send(msg);
}

export async function sendRejectionEmail({
  to,
  userName,
  hubName,
}: {
  to: string;
  userName: string;
  hubName: string;
}) {
  const bodyHtml = `
    <p>Hello <strong>${userName}</strong>,</p>
    <p>Your access request to join the Hub <strong>${hubName}</strong> was reviewed by the Hub Owner and has been <strong>rejected</strong> at this time.</p>
    <p>If you believe this was an error, please reach out to the Hub Owner directly to request a new invitation.</p>
  `;

  const msg = {
    to,
    from: process.env.EMAIL_FROM || "imonit.notifications@gmail.com",
    subject: `Access Request Rejected: ${hubName}`,
    html: renderBrandedEmail("Access Request Status", bodyHtml),
  };

  await sgMail.send(msg);
}

export async function sendHubDeleteOtpEmail({
  to,
  ownerName,
  hubName,
  otp,
}: {
  to: string;
  ownerName: string;
  hubName: string;
  otp: string;
}) {
  const bodyHtml = `
    <p>Hello <strong>${ownerName}</strong>,</p>
    <p>We received a request to **delete** the Hub: <strong style="color: ${BRAND_COLOR};">${hubName}</strong>.</p>
    <p>Deleting a hub is a high-privilege, destructive action that will permanently erase all associated vaults, memberships, and records. To confirm this action, please enter the following 6-digit verification code:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: ${BRAND_COLOR}; background-color: #fef2f2; padding: 12px 28px; border-radius: 8px; border: 1px solid #fee2e2; display: inline-block; font-family: monospace;">
        ${otp}
      </span>
    </div>
    
    <p style="font-size: 13px; color: #ef4444; font-weight: 700; text-align: center;">
      This verification code is valid for 10 minutes.
    </p>
    <p>If you did not request this deletion, please secure your account credentials immediately.</p>
  `;

  const msg = {
    to,
    from: process.env.EMAIL_FROM || "imonit.notifications@gmail.com",
    subject: `Verification Code: Delete Hub ${hubName}`,
    html: renderBrandedEmail("Delete Hub Authorization", bodyHtml),
  };

  await sgMail.send(msg);
}

export async function sendJoinRequestEmail({
  to,
  ownerName,
  userName,
  userEmail,
  hubName,
  dashboardLink,
}: {
  to: string;
  ownerName: string;
  userName: string;
  userEmail: string;
  hubName: string;
  dashboardLink: string;
}) {
  const bodyHtml = `
    <p>Hello <strong>${ownerName}</strong>,</p>
    <p>A user has accepted your invitation and is waiting for approval to join your Hub: <strong style="color: ${BRAND_COLOR};">${hubName}</strong>.</p>
    
    <div style="background-color: #f9fafb; padding: 16px; border-radius: 12px; border: 1px solid #f3f4f6; margin: 20px 0; text-align: left;">
      <p style="margin: 0; font-size: 14px; font-weight: bold; color: #111827; font-family: 'Outfit', sans-serif;">Request Details:</p>
      <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; color: #4b5563; font-family: 'Outfit', sans-serif;">
        <li><strong>Name:</strong> ${userName}</li>
        <li><strong>Email:</strong> ${userEmail}</li>
      </ul>
    </div>
    
    <p>Please review and approve or reject this request from your Hub Workspace Members panel.</p>
    
    <div style="text-align: center; margin: 28px 0;">
      <a href="${dashboardLink}" style="background-color: ${BRAND_COLOR}; color: #ffffff; padding: 12px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 50px; display: inline-block; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.15); font-family: 'Outfit', sans-serif;">
        Go to Members Dashboard
      </a>
    </div>
  `;

  const msg = {
    to,
    from: process.env.EMAIL_FROM || "imonit.notifications@gmail.com",
    subject: `New Join Request: ${hubName}`,
    html: renderBrandedEmail("New Join Request", bodyHtml),
  };

  await sgMail.send(msg);
}

export async function sendMeetingScheduledEmail({
  to,
  ownerName,
  hubName,
  meetingTitle,
  meetingDescription,
  scheduledTime,
  meetingLink,
}: {
  to: string;
  ownerName: string;
  hubName: string;
  meetingTitle: string;
  meetingDescription?: string;
  scheduledTime: string;
  meetingLink: string;
}) {
  const bodyHtml = `
    <p>Hello,</p>
    <p><strong>${ownerName}</strong> has scheduled a new meeting in the Hub: <strong style="color: ${BRAND_COLOR};">${hubName}</strong>.</p>
    
    <div style="background-color: #f9fafb; padding: 20px; border-radius: 16px; border: 1px solid #f3f4f6; margin: 20px 0; text-align: left; font-family: 'Outfit', sans-serif;">
      <h3 style="margin: 0 0 10px 0; color: #111827; font-size: 16px; font-weight: bold;">${meetingTitle}</h3>
      ${meetingDescription ? `<p style="margin: 0 0 12px 0; color: #4b5563; font-size: 13px; line-height: 1.5;">${meetingDescription}</p>` : ""}
      <p style="margin: 0; color: #dc2626; font-size: 13px; font-weight: bold;">
        Scheduled For: ${scheduledTime}
      </p>
    </div>
    
    <p>You can join the meeting directly from the dashboard when it starts.</p>
    
    <div style="text-align: center; margin: 28px 0;">
      <a href="${meetingLink}" style="background-color: ${BRAND_COLOR}; color: #ffffff; padding: 12px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 50px; display: inline-block; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.15); font-family: 'Outfit', sans-serif;">
        Open Hub Workspace
      </a>
    </div>
  `;

  const msg = {
    to,
    from: process.env.EMAIL_FROM || "imonit.notifications@gmail.com",
    subject: `New Meeting Scheduled: ${meetingTitle}`,
    html: renderBrandedEmail("New Meeting Scheduled", bodyHtml),
  };

  await sgMail.send(msg);
}

export async function sendAssignmentNotificationEmail({
  to,
  memberName,
  hubName,
  meetingTitle,
  task,
  deadline,
  oldDeadline,
  dashboardLink,
  isUpdate = false,
  overview,
  duration,
  date,
  outcome,
}: {
  to: string;
  memberName: string;
  hubName: string;
  meetingTitle: string;
  task: string;
  deadline: string | null;
  oldDeadline?: string | null;
  dashboardLink: string;
  isUpdate?: boolean;
  overview?: string;
  duration?: number;
  date?: string | Date;
  outcome?: string;
}) {
  const deadlineText = deadline ? deadline : "No deadline set";
  const oldDeadlineText = oldDeadline ? oldDeadline : "No deadline set";

  let deadlineHtml = `<p style="margin: 0; color: #dc2626; font-size: 13px; font-weight: bold; font-family: 'Outfit', sans-serif;">Deadline: ${deadlineText}</p>`;
  if (isUpdate && oldDeadline !== undefined && oldDeadline !== deadline) {
    deadlineHtml = `
      <p style="margin: 0; color: #6b7280; font-size: 12px; text-decoration: line-through; font-family: 'Outfit', sans-serif;">Old Deadline: ${oldDeadlineText}</p>
      <p style="margin: 4px 0 0 0; color: #dc2626; font-size: 13px; font-weight: bold; font-family: 'Outfit', sans-serif;">New Deadline: ${deadlineText}</p>
    `;
  }

  // Generate Google Calendar Link if there is a deadline
  let calendarLinkHtml = "";
  if (deadline) {
    const calendarUrl = getGoogleCalendarUrl(task, deadline, hubName, meetingTitle);
    calendarLinkHtml = `
      <div style="margin-top: 14px;">
        <a href="${calendarUrl}" style="display: inline-flex; align-items: center; background-color: #ffffff; color: #dc2626; border: 1.5px solid #dc2626; padding: 6px 16px; font-size: 12px; font-weight: 700; text-decoration: none; border-radius: 50px; font-family: 'Outfit', sans-serif;">
          📅 Add Deadline to Google Calendar
        </a>
      </div>
    `;
  }

  // Format date and duration
  const formattedDate = date ? new Date(date).toLocaleDateString() : "";
  const formattedDuration = duration !== undefined ? formatDurationHelper(duration) : "";

  let meetingDetailsHtml = "";
  if (overview || outcome || formattedDate || formattedDuration) {
    meetingDetailsHtml = `
      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 12px; border: 1px solid #e5e7eb; margin: 15px 0; text-align: left; font-family: 'Outfit', sans-serif;">
        <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #111827;">Meeting Insights Summary:</p>
        <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #4b5563; line-height: 1.6;">
          ${formattedDate ? `<li><strong>Date:</strong> ${formattedDate}</li>` : ""}
          ${formattedDuration ? `<li><strong>Duration:</strong> ${formattedDuration}</li>` : ""}
          ${overview ? `<li><strong>Summary:</strong> ${overview}</li>` : ""}
          ${outcome ? `<li><strong>Outcome:</strong> ${outcome}</li>` : ""}
        </ul>
      </div>
    `;
  }

  const bodyHtml = `
    <p>Hello <strong>${memberName}</strong>,</p>
    <p>${isUpdate ? "An update has been made to your meeting assignment" : "You have been assigned a task"} in the Hub: <strong style="color: ${BRAND_COLOR};">${hubName}</strong>.</p>
    
    <div style="background-color: #f9fafb; padding: 20px; border-radius: 16px; border: 1px solid #f3f4f6; margin: 20px 0; text-align: left; font-family: 'Outfit', sans-serif;">
      <span style="display: block; font-size: 10px; font-weight: bold; color: #9ca3af; uppercase; tracking-wider; margin-bottom: 6px;">Meeting: ${meetingTitle}</span>
      <p style="margin: 0 0 12px 0; color: #111827; font-size: 14px; font-weight: bold; line-height: 1.5;">${task}</p>
      ${deadlineHtml}
      ${calendarLinkHtml}
    </div>

    ${meetingDetailsHtml}
    
    <p>Please log in to your dashboard to review this assignment.</p>
    
    <div style="text-align: center; margin: 28px 0;">
      <a href="${dashboardLink}" style="background-color: ${BRAND_COLOR}; color: #ffffff; padding: 12px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 50px; display: inline-block; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.15); font-family: 'Outfit', sans-serif;">
        View My Assignments
      </a>
    </div>
  `;

  const msg = {
    to,
    from: process.env.EMAIL_FROM || "imonit.notifications@gmail.com",
    subject: isUpdate ? `Updated Assignment: ${meetingTitle}` : `New Assignment: ${meetingTitle}`,
    html: renderBrandedEmail(isUpdate ? "Assignment Updated" : "New Assignment", bodyHtml),
  };

  await sgMail.send(msg);
}

function getGoogleCalendarUrl(task: string, deadline: string, hubName: string, meetingTitle: string): string {
  const dateStr = deadline.replace(/-/g, ""); // e.g. 2026-06-15 -> 20260615
  const dateObj = new Date(deadline);
  dateObj.setDate(dateObj.getDate() + 1);
  const nextDateStr = dateObj.toISOString().split("T")[0].replace(/-/g, "");
  
  const dates = `${dateStr}/${nextDateStr}`;
  const title = `Task: ${task} [${hubName}]`;
  const details = `Meeting: ${meetingTitle}\nHub: ${hubName}\nAssigned Task: ${task}\nDeadline: ${deadline}`;
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dates}&details=${encodeURIComponent(details)}`;
}

function formatDurationHelper(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export async function sendSubmissionAlertEmail({
  to,
  ownerName,
  memberName,
  hubName,
  meetingTitle,
  task,
  attemptNumber,
}: {
  to: string;
  ownerName: string;
  memberName: string;
  hubName: string;
  meetingTitle: string;
  task: string;
  attemptNumber: number;
}) {
  const bodyHtml = `
    <p>Hello <strong>${ownerName}</strong>,</p>
    <p><strong>${memberName}</strong> has submitted proof of work for their assigned task in the Hub: <strong style="color: ${BRAND_COLOR};">${hubName}</strong>.</p>
    
    <div style="background-color: #f9fafb; padding: 20px; border-radius: 16px; border: 1px solid #f3f4f6; margin: 20px 0; text-align: left; font-family: 'Outfit', sans-serif;">
      <span style="display: block; font-size: 10px; font-weight: bold; color: #9ca3af; uppercase; tracking-wider; margin-bottom: 6px;">Meeting: ${meetingTitle} (Submission Attempt #${attemptNumber})</span>
      <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #111827;">Assigned Task:</p>
      <p style="margin: 0; color: #4b5563; font-size: 13px; line-height: 1.5;">${task}</p>
    </div>
    
    <p>Please log in to your dashboard to review this submission.</p>
    
    <div style="text-align: center; margin: 28px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard" style="background-color: ${BRAND_COLOR}; color: #ffffff; padding: 12px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 50px; display: inline-block; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.15); font-family: 'Outfit', sans-serif;">
        Review Submission
      </a>
    </div>
  `;

  const msg = {
    to,
    from: process.env.EMAIL_FROM || "imonit.notifications@gmail.com",
    subject: `New Work Submission: ${hubName}`,
    html: renderBrandedEmail("Submission Received", bodyHtml),
  };

  await sgMail.send(msg);
}

export async function sendSubmissionApprovedEmail({
  to,
  memberName,
  hubName,
  meetingTitle,
  task,
  dashboardLink,
}: {
  to: string;
  memberName: string;
  hubName: string;
  meetingTitle: string;
  task: string;
  dashboardLink: string;
}) {
  const bodyHtml = `
    <p>Hello <strong>${memberName}</strong>,</p>
    <p>Great news! Your proof of work submission has been **approved** and marked as **completed** in the Hub: <strong style="color: ${BRAND_COLOR};">${hubName}</strong>.</p>
    
    <div style="background-color: #f9fafb; padding: 20px; border-radius: 16px; border: 1px solid #f3f4f6; margin: 20px 0; text-align: left; font-family: 'Outfit', sans-serif;">
      <span style="display: block; font-size: 10px; font-weight: bold; color: #9ca3af; uppercase; tracking-wider; margin-bottom: 6px;">Meeting: ${meetingTitle}</span>
      <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #111827;">Completed Task:</p>
      <p style="margin: 0; color: #10b981; font-size: 13px; font-weight: bold; line-height: 1.5;">✓ ${task}</p>
    </div>
    
    <p>Future deadline reminder notifications for this task have been deactivated.</p>
    
    <div style="text-align: center; margin: 28px 0;">
      <a href="${dashboardLink}" style="background-color: ${BRAND_COLOR}; color: #ffffff; padding: 12px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 50px; display: inline-block; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.15); font-family: 'Outfit', sans-serif;">
        Go to Dashboard
      </a>
    </div>
  `;

  const msg = {
    to,
    from: process.env.EMAIL_FROM || "imonit.notifications@gmail.com",
    subject: `Submission Approved: ${meetingTitle}`,
    html: renderBrandedEmail("Submission Approved", bodyHtml),
  };

  await sgMail.send(msg);
}

export async function sendSubmissionRejectedEmail({
  to,
  memberName,
  hubName,
  meetingTitle,
  task,
  feedback,
  dashboardLink,
}: {
  to: string;
  memberName: string;
  hubName: string;
  meetingTitle: string;
  task: string;
  feedback: string;
  dashboardLink: string;
}) {
  const bodyHtml = `
    <p>Hello <strong>${memberName}</strong>,</p>
    <p>Your submission for task: "${task.slice(0, 30)}..." in the Hub: <strong>${hubName}</strong> requires **correction/revision**.</p>
    
    <div style="background-color: #f9fafb; padding: 20px; border-radius: 16px; border: 1px solid #f3f4f6; margin: 20px 0; text-align: left; font-family: 'Outfit', sans-serif;">
      <span style="display: block; font-size: 10px; font-weight: bold; color: #9ca3af; uppercase; tracking-wider; margin-bottom: 6px;">Meeting: ${meetingTitle}</span>
      <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #111827;">Task Description:</p>
      <p style="margin: 0 0 12px 0; color: #4b5563; font-size: 13px;">${task}</p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 12px 0;" />
      <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #dc2626;">Feedback & Required Actions:</p>
      <p style="margin: 0; color: #dc2626; font-size: 13px; font-weight: bold; font-style: italic;">"${feedback}"</p>
    </div>
    
    <p>Please perform the requested corrections and resubmit your proof of work through the dashboard.</p>
    
    <div style="text-align: center; margin: 28px 0;">
      <a href="${dashboardLink}" style="background-color: ${BRAND_COLOR}; color: #ffffff; padding: 12px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 50px; display: inline-block; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.15); font-family: 'Outfit', sans-serif;">
        Review & Resubmit
      </a>
    </div>
  `;

  const msg = {
    to,
    from: process.env.EMAIL_FROM || "imonit.notifications@gmail.com",
    subject: `Correction Required: ${meetingTitle}`,
    html: renderBrandedEmail("Submission Rejected", bodyHtml),
  };

  await sgMail.send(msg);
}

export async function sendAssignmentOverdueEmail({
  to,
  memberName,
  hubName,
  meetingTitle,
  task,
  deadline,
  dashboardLink,
}: {
  to: string;
  memberName: string;
  hubName: string;
  meetingTitle: string;
  task: string;
  deadline: string;
  dashboardLink: string;
}) {
  const bodyHtml = `
    <p>Hello <strong>${memberName}</strong>,</p>
    <p style="color: #dc2626; font-weight: bold;">⚠️ Your assignment deadline has passed and the task is now OVERDUE!</p>
    
    <div style="background-color: #f9fafb; padding: 20px; border-radius: 16px; border: 1px solid #f3f4f6; margin: 20px 0; text-align: left; font-family: 'Outfit', sans-serif;">
      <span style="display: block; font-size: 10px; font-weight: bold; color: #9ca3af; uppercase; tracking-wider; margin-bottom: 6px;">Meeting: ${meetingTitle}</span>
      <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #111827;">Overdue Task:</p>
      <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 13px;">${task}</p>
      <p style="margin: 0; color: #dc2626; font-size: 13px; font-weight: bold;">Deadline Was: ${deadline}</p>
    </div>
    
    <p>Please submit your proof of work immediately to update the status.</p>
    
    <div style="text-align: center; margin: 28px 0;">
      <a href="${dashboardLink}" style="background-color: ${BRAND_COLOR}; color: #ffffff; padding: 12px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 50px; display: inline-block; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.15); font-family: 'Outfit', sans-serif;">
        Submit Work
      </a>
    </div>
  `;

  const msg = {
    to,
    from: process.env.EMAIL_FROM || "imonit.notifications@gmail.com",
    subject: `URGENT Overdue Task: ${meetingTitle}`,
    html: renderBrandedEmail("Assignment Overdue", bodyHtml),
  };

  await sgMail.send(msg);
}


