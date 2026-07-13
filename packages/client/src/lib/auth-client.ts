import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // The Vite dev server proxies /api/* to http://localhost:3001,
  // so same-origin requests work. No baseURL needed.
});
