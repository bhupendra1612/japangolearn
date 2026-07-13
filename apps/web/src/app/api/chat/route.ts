// AI Chat is temporarily disabled until GOOGLE_GENERATIVE_AI_API_KEY is configured.
// To re-enable, add the API key to your environment variables and restore this route.

export const maxDuration = 30;

export async function POST() {
  return new Response(
    JSON.stringify({
      error:
        "AI Chat is not yet configured. Please add the GOOGLE_GENERATIVE_AI_API_KEY environment variable.",
    }),
    { status: 503, headers: { "Content-Type": "application/json" } }
  );
}
