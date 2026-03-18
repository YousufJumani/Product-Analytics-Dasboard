/**
 * NextAuth Route Handler
 * Handles all auth flows: signin, signout, callbacks, session
 */
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
