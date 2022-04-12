import {
  configureStore,
  isRejectedWithValue,
  Middleware,
  MiddlewareAPI,
} from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { api } from "services/api";
import { raiseErrorToast } from "utils/helpers";

const rtkQueryErrorInterceptor: Middleware =
  (_: MiddlewareAPI) => (next) => (action) => {
    if (isRejectedWithValue(action)) {
      raiseErrorToast(action.payload.message);
    }

    return next(action);
  };

export const storeBuilder = () =>
  configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware, rtkQueryErrorInterceptor),
  });

const store = storeBuilder();

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
