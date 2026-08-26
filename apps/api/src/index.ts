import {
  API_VERSION_PREFIX,
  apiErrorResponseSchema,
  apiSuccessResponseSchema,
} from "@japangolearn/api-contracts";
import { validatePublicEnvironment } from "@japangolearn/environment";
import { BunnyVideoProvider } from "@japangolearn/providers";
import { z } from "zod";

const healthResponseSchema = apiSuccessResponseSchema(
  z.object({ status: z.literal("ok"), environment: z.string() })
);

const videoUploadRequestSchema = z.object({
  courseId: z.uuid(),
  title: z.string().trim().min(1).max(160),
  fileName: z.string().trim().min(1).max(255),
});

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

function requestIdFor(request: Request) {
  const supplied = request.headers.get("x-request-id");
  return supplied && z.uuid().safeParse(supplied).success ? supplied : crypto.randomUUID();
}

function corsHeaders(request: Request, env: Cloudflare.Env): Record<string, string> {
  const origin = request.headers.get("origin");
  const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((value) => value.trim());
  if (!origin || !allowedOrigins.includes(origin)) return {};

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "authorization, content-type, tus-resumable",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function json(
  body: unknown,
  status: number,
  requestId: string,
  request: Request,
  env: Cloudflare.Env
) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-request-id": requestId,
      ...corsHeaders(request, env),
    },
  });
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new ApiError(401, "UNAUTHENTICATED", "Sign in before uploading a video");
  }
  return authorization.slice("Bearer ".length);
}

async function supabaseRequest(
  environment: { supabaseUrl: string; supabasePublicKey: string },
  token: string,
  path: string,
  init?: RequestInit
) {
  return fetch(`${environment.supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: environment.supabasePublicKey,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init?.headers,
    },
  });
}

async function createVideoUpload(
  request: Request,
  env: Cloudflare.Env,
  environment: { supabaseUrl: string; supabasePublicKey: string }
) {
  const token = bearerToken(request);
  const input = videoUploadRequestSchema.parse(await request.json());
  const userResponse = await supabaseRequest(environment, token, "/auth/v1/user");

  if (!userResponse.ok) {
    throw new ApiError(401, "UNAUTHENTICATED", "Your session is no longer valid");
  }

  const user = (await userResponse.json()) as { id?: unknown };
  if (typeof user.id !== "string") {
    throw new ApiError(401, "UNAUTHENTICATED", "Your session is no longer valid");
  }

  const ownedCourseResponse = await supabaseRequest(
    environment,
    token,
    `/rest/v1/courses?select=id&id=eq.${encodeURIComponent(input.courseId)}&teacher_id=eq.${encodeURIComponent(user.id)}`
  );
  const ownedCourses = (await ownedCourseResponse.json()) as unknown;

  if (!ownedCourseResponse.ok || !Array.isArray(ownedCourses) || ownedCourses.length !== 1) {
    throw new ApiError(403, "COURSE_ACCESS_DENIED", "You cannot upload to this course");
  }

  const assetResponse = await supabaseRequest(environment, token, "/rest/v1/video_assets", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      teacher_id: user.id,
      course_id: input.courseId,
      title: input.title,
      file_name: input.fileName,
      status: "created",
    }),
  });
  const assetPayload = (await assetResponse.json()) as
    | Array<{ id?: unknown }>
    | { message?: string };

  if (
    !assetResponse.ok ||
    !Array.isArray(assetPayload) ||
    typeof assetPayload[0]?.id !== "string"
  ) {
    throw new ApiError(
      403,
      "TEACHER_ACCESS_REQUIRED",
      "An approved teacher account is required to upload videos"
    );
  }

  const assetId = assetPayload[0].id;
  const provider = new BunnyVideoProvider({
    libraryId: env.BUNNY_STREAM_LIBRARY_ID,
    apiKey: env.BUNNY_STREAM_API_KEY,
  });
  const grant = await provider.createUpload({ assetId, fileName: input.fileName });

  if (!grant.providerAssetId || !grant.headers) {
    throw new Error("Video provider returned an incomplete upload grant");
  }

  const updateResponse = await supabaseRequest(
    environment,
    token,
    `/rest/v1/video_assets?id=eq.${encodeURIComponent(assetId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        bunny_video_id: grant.providerAssetId,
        status: "uploading",
      }),
    }
  );

  if (!updateResponse.ok) {
    throw new Error("Could not save the Bunny video id");
  }

  return {
    assetId,
    bunnyVideoId: grant.providerAssetId,
    uploadUrl: grant.uploadUrl,
    uploadHeaders: grant.headers,
    expiresAt: grant.expiresAt,
  };
}

export const worker = {
  async fetch(request: Request, env: Cloudflare.Env): Promise<Response> {
    const requestId = requestIdFor(request);

    try {
      const environment = validatePublicEnvironment(
        {
          appEnv: env.APP_ENV,
          supabaseUrl: env.SUPABASE_URL,
          supabasePublicKey: env.SUPABASE_PUBLISHABLE_KEY,
        },
        {
          appEnvName: "APP_ENV",
          supabaseUrlName: "SUPABASE_URL",
          supabasePublicKeyName: "SUPABASE_PUBLISHABLE_KEY",
        }
      );
      const url = new URL(request.url);

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(request, env) });
      }

      if (request.method === "GET" && url.pathname === `${API_VERSION_PREFIX}/health`) {
        const body = healthResponseSchema.parse({
          data: { status: "ok", environment: environment.appEnv },
          meta: { requestId },
        });
        return json(body, 200, requestId, request, env);
      }

      if (
        request.method === "POST" &&
        url.pathname === `${API_VERSION_PREFIX}/teacher/video-uploads`
      ) {
        const data = await createVideoUpload(request, env, environment);
        const body = apiSuccessResponseSchema(z.unknown()).parse({
          data,
          meta: { requestId },
        });
        return json(body, 201, requestId, request, env);
      }

      const body = apiErrorResponseSchema.parse({
        error: { code: "NOT_FOUND", message: "Resource not found", requestId, details: {} },
      });
      return json(body, 404, requestId, request, env);
    } catch (error) {
      const apiError =
        error instanceof ApiError
          ? error
          : error instanceof z.ZodError
            ? new ApiError(400, "INVALID_REQUEST", "The request body is invalid")
            : new ApiError(500, "INTERNAL_ERROR", "The request could not be completed");
      console.error(JSON.stringify({ requestId, code: apiError.code }));
      const body = apiErrorResponseSchema.parse({
        error: {
          code: apiError.code,
          message: apiError.message,
          requestId,
          details: {},
        },
      });
      return json(body, apiError.status, requestId, request, env);
    }
  },
} satisfies ExportedHandler<Cloudflare.Env>;

export default worker;
