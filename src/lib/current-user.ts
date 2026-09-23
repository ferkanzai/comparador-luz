import { cache } from "react";
import { headers } from "next/headers";
import { authConfigured, getAuth } from "./auth";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
};

export const currentUser = cache(
  async (): Promise<{
    user: CurrentUser | null;
    accountsAvailable: boolean;
  }> => {
    const requestHeaders = await headers();
    if (!authConfigured()) return { user: null, accountsAvailable: false };
    try {
      const session = await getAuth().api.getSession({
        headers: requestHeaders,
      });
      const user = session?.user;
      return {
        user: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              emailVerified: user.emailVerified,
            }
          : null,
        accountsAvailable: true,
      };
    } catch {
      return { user: null, accountsAvailable: false };
    }
  },
);
