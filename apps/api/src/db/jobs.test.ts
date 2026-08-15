import { describe, it, expect, afterEach } from "vitest";
import { createJob, startJob, completeJob, failJob, getJob, listPendingApprovals, approveJob, rejectJob } from "./jobs.js";
import { db } from "./client.js";

const createdIds: number[] = [];

function trackedCreateJob(type: string, input: unknown, requiresApproval = false): number {
  const id = createJob(type, input, requiresApproval);
  createdIds.push(id);
  return id;
}

afterEach(() => {
  for (const id of createdIds.splice(0)) {
    db.prepare(`DELETE FROM jobs WHERE id = ?`).run(id);
  }
});

describe("createJob", () => {
  it("creates a job with pending status by default", () => {
    const id = trackedCreateJob("test_type", { foo: "bar" });
    const job = getJob(id);
    expect(job?.status).toBe("pending");
    expect(job?.type).toBe("test_type");
  });

  it("creates a job with pending_approval status when requiresApproval is true", () => {
    const id = trackedCreateJob("test_type", { foo: "bar" }, true);
    const job = getJob(id);
    expect(job?.status).toBe("pending_approval");
    expect(job?.requires_approval).toBe(1);
  });
});

describe("job lifecycle", () => {
  it("transitions pending -> running -> done", () => {
    const id = trackedCreateJob("test_type", {});
    startJob(id);
    expect(getJob(id)?.status).toBe("running");

    completeJob(id, { ok: true });
    const job = getJob(id);
    expect(job?.status).toBe("done");
    expect(JSON.parse(job!.result_json!)).toEqual({ ok: true });
  });

  it("transitions to failed with an error message", () => {
    const id = trackedCreateJob("test_type", {});
    startJob(id);
    failJob(id, "something broke");
    const job = getJob(id);
    expect(job?.status).toBe("failed");
    expect(job?.error).toBe("something broke");
  });
});

describe("approval workflow", () => {
  it("lists jobs pending approval", () => {
    const id = trackedCreateJob("test_type", {}, true);
    const pending = listPendingApprovals();
    expect(pending.some((j) => j.id === id)).toBe(true);
  });

  it("approveJob moves status from pending_approval to pending", () => {
    const id = trackedCreateJob("test_type", {}, true);
    approveJob(id);
    expect(getJob(id)?.status).toBe("pending");
  });

  it("rejectJob moves status to failed with rejection message", () => {
    const id = trackedCreateJob("test_type", {}, true);
    rejectJob(id);
    const job = getJob(id);
    expect(job?.status).toBe("failed");
    expect(job?.error).toBe("Rejected by human reviewer");
  });

  it("does not approve a job that is not pending_approval", () => {
    const id = trackedCreateJob("test_type", {});
    approveJob(id);
    expect(getJob(id)?.status).toBe("pending");
  });
});
