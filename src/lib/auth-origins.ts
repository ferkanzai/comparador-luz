type AuthEnvironment = {
  [key: string]: string | undefined;
  BETTER_AUTH_URL?: string;
  VERCEL_ENV?: string;
  VERCEL_URL?: string;
  VERCEL_BRANCH_URL?: string;
};

export function authOrigins(env: AuthEnvironment = process.env) {
  if (env.VERCEL_ENV === "preview") {
    // Only trust exact hosts supplied by Vercel, never request headers or *.vercel.app.
    const hosts = [...new Set([env.VERCEL_URL, env.VERCEL_BRANCH_URL])].filter(
      (host): host is string =>
        Boolean(
          host &&
          /^[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?\.vercel\.app$/i.test(host),
        ),
    );
    if (hosts.length) {
      const origins = hosts.map((host) => `https://${host}`);
      return {
        baseURL: {
          allowedHosts: hosts,
          protocol: "https" as const,
          fallback: origins[0],
        },
        origins,
      };
    }
  }
  return {
    baseURL: env.BETTER_AUTH_URL,
    origins: env.BETTER_AUTH_URL ? [new URL(env.BETTER_AUTH_URL).origin] : [],
  };
}
