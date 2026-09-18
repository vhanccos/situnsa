import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/domain",
  "packages/contracts",
  "packages/db",
  "apps/api",
  "apps/web",
]);
