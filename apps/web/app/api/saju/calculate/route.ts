import { ManseError, calculateSaju, isManseError } from "@project-saju/manse-engine";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: "INVALID_INPUT", message: "Request body must be valid JSON." } },
      { status: 400 }
    );
  }

  try {
    const result = await calculateSaju(body as Parameters<typeof calculateSaju>[0]);
    return Response.json(result);
  } catch (error) {
    if (isManseError(error)) {
      return Response.json(
        {
          error: {
            code: error.code,
            message: error.message,
            detail: error.detail
          }
        },
        { status: error.status }
      );
    }

    const wrapped = new ManseError(
      "INTERNAL_CALCULATION_ERROR",
      "Unexpected calculation failure.",
      error instanceof Error ? { message: error.message } : error
    );

    return Response.json(
      {
        error: {
          code: wrapped.code,
          message: wrapped.message,
          detail: wrapped.detail
        }
      },
      { status: wrapped.status }
    );
  }
}
