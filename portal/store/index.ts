import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import { applyTheme, persistSidebar, persistTheme } from "@/lib/theme/apply";
import authReducer from "./auth-slice";
import uiReducer, {
  initialUiState,
  setTheme,
  toggleSidebar,
  setSidebarCollapsed,
  type UiState,
} from "./ui-slice";

/** Side effects of UI preferences (cookie + <html> class) live here, not in components. */
function createPreferenceListener() {
  const listener = createListenerMiddleware();

  listener.startListening({
    actionCreator: setTheme,
    effect: (action) => {
      persistTheme(action.payload);
      applyTheme(action.payload);
    },
  });

  listener.startListening({
    predicate: (action) => toggleSidebar.match(action) || setSidebarCollapsed.match(action),
    effect: (_action, api) => {
      persistSidebar((api.getState() as RootState).ui.sidebarCollapsed);
    },
  });

  return listener;
}

export function makeStore(preloadedUi: Partial<UiState> = {}) {
  const listener = createPreferenceListener();

  return configureStore({
    reducer: { auth: authReducer, ui: uiReducer },
    preloadedState: { ui: { ...initialUiState, ...preloadedUi } },
    middleware: (getDefault) => getDefault().prepend(listener.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
