"use client";

import { useMemo, useState } from "react";
import AssistantActions from "./AssistantActions";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type Props = {
  name?: string | null;
  email?: string | null;
  phoneE164?: string | null;
};

export default function AssistantActionMenu({ name, email, phoneE164 }: Props) {
  const telHref = useMemo(() => (phoneE164 ? `tel:${phoneE164}` : undefined), [phoneE164]);

  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messagePending, setMessagePending] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [assignPending, setAssignPending] = useState(false);
  const [estMinutes, setEstMinutes] = useState<number>(60);
  const [scheduledStart, setScheduledStart] = useState<string>("");
  const [scheduledEnd, setScheduledEnd] = useState<string>("");

  const [changeOpen, setChangeOpen] = useState(false);
  const [changeReason, setChangeReason] = useState("performance");
  const [changeDetails, setChangeDetails] = useState("");
  const [changePending, setChangePending] = useState(false);

  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escSeverity, setEscSeverity] = useState("medium");
  const [escSubject, setEscSubject] = useState("");
  const [escDetails, setEscDetails] = useState("");
  const [escalatePending, setEscalatePending] = useState(false);

  async function postAction<T>(body: T) {
    const res = await fetch("/api/assistant/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || `Request failed: ${res.status}`);
    }
    return res.json();
  }

  return (
    <div className="inline-flex items-center gap-2">
      <AssistantActions
        name={name}
        email={email}
        phoneE164={phoneE164}
        onCall={() => {
          if (telHref) window.location.href = telHref;
        }}
        onMessage={() => setMessageOpen(true)}
        onAssignTask={() => setAssignOpen(true)}
        onChangeAssistant={() => setChangeOpen(true)}
        onEscalate={() => setEscalateOpen(true)}
      />

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message {name ?? "Assistant"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value.slice(0, 1000))}
              maxLength={1000}
              rows={6}
              className="w-full rounded-md border border-border bg-background p-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              placeholder="Write your message"
            />
            <div className="text-xs text-muted-foreground text-right">{messageText.length}/1000</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                try {
                  setMessagePending(true);
                  await postAction({ action: "message", payload: { body: messageText } });
                  setMessageOpen(false);
                  setMessageText("");
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : "Failed to send message";
                  alert(msg);
                } finally {
                  setMessagePending(false);
                }
              }}
              disabled={messagePending || messageText.trim().length === 0}
            >
              {messagePending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Task to {name ?? "Assistant"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value.slice(0, 120))}
                maxLength={120}
                placeholder="Task title"
              />
              <div className="text-xs text-muted-foreground text-right">{taskTitle.length}/120</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs text-muted-foreground">Estimated time</label>
                <select
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  value={estMinutes}
                  onChange={(e) => setEstMinutes(parseInt(e.target.value, 10))}
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1 hour 30 min</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                  <option value={240}>4 hours</option>
                  <option value={300}>5 hours</option>
                  <option value={480}>8 hours</option>
                </select>
              </div>
              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs text-muted-foreground">Scheduled start (optional)</label>
                <input
                  type="datetime-local"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                />
              </div>
              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs text-muted-foreground">Scheduled end (optional)</label>
                <input
                  type="datetime-local"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  value={scheduledEnd}
                  onChange={(e) => setScheduledEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <textarea
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value.slice(0, 4000))}
                maxLength={4000}
                rows={6}
                className="w-full rounded-md border border-border bg-background p-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                placeholder="Task description"
              />
              <div className="text-xs text-muted-foreground text-right">{taskDesc.length}/4000</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                try {
                  setAssignPending(true);
                  // Convert datetime-local (which is local) to ISO. If empty, send undefined
                  const startIso = scheduledStart ? new Date(scheduledStart).toISOString() : undefined;
                  const endIso = scheduledEnd ? new Date(scheduledEnd).toISOString() : undefined;
                  await postAction({
                    action: "assign_task",
                    payload: {
                      title: taskTitle,
                      description: taskDesc || undefined,
                      estimated_time_minutes: estMinutes,
                      scheduled_start_at: startIso ?? null,
                      scheduled_end_at: endIso ?? null,
                    },
                  });
                  setAssignOpen(false);
                  setTaskTitle("");
                  setTaskDesc("");
                  setEstMinutes(60);
                  setScheduledStart("");
                  setScheduledEnd("");
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : "Failed to create task";
                  alert(msg);
                } finally {
                  setAssignPending(false);
                }
              }}
              disabled={assignPending || taskTitle.trim().length === 0}
            >
              {assignPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Assistant</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={changeReason} onChange={(e) => setChangeReason(e.target.value)}>
              <option value="performance">Performance concerns</option>
              <option value="availability">Availability/response time</option>
              <option value="timezone">Timezone alignment</option>
              <option value="skills">Skills mismatch</option>
              <option value="other">Other</option>
            </Select>
            <textarea
              value={changeDetails}
              onChange={(e) => setChangeDetails(e.target.value.slice(0, 2000))}
              maxLength={2000}
              rows={6}
              className="w-full rounded-md border border-border bg-background p-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              placeholder="Additional details (optional)"
            />
            <div className="text-xs text-muted-foreground text-right">{changeDetails.length}/2000</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                try {
                  setChangePending(true);
                  await postAction({ action: "change_assistant", payload: { reason: changeReason, details: changeDetails || undefined } });
                  setChangeOpen(false);
                  setChangeReason("performance");
                  setChangeDetails("");
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : "Failed to submit change request";
                  alert(msg);
                } finally {
                  setChangePending(false);
                }
              }}
              disabled={changePending}
            >
              {changePending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={escalateOpen} onOpenChange={setEscalateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select value={escSeverity} onChange={(e) => setEscSeverity(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
              <Input
                value={escSubject}
                onChange={(e) => setEscSubject(e.target.value.slice(0, 120))}
                maxLength={120}
                placeholder="Subject"
              />
            </div>
            <textarea
              value={escDetails}
              onChange={(e) => setEscDetails(e.target.value.slice(0, 4000))}
              maxLength={4000}
              rows={6}
              className="w-full rounded-md border border-border bg-background p-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              placeholder="Details"
            />
            <div className="text-xs text-muted-foreground text-right">{escDetails.length}/4000</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                try {
                  setEscalatePending(true);
                  await postAction({ action: "escalate", payload: { severity: escSeverity, subject: escSubject, details: escDetails || undefined } });
                  setEscalateOpen(false);
                  setEscSeverity("medium");
                  setEscSubject("");
                  setEscDetails("");
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : "Failed to submit escalation";
                  alert(msg);
                } finally {
                  setEscalatePending(false);
                }
              }}
              disabled={escalatePending || escSubject.trim().length === 0}
            >
              {escalatePending ? "Submitting..." : "Submit Escalation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
