import { AsyncLocalStorage } from "node:async_hooks";

export const mongoRequestScope =
  (globalThis[Symbol.for("bliss-finance.mongoRequestScope")] ??= new AsyncLocalStorage());
