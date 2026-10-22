import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser, Me } from "@/lib/api/types";

export type AuthStatus = "idle" | "authenticated" | "unauthenticated";

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  role: string | null;
  permissions: string[];
}

const initialState: AuthState = {
  status: "idle",
  user: null,
  role: null,
  permissions: [],
};

/**
 * Who is signed in and what they may do, for synchronous access (route guards, <Can>).
 * It mirrors the /auth/me query: TanStack Query stays the single source of server data and this
 * slice is only filled from it. Tokens never live here.
 */
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    sessionLoaded(state, action: PayloadAction<Me>) {
      state.status = "authenticated";
      state.user = action.payload.user;
      state.role = action.payload.role;
      state.permissions = action.payload.permissions;
    },
    sessionCleared() {
      return { ...initialState, status: "unauthenticated" };
    },
  },
});

export const { sessionLoaded, sessionCleared } = authSlice.actions;
export default authSlice.reducer;
