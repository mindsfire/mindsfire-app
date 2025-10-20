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
                } catch (e: any) {
                  alert(e?.message || "Failed to send message");
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
                  await postAction({ action: "assign_task", payload: { title: taskTitle, description: taskDesc || undefined } });
                  setAssignOpen(false);
                  setTaskTitle("");
                  setTaskDesc("");
                } catch (e: any) {
                  alert(e?.message || "Failed to create task");
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
                } catch (e: any) {
                  alert(e?.message || "Failed to submit change request");
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
                } catch (e: any) {
                  alert(e?.message || "Failed to submit escalation");
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
