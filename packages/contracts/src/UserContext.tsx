import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

/**
 * This file is the single source of truth for the UserContext instance.
 *
 * Because `@poc-mf/contracts` is declared as a shared singleton in every MF
 * config, the Module Federation runtime guarantees that all bundles (shell
 * and every remote) resolve this module to the exact same instance. That
 * means the `UserContext` object below has a single, stable identity across
 * bundle boundaries — which is the hard requirement for `<Provider>` in one
 * bundle to connect to `useContext(...)` in another.
 */

export type User = {
  name: string;
  premium: boolean;
};

export type UserContextValue = {
  user: User | null;
  signIn: (user: User) => void;
  signOut: () => void;
};

export const UserContext = createContext<UserContextValue | null>(null);

UserContext.displayName = 'UserContext';

type UserProviderProps = {
  children: ReactNode;
  initialUser?: User | null;
};

export function UserProvider({ children, initialUser = null }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      signIn: (nextUser: User) => setUser(nextUser),
      signOut: () => setUser(null),
    }),
    [user],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

/**
 * Hook convenience wrapper. Throws if used outside of a `<UserProvider>` so
 * integration mistakes surface early rather than silently reading `null`.
 */
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error(
      'useUser() must be used inside <UserProvider>. ' +
        'Check that the shell is wrapping its children with <UserProvider>, ' +
        'and that @poc-mf/contracts is declared as a shared singleton in every MF config.',
    );
  }
  return ctx;
}

// Expose the Dispatch type in case consumers want to build their own setters.
export type UserSetter = Dispatch<SetStateAction<User | null>>;
