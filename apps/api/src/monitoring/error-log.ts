interface LoggedError {
  message: string;
  path: string;
  method: string;
  statusCode: number;
  timestamp: string;
}

const MAX_ERRORS = 50;
const recentErrors: LoggedError[] = [];

export function recordError(message: string, path: string, method: string, statusCode: number): void {
  recentErrors.unshift({
    message,
    path,
    method,
    statusCode,
    timestamp: new Date().toISOString(),
  });
  if (recentErrors.length > MAX_ERRORS) {
    recentErrors.length = MAX_ERRORS;
  }
}

export function getRecentErrors(limit = 20): LoggedError[] {
  return recentErrors.slice(0, limit);
}

export function getErrorCountLastHour(): number {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  return recentErrors.filter((e) => new Date(e.timestamp).getTime() > oneHourAgo).length;
}
