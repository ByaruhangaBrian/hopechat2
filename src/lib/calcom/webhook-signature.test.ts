import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyCalComSignature } from "./webhook-signature";

const SECRET = "calcom-webhook-test-secret";

function signedHeader(body: string, secret: string = SECRET): string {
  const hex = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${hex}`;
}

describe("verifyCalComSignature", () => {
  it("accepts a request signed with the correct secret", () => {
    const body = JSON.stringify({ triggerEvent: "BOOKING_CREATED" });
    expect(verifyCalComSignature(body, signedHeader(body), SECRET)).toBe(true);
  });

  it("rejects a signature computed with a different secret", () => {
    const body = "{}";
    expect(verifyCalComSignature(body, signedHeader(body, "wrong"), SECRET)).toBe(
      false,
    );
  });

  it("rejects when the body has been tampered with after signing", () => {
    const original = '{"triggerEvent":"BOOKING_CREATED"}';
    const header = signedHeader(original);
    const tampered = '{"triggerEvent":"BOOKING_CANCELLED"}';
    expect(verifyCalComSignature(tampered, header, SECRET)).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(verifyCalComSignature("anything", null, SECRET)).toBe(false);
  });

  it("rejects a header without the sha256= prefix", () => {
    const body = "{}";
    const hex = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
    expect(verifyCalComSignature(body, hex, SECRET)).toBe(false);
    expect(verifyCalComSignature(body, `sha512=${hex}`, SECRET)).toBe(false);
  });

  it("rejects a header of the wrong length without throwing", () => {
    expect(verifyCalComSignature("{}", "sha256=tooshort", SECRET)).toBe(false);
  });
});