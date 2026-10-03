export const AUTH_PATHS = ["/login", "/signup", "/auth"] as const;

export function isAuthPath(path: string): boolean {
  return AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}
