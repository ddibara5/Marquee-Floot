import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSession } from "../endpoints/auth/session_GET.schema";
import { postLogout } from "../endpoints/auth/logout_POST.schema";
import { forgetQueryCache, readRememberedUser, rememberUser } from "./queryCachePersist";
import { User } from "./User";

// React Query key for auth session. Make sure to optimistically update user infos using this.
export const AUTH_QUERY_KEY = ["auth", "session"] as const;

// Do not use this state in login/register UI because it's irrelevant. Only use it in UI that requires authentication.
// For pages that requires authentication only in parts of the UI (e.g. typical home page with a user avatar), the loading
// state should not apply to the full page, only to the parts that require authentication.
// Also, global context providers should not be blocked on auth states as it will block the whole page.
type AuthState =
  | {
      // Make sure to display a nice loading state UI when loading authentication state
      type: "loading";
    }
  | {
      type: "authenticated";
      user: User;
    }
  | {
      // Make sure to redirect to login or show auth error UI
      type: "unauthenticated";
      errorMessage?: string;
    };

type AuthContextType = {
  // Use this to display the correct UI based on auth state
  authState: AuthState;
  // Notify the auth provider that we have logged in
  onLogin: (user: User) => void;
  // Clear the auth state and perform the logout request
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Add this to components/_globalContextProviders but not any pageLayout files.
// Make sure it's within the QueryClientProvider
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  // Open signed in as the last user on this device and check the session in the background (GameDeck, October 17),
  // so the saved data shows at once instead of waiting on a session round trip every launch.
  const [remembered] = useState(readRememberedUser);

  const { data, error, status } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      // A server answer of "not signed in" is final. A network failure or server error throws, which keeps a
      // remembered user signed in (offline launch) and retries later.
      const result = await getSession();
      return "error" in result ? null : result.user;
    },
    retry: 1,
    enabled: true,
    staleTime: Infinity,
    initialData: readRememberedUser, // read again on reset, so a sign-out (which forgets it first) stays signed out
    initialDataUpdatedAt: 0,
  });
  useEffect(() => {
    if (remembered) void queryClient.refetchQueries({ queryKey: AUTH_QUERY_KEY });
  }, [remembered, queryClient]);

  const authState: AuthState = data
    ? { type: "authenticated", user: data }
    : status === "pending"
      ? { type: "loading" }
      : status === "error"
        ? {
            type: "unauthenticated",
            errorMessage:
              error instanceof Error ? error.message : "Session check failed",
          }
        : { type: "unauthenticated" };

  // Signed out for any reason (sign-out here, an expired session, or a sign-out elsewhere): drop the saved
  // Marquee data and the remembered user from this device and from memory, so the next account never sees it.
  const signedOut = !data && status !== "pending";
  useEffect(() => {
    if (data) rememberUser(data);
    if (!signedOut) return;
    rememberUser(null);
    forgetQueryCache();
    queryClient.removeQueries({ queryKey: ["marquee"] });
  }, [data, signedOut, queryClient]);

  const logout = useCallback(async () => {
    // Optimistically update UI
    rememberUser(null);
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
    forgetQueryCache();
    try {
      // Make the actual API call
      await postLogout();
    } finally {
      // Invalidate all queries after login so previous user's state don't corrupt new user state.
      queryClient.resetQueries();
      forgetQueryCache(); // again, in case a save was already queued before sign-out
    }
  }, [queryClient]);

  // This should only be used for login. For user profile changes, create separate endpoints and react query hooks
  // and update the data linked to AUTH_QUERY_KEY.
  const onLogin = useCallback(
    (user: User) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
    },
    [queryClient]
  );

  return (
    <AuthContext.Provider value={{ authState, logout, onLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

// Prefer using protectedRoutes instead of this hook unless the route doesn't need to be protected (e.g. login/register)
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a AuthProvider");
  }
  return context;
};
