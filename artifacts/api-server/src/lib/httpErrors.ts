export function databaseErrorResponse(error: unknown) {
  const message = flattenError(error);
  const isConnectionError =
    /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|tenant\/user|password authentication failed|does not exist/i.test(message);

  if (!isConnectionError) {
    return null;
  }

  return {
    status: 503,
    body: {
      error:
        "Database connection failed. Check DATABASE_URL in .env and use the exact Supabase pooler or direct connection string from Project Settings > Database.",
    },
  };
}

function flattenError(error: unknown): string {
  if (!error) return "";
  if (error instanceof Error) {
    const cause = "cause" in error ? flattenError(error.cause) : "";
    return [error.name, error.message, error.stack, cause].filter(Boolean).join("\n");
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
