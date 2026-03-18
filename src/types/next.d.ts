declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL?: string;
    NEXTAUTH_SECRET?: string;
    NEXTAUTH_URL?: string;
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
    GITHUB_TOKEN?: string;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
    NEXT_PUBLIC_APP_URL?: string;
    NEXT_PUBLIC_APP_NAME?: string;
    CACHE_TTL_SECONDS?: string;
    CRON_SECRET?: string;
  }
}

type NextFetchInit = RequestInit & {
  next?: {
    revalidate?: number;
    tags?: string[];
  };
};