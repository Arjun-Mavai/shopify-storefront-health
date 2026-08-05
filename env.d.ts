// Sunna bantai! Ye file Typescript ko bolta h ki apne Turso aur Shopify ke env variables safe hain aur mast typed hain bhail!

/// <reference types="vite/client" />
/// <reference types="@remix-run/node" />

declare namespace NodeJS {
  interface ProcessEnv {
    TURSO_DATABASE_URL: string;
    TURSO_AUTH_TOKEN: string;
    SHOPIFY_API_KEY: string;
    SHOPIFY_API_SECRET: string;
    SHOPIFY_APP_URL: string;
    SCOPES: string;
  }
}
