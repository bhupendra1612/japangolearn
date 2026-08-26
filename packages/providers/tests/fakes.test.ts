import { describe, expect, it } from "vitest";
import {
  BunnyVideoProvider,
  FakeNotificationProvider,
  FakeObjectStorageProvider,
  FakePaymentProvider,
  FakeVideoProvider,
} from "../src";

describe("provider fakes", () => {
  it("provides deterministic, network-free adapters", async () => {
    const video = new FakeVideoProvider();
    const payment = new FakePaymentProvider();
    const notification = new FakeNotificationProvider();
    const storage = new FakeObjectStorageProvider();

    expect(
      (await video.createUpload({ assetId: "asset-1", fileName: "lesson.mp4" })).uploadUrl
    ).toContain("fake.invalid");

    const checkout = {
      orderId: "order-1",
      amount: { amountMinor: 1000, currency: "INR" },
      idempotencyKey: "checkout-001",
    };
    expect(await payment.createCheckout(checkout)).toEqual(await payment.createCheckout(checkout));

    await notification.send({
      messageId: "message-1",
      recipient: "learner@example.test",
      template: "welcome",
      variables: {},
    });
    await storage.deleteObject("materials/one.pdf");
    expect(notification.messages).toEqual(["message-1"]);
    expect(storage.deletedObjects).toEqual(["materials/one.pdf"]);
  });
});

describe("Bunny video provider", () => {
  it("creates a video and returns a time-limited TUS upload grant", async () => {
    const requests: Array<URL | RequestInfo> = [];
    const provider = new BunnyVideoProvider({
      libraryId: "12345",
      apiKey: "secret",
      now: () => 1_700_000_000_000,
      fetch: async (input) => {
        requests.push(input);
        return Response.json({ guid: "video-guid" });
      },
    });

    const grant = await provider.createUpload({
      assetId: "local-asset",
      fileName: "lesson.mp4",
    });

    expect(requests).toHaveLength(1);
    expect(grant.providerAssetId).toBe("video-guid");
    expect(grant.uploadUrl).toBe("https://video.bunnycdn.com/tusupload");
    expect(grant.headers).toMatchObject({
      LibraryId: "12345",
      VideoId: "video-guid",
      AuthorizationExpire: "1700003600",
    });
    expect(grant.headers?.AuthorizationSignature).toMatch(/^[a-f0-9]{64}$/);
  });
});
