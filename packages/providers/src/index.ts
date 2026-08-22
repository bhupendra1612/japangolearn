import type { Money } from "@japangolearn/api-contracts";

export type ProviderEnvironment = "fake" | "sandbox" | "production";

export interface VideoProvider {
  createUpload(input: { assetId: string; fileName: string }): Promise<{
    uploadUrl: string;
    providerAssetId?: string;
    headers?: Record<string, string>;
    expiresAt?: string;
  }>;
  createPlaybackGrant(input: {
    assetId: string;
    expiresAt: string;
  }): Promise<{ playbackUrl: string }>;
}

export interface PaymentProvider {
  createCheckout(input: {
    orderId: string;
    amount: Money;
    idempotencyKey: string;
  }): Promise<{ providerPaymentId: string; checkoutUrl: string }>;
  refund(input: {
    paymentId: string;
    amount: Money;
    idempotencyKey: string;
  }): Promise<{ providerRefundId: string }>;
}

export interface NotificationProvider {
  send(input: {
    messageId: string;
    recipient: string;
    template: string;
    variables: Record<string, string>;
  }): Promise<{ providerMessageId: string }>;
}

export interface ObjectStorageProvider {
  createUploadGrant(input: {
    objectKey: string;
    contentType: string;
  }): Promise<{ uploadUrl: string }>;
  createDownloadGrant(input: {
    objectKey: string;
    expiresAt: string;
  }): Promise<{ downloadUrl: string }>;
  deleteObject(objectKey: string): Promise<void>;
}

const fakeUrl = (kind: string, id: string) =>
  `https://fake.invalid/${kind}/${encodeURIComponent(id)}`;

export class FakeVideoProvider implements VideoProvider {
  readonly uploads: string[] = [];

  async createUpload(input: { assetId: string; fileName: string }) {
    this.uploads.push(input.assetId);
    return { uploadUrl: fakeUrl("video-upload", input.assetId) };
  }

  async createPlaybackGrant(input: { assetId: string; expiresAt: string }) {
    return { playbackUrl: fakeUrl("video-playback", input.assetId) };
  }
}

export type BunnyVideoProviderConfig = {
  libraryId: string;
  apiKey: string;
  uploadAuthorizationSeconds?: number;
  fetch?: typeof fetch;
  now?: () => number;
};

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createBunnyUploadSignature(input: {
  libraryId: string;
  apiKey: string;
  videoId: string;
  expiresAtEpochSeconds: number;
}) {
  const signatureInput = `${input.libraryId}${input.apiKey}${input.expiresAtEpochSeconds}${input.videoId}`;
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(signatureInput)));
}

export class BunnyVideoProvider implements VideoProvider {
  private readonly request: typeof fetch;
  private readonly now: () => number;

  constructor(private readonly config: BunnyVideoProviderConfig) {
    this.request = config.fetch ?? fetch;
    this.now = config.now ?? Date.now;
  }

  async createUpload(input: { assetId: string; fileName: string }) {
    const response = await this.request(
      `https://video.bunnycdn.com/library/${encodeURIComponent(this.config.libraryId)}/videos`,
      {
        method: "POST",
        headers: {
          AccessKey: this.config.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: input.fileName,
          collectionId: "",
          metaTags: [{ property: "japangolearn_asset_id", value: input.assetId }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Bunny Stream video creation failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { guid?: unknown };
    if (typeof payload.guid !== "string" || !payload.guid) {
      throw new Error("Bunny Stream response did not include a video id");
    }

    const expiresAtEpochSeconds =
      Math.floor(this.now() / 1000) + (this.config.uploadAuthorizationSeconds ?? 60 * 60);
    const signature = await createBunnyUploadSignature({
      libraryId: this.config.libraryId,
      apiKey: this.config.apiKey,
      videoId: payload.guid,
      expiresAtEpochSeconds,
    });

    return {
      uploadUrl: "https://video.bunnycdn.com/tusupload",
      providerAssetId: payload.guid,
      expiresAt: new Date(expiresAtEpochSeconds * 1000).toISOString(),
      headers: {
        AuthorizationSignature: signature,
        AuthorizationExpire: String(expiresAtEpochSeconds),
        VideoId: payload.guid,
        LibraryId: this.config.libraryId,
      },
    };
  }

  async createPlaybackGrant(input: { assetId: string; expiresAt: string }) {
    return {
      playbackUrl: `https://iframe.mediadelivery.net/embed/${encodeURIComponent(
        this.config.libraryId
      )}/${encodeURIComponent(input.assetId)}?expires=${encodeURIComponent(input.expiresAt)}`,
    };
  }
}

export class FakePaymentProvider implements PaymentProvider {
  readonly checkouts = new Map<string, string>();
  readonly refunds = new Map<string, string>();

  async createCheckout(input: { orderId: string; amount: Money; idempotencyKey: string }) {
    const providerPaymentId =
      this.checkouts.get(input.idempotencyKey) ?? `fake_pay_${input.orderId}`;
    this.checkouts.set(input.idempotencyKey, providerPaymentId);
    return { providerPaymentId, checkoutUrl: fakeUrl("checkout", providerPaymentId) };
  }

  async refund(input: { paymentId: string; amount: Money; idempotencyKey: string }) {
    const providerRefundId =
      this.refunds.get(input.idempotencyKey) ?? `fake_ref_${input.paymentId}`;
    this.refunds.set(input.idempotencyKey, providerRefundId);
    return { providerRefundId };
  }
}

export class FakeNotificationProvider implements NotificationProvider {
  readonly messages: string[] = [];

  async send(input: {
    messageId: string;
    recipient: string;
    template: string;
    variables: Record<string, string>;
  }) {
    this.messages.push(input.messageId);
    return { providerMessageId: `fake_msg_${input.messageId}` };
  }
}

export class FakeObjectStorageProvider implements ObjectStorageProvider {
  readonly deletedObjects: string[] = [];

  async createUploadGrant(input: { objectKey: string; contentType: string }) {
    return { uploadUrl: fakeUrl("object-upload", input.objectKey) };
  }

  async createDownloadGrant(input: { objectKey: string; expiresAt: string }) {
    return { downloadUrl: fakeUrl("object-download", input.objectKey) };
  }

  async deleteObject(objectKey: string) {
    this.deletedObjects.push(objectKey);
  }
}
