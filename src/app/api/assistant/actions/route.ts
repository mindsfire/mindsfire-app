import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from "resend";

// Action payload contracts
interface MessagePayload { subject?: string; body: string }
interface AssignTaskPayload { title: string; description?: string }
interface ChangeAssistantPayload { reason: string; details?: string }
interface EscalatePayload { severity: string; subject: string; details?: string }

type ActionKind = "message" | "assign_task" | "change_assistant" | "escalate";

type RequestBody =
  | { action: "message"; payload: MessagePayload }
  | { action: "assign_task"; payload: AssignTaskPayload }
  | { action: "change_assistant"; payload: ChangeAssistantPayload }
  | { action: "escalate"; payload: EscalatePayload };

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getSupabaseAdmin();
    const body = (await req.json()) as RequestBody;
    const action = body.action as ActionKind;

    // Resolve recipients (customer, assigned VA, CCs)
    type Recipients = { customer_id: string; va_id: string | null; va_email: string | null; team_lead_email: string | null; manager_email: string | null };
    const { data: recipients, error: resolveErr } = await db
      .rpc("resolve_va_recipients", { p_clerk_id: userId })
      .single<Recipients>();

    if (resolveErr || !recipients) {
      return NextResponse.json({ error: "No VA assignment found for user" }, { status: 400 });
    }

    const customer_id: string = recipients.customer_id;
    const va_id: string | null = recipients.va_id;

    if (!va_id) {
      return NextResponse.json({ error: "No assigned VA for user" }, { status: 400 });
    }

    // Execute action
    let entityType = "" as
      | "assistant_message"
      | "task"
      | "assistant_change_request"
      | "assistant_escalation";
    let entityId: string | null = null;

    if (action === "message") {
      const p = body.payload as MessagePayload;
      // Basic server-side validation mirrors DB constraints
      if (!p.body || p.body.trim().length === 0 || p.body.length > 1000) {
        return NextResponse.json({ error: "Message body is required (<= 1000 chars)" }, { status: 400 });
      }
      if (p.subject && p.subject.length > 120) {
        return NextResponse.json({ error: "Subject must be <= 120 chars" }, { status: 400 });
      }

      const { data, error } = await db
        .from("assistant_messages")
        .insert({ customer_id, va_id, subject: p.subject ?? null, body: p.body })
        .select("id")
        .single();
      if (error) throw error;
      entityType = "assistant_message";
      entityId = data.id;

    } else if (action === "assign_task") {
      const p = body.payload as AssignTaskPayload;
      if (!p.title || p.title.trim().length === 0 || p.title.length > 120) {
        return NextResponse.json({ error: "Task title is required (<= 120 chars)" }, { status: 400 });
      }
      if (p.description && p.description.length > 4000) {
        return NextResponse.json({ error: "Task description must be <= 4000 chars" }, { status: 400 });
      }

      const { data, error } = await db
        .from("tasks")
        .insert({ customer_id, assignee_va_id: va_id, title: p.title, description: p.description ?? null })
        .select("id")
        .single();
      if (error) throw error;
      entityType = "task";
      entityId = data.id;

    } else if (action === "change_assistant") {
      const p = body.payload as ChangeAssistantPayload;
      if (!p.reason || p.reason.trim().length === 0 || p.reason.length > 64) {
        return NextResponse.json({ error: "Reason is required (<= 64 chars)" }, { status: 400 });
      }
      if (p.details && p.details.length > 2000) {
        return NextResponse.json({ error: "Details must be <= 2000 chars" }, { status: 400 });
      }

      const { data, error } = await db
        .from("assistant_change_requests")
        .insert({ customer_id, current_va_id: va_id, reason: p.reason, details: p.details ?? null })
        .select("id")
        .single();
      if (error) throw error;
      entityType = "assistant_change_request";
      entityId = data.id;

    } else if (action === "escalate") {
      const p = body.payload as EscalatePayload;
      if (!p.severity || p.severity.length > 16) {
        return NextResponse.json({ error: "Severity is required (<= 16 chars)" }, { status: 400 });
      }
      if (!p.subject || p.subject.trim().length === 0 || p.subject.length > 120) {
        return NextResponse.json({ error: "Subject is required (<= 120 chars)" }, { status: 400 });
      }
      if (p.details && p.details.length > 4000) {
        return NextResponse.json({ error: "Details must be <= 4000 chars" }, { status: 400 });
      }

      const { data, error } = await db
        .from("assistant_escalations")
        .insert({ customer_id, va_id, severity: p.severity, subject: p.subject, details: p.details ?? null })
        .select("id")
        .single();
      if (error) throw error;
      entityType = "assistant_escalation";
      entityId = data.id;

    } else {
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }

    // Audit log (actor_id is customer)
    if (entityId) {
      await db.from("audit_logs").insert({
        actor_id: customer_id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        meta: {}
      });
    }

    // Send email notification via Resend (non-blocking of success)
    try {
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.RESEND_FROM || "no-reply@mindsfire.app";
      if (apiKey && recipients.va_email) {
        const resend = new Resend(apiKey);
        const to = [recipients.va_email].filter(Boolean) as string[];
        const cc = [recipients.team_lead_email, recipients.manager_email].filter(Boolean) as string[];

        let subject = "";
        let text = "";
        if (action === "message") {
          const p = body.payload as MessagePayload;
          subject = p.subject?.trim() || "New message from customer";
          text = p.body;
        } else if (action === "assign_task") {
          const p = body.payload as AssignTaskPayload;
          subject = `New task: ${p.title}`;
          text = (p.description?.trim() || "No description provided.");
        } else if (action === "change_assistant") {
          const p = body.payload as ChangeAssistantPayload;
          subject = "Change assistant request";
          text = `Reason: ${p.reason}\n\n${p.details?.trim() || ""}`.trim();
        } else if (action === "escalate") {
          const p = body.payload as EscalatePayload;
          subject = `Escalation (${p.severity}): ${p.subject}`;
          text = p.details?.trim() || "";
        }

        await resend.emails.send({ from, to, cc: cc.length ? cc : undefined, subject, text });
      }
    } catch (mailErr) {
      console.error("assistant-actions email error", mailErr);
      // Do not fail the main request if email sending fails
    }

    return NextResponse.json({ ok: true, id: entityId, type: entityType });
  } catch (err: any) {
    console.error("assistant-actions error", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}
