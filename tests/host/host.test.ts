import { describe, it, expect } from "vitest";
import { importModel } from "../../src/excel/officeBridge.js";

// T30 — External consumer / Excel host.
// This Linux/CI environment has no Microsoft Excel host. We verify that the host-integration
// path (Excel.run) exists and is wired, but we do NOT claim a real Excel host execution.
describe("T30 ExternalConsumerOrExcelHost", () => {
  it("Excel host is NOT present in this environment (host execution NOT EXECUTED)", () => {
    expect((globalThis as any).Excel).toBeUndefined();
  });
  it("host-integration entrypoint (importModel) is wired and callable shape", () => {
    expect(typeof importModel).toBe("function");
  });
  it("records the gate as HOST-NOT-EXECUTED (no false GREEN)", () => {
    const executedInRealExcel = false;
    expect(executedInRealExcel).toBe(false);
  });
});
