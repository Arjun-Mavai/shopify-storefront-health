# Shopify App Template - Remix

> [!NOTE]
> **Remix is now React Router.** As of [React Router v7](https://remix.run/blog/merging-remix-and-react-router), Remix and React Router have merged.
>
> For new projects, use the **[Shopify App Template - React Router](https://github.com/Shopify/shopify-app-template-react-router)** instead.
>
> To migrate your existing Remix app, follow the **[migration guide](https://github.com/Shopify/shopify-app-template-react-router/wiki/Upgrading-from-Remix)**.

This is a template for building a [Shopify app](https://shopify.dev/docs/apps/getting-started) using the [Remix](https://remix.run) framework.

Rather than cloning this repo, you can use your preferred package manager and the Shopify CLI with [these steps](https://shopify.dev/docs/apps/getting-started/create).

Visit the [`shopify.dev` documentation](https://shopify.dev/docs/api/shopify-app-remix) for more details on the Remix app package.

## Quick start

### Prerequisites

Before you begin, you'll need the following:

1. **Node.js**: [Download and install](https://nodejs.org/en/download/) it if you haven't already.
2. **Shopify Partner Account**: [Create an account](https://partners.shopify.com/signup) if you don't have one.
3. **Test Store**: Set up either a [development store](https://help.shopify.com/en/partners/dashboard/development-stores#create-a-development-store) or a [Shopify Plus sandbox store](https://help.shopify.com/en/partners/dashboard/managing-stores/plus-sandbox-store) for testing your app.
4. **Shopify CLI**: [Download and install](https://shopify.dev/docs/apps/tools/cli/getting-started) it if you haven't already.

```shell
npm install -g @shopify/cli@latest
```

### Setup

```shell
shopify app init --template=https://github.com/Shopify/shopify-app-template-remix
```

### Local Development

```shell
shopify app dev
```

Local development is powered by [the Shopify CLI](https://shopify.dev/docs/apps/tools/cli). It logs into your partners account, connects to an app, provides environment variables, updates remote config, creates a tunnel and provides commands to generate extensions.

### Authenticating and querying data

To authenticate and query data you can use the `shopify` const that is exported from `/app/shopify.server.js`:

```js
export async function loader({ request }) {
  const { admin } = await shopify.authenticate.admin(request);

  const response = await admin.graphql(`
    {
      products(first: 25) {
        nodes {
          title
          description
        }
      }
    }`);

  const {
    data: {
      products: { nodes },
    },
  } = await response.json();

  return nodes;
}
```

This template comes preconfigured with examples of:

1. Setting up your Shopify app in [/app/shopify.server.ts](https://github.com/Shopify/shopify-app-template-remix/blob/main/app/shopify.server.ts)
2. Querying data using Graphql. Please see: [/app/routes/app.\_index.tsx](https://github.com/Shopify/shopify-app-template-remix/blob/main/app/routes/app._index.tsx).
3. Responding to webhooks in individual files such as [/app/routes/webhooks.app.uninstalled.tsx](https://github.com/Shopify/shopify-app-template-remix/blob/main/app/routes/webhooks.app.uninstalled.tsx) and [/app/routes/webhooks.app.scopes_update.tsx](https://github.com/Shopify/shopify-app-template-remix/blob/main/app/routes/webhooks.app.scopes_update.tsx)

Please read the [documentation for @shopify/shopify-app-remix](https://www.npmjs.com/package/@shopify/shopify-app-remix#authenticating-admin-requests) to understand what other API's are available.

## Deployment

### Application Storage

This template uses [Prisma](https://www.prisma.io/) to store session data, by default using an [SQLite](https://www.sqlite.org/index.html) database.
The database is defined as a Prisma schema in `prisma/schema.prisma`.

This use of SQLite works in production if your app runs as a single instance.
The database that works best for you depends on the data your app needs and how it is queried.
You can run your database of choice on a server yourself or host it with a SaaS company.
Here's a short list of databases providers that provide a free tier to get started:

| Database   | Type             | Hosters                                                                                                                                                                                                                                    |
| ---------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| MySQL      | SQL              | [Digital Ocean](https://www.digitalocean.com/products/managed-databases-mysql), [Planet Scale](https://planetscale.com/), [Amazon Aurora](https://aws.amazon.com/rds/aurora/), [Google Cloud SQL](https://cloud.google.com/sql/docs/mysql) |
| PostgreSQL | SQL              | [Digital Ocean](https://www.digitalocean.com/products/managed-databases-postgresql), [Amazon Aurora](https://aws.amazon.com/rds/aurora/), [Google Cloud SQL](https://cloud.google.com/sql/docs/postgres)                                   |
| Redis      | Key-value        | [Digital Ocean](https://www.digitalocean.com/products/managed-databases-redis), [Amazon MemoryDB](https://aws.amazon.com/memorydb/)                                                                                                        |
| MongoDB    | NoSQL / Document | [Digital Ocean](https://www.digitalocean.com/products/managed-databases-mongodb), [MongoDB Atlas](https://www.mongodb.com/atlas/database)                                                                                                  |

To use one of these, you can use a different [datasource provider](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#datasource) in your `schema.prisma` file, or a different [SessionStorage adapter package](https://github.com/Shopify/shopify-api-js/blob/main/packages/shopify-api/docs/guides/session-storage.md).

### Build

Remix handles building the app for you, by running the command below with the package manager of your choice:

Using yarn:

```shell
yarn build
```

Using npm:

```shell
npm run build
```

Using pnpm:

```shell
pnpm run build
```

## Hosting

When you're ready to set up your app in production, you can follow [our deployment documentation](https://shopify.dev/docs/apps/deployment/web) to host your app on a cloud provider like [Heroku](https://www.heroku.com/) or [Fly.io](https://fly.io/).

When you reach the step for [setting up environment variables](https://shopify.dev/docs/apps/deployment/web#set-env-vars), you also need to set the variable `NODE_ENV=production`.

### Hosting on Vercel

Using the Vercel Preset is recommended when hosting your Shopify Remix app on Vercel. You'll also want to ensure imports that would normally come from `@remix-run/node` are imported from `@vercel/remix` instead. Learn more about hosting Remix apps on Vercel [here](https://vercel.com/docs/frameworks/remix).

```diff
// vite.config.ts
import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig, type UserConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
+ import { vercelPreset } from '@vercel/remix/vite';

installGlobals();

export default defineConfig({
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
+     presets: [vercelPreset()],
    }),
    tsconfigPaths(),
  ],
});
```

## Troubleshooting

### Database tables don't exist

If you get this error:

```
The table `main.Session` does not exist in the current database.
```

You need to create the database for Prisma. Run the `setup` script in `package.json` using your preferred package manager.

### Navigating/redirecting breaks an embedded app

Embedded Shopify apps must maintain the user session, which can be tricky inside an iFrame. To avoid issues:

1. Use `Link` from `@remix-run/react` or `@shopify/polaris`. Do not use `<a>`.
2. Use the `redirect` helper returned from `authenticate.admin`. Do not use `redirect` from `@remix-run/node`
3. Use `useSubmit` or `<Form/>` from `@remix-run/react`. Do not use a lowercase `<form/>`.

This only applies if your app is embedded, which it will be by default.

### Non Embedded

Shopify apps are best when they are embedded in the Shopify Admin, which is how this template is configured. If you have a reason to not embed your app please make the following changes:

1. Ensure `embedded = false` is set in [shopify.app.toml`](./shopify.app.toml). [Docs here](https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration#global).
2. Pass `isEmbeddedApp: false` to `shopifyApp()` in `./app/shopify.server.js|ts`.
3. Change the `isEmbeddedApp` prop to `isEmbeddedApp={false}` for the `AppProvider` in `/app/routes/app.jsx|tsx`.
4. Remove the `@shopify/app-bridge-react` dependency from [package.json](./package.json) and `vite.config.ts|js`.
5. Remove anything imported from `@shopify/app-bridge-react`. For example: `NavMenu`, `TitleBar` and `useAppBridge`.

### OAuth goes into a loop when I change my app's scopes

If you change your app's scopes and authentication goes into a loop and fails with a message from Shopify that it tried too many times, you might have forgotten to update your scopes with Shopify.
To do that, you can run the `deploy` CLI command.

Using yarn:

```shell
yarn deploy
```

Using npm:

```shell
npm run deploy
```

Using pnpm:

```shell
pnpm run deploy
```

### My shop-specific webhook subscriptions aren't updated

If you are registering webhooks in the `afterAuth` hook, using `shopify.registerWebhooks`, you may find that your subscriptions aren't being updated.

Instead of using the `afterAuth` hook, the recommended approach is to declare app-specific webhooks in the `shopify.app.toml` file. This approach is easier since Shopify will automatically update changes to webhook subscriptions every time you run `deploy` (e.g: `npm run deploy`). Please read these guides to understand more:

1. [app-specific vs shop-specific webhooks](https://shopify.dev/docs/apps/build/webhooks/subscribe#app-specific-subscriptions)
2. [Create a subscription tutorial](https://shopify.dev/docs/apps/build/webhooks/subscribe/get-started?framework=remix&deliveryMethod=https)

If you do need shop-specific webhooks, please keep in mind that the package calls `afterAuth` in 2 scenarios:

- After installing the app
- When an access token expires

During normal development, the app won't need to re-authenticate most of the time, so shop-specific subscriptions aren't updated. To force your app to update the subscriptions, you can uninstall and reinstall it in your development store. That will force the OAuth process and call the `afterAuth` hook.

### Admin created webhook failing HMAC validation

Webhooks subscriptions created in the [Shopify admin](https://help.shopify.com/en/manual/orders/notifications/webhooks) will fail HMAC validation. This is because the webhook payload is not signed with your app's secret key. There are 2 solutions:

1. Use [app-specific webhooks](https://shopify.dev/docs/apps/build/webhooks/subscribe#app-specific-subscriptions) defined in your toml file instead (recommended)
2. Create [webhook subscriptions](https://shopify.dev/docs/api/shopify-app-remix/v1/guide-webhooks) using the `shopifyApp` object.

Test your webhooks with the [Shopify CLI](https://shopify.dev/docs/apps/tools/cli/commands#webhook-trigger) or by triggering events manually in the Shopify admin(e.g. Updating the product title to trigger a `PRODUCTS_UPDATE`).

### Incorrect GraphQL Hints

By default the [graphql.vscode-graphql](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql) extension for VS Code will assume that GraphQL queries or mutations are for the [Shopify Admin API](https://shopify.dev/docs/api/admin). This is a sensible default, but it may not be true if:

1. You use another Shopify API such as the storefront API.
2. You use a third party GraphQL API.

in this situation, please update the [.graphqlrc.ts](https://github.com/Shopify/shopify-app-template-remix/blob/main/.graphqlrc.ts) config.

### First parameter has member 'readable' that is not a ReadableStream.

See [hosting on Vercel](#hosting-on-vercel).

### Admin object undefined on webhook events triggered by the CLI

When you trigger a webhook event using the Shopify CLI, the `admin` object will be `undefined`. This is because the CLI triggers an event with a valid, but non-existent, shop. The `admin` object is only available when the webhook is triggered by a shop that has installed the app.

Webhooks triggered by the CLI are intended for initial experimentation testing of your webhook configuration. For more information on how to test your webhooks, see the [Shopify CLI documentation](https://shopify.dev/docs/apps/tools/cli/commands#webhook-trigger).

### Using Defer & await for streaming responses

To test [streaming using defer/await](https://remix.run/docs/en/main/guides/streaming) during local development you'll need to use the Shopify CLI slightly differently:

1. First setup ngrok: https://ngrok.com/product/secure-tunnels
2. Create an ngrok tunnel on port 8080: `ngrok http 8080`.
3. Copy the forwarding address. This should be something like: `https://f355-2607-fea8-bb5c-8700-7972-d2b5-3f2b-94ab.ngrok-free.app`
4. In a separate terminal run `yarn shopify app dev --tunnel-url=TUNNEL_URL:8080` replacing `TUNNEL_URL` for the address you copied in step 3.

By default the CLI uses a cloudflare tunnel. Unfortunately it cloudflare tunnels wait for the Response stream to finish, then sends one chunk.

This will not affect production, since tunnels are only for local development.

### Using MongoDB and Prisma

By default this template uses SQLlite as the database. It is recommended to move to a persisted database for production. If you choose to use MongoDB, you will need to make some modifications to the schema and prisma configuration. For more information please see the [Prisma MongoDB documentation](https://www.prisma.io/docs/orm/overview/databases/mongodb).

Alternatively you can use a MongDB database directly with the [MongoDB session storage adapter](https://github.com/Shopify/shopify-app-js/tree/main/packages/apps/session-storage/shopify-app-session-storage-mongodb).

#### Mapping the id field

In MongoDB, an ID must be a single field that defines an @id attribute and a @map("\_id") attribute.
The prisma adapter expects the ID field to be the ID of the session, and not the \_id field of the document.

To make this work you can add a new field to the schema that maps the \_id field to the id field. For more information see the [Prisma documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/models#defining-an-id-field)

```prisma
model Session {
  session_id  String    @id @default(auto()) @map("_id") @db.ObjectId
  id          String    @unique
...
}
```

#### Error: The "mongodb" provider is not supported with this command

MongoDB does not support the [prisma migrate](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/overview) command. Instead, you can use the [prisma db push](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#db-push) command and update the `shopify.web.toml` file with the following commands. If you are using MongoDB please see the [Prisma documentation](https://www.prisma.io/docs/orm/overview/databases/mongodb) for more information.

```toml
[commands]
predev = "npx prisma generate && npx prisma db push"
dev = "npm exec remix vite:dev"
```

#### Prisma needs to perform transactions, which requires your mongodb server to be run as a replica set

See the [Prisma documentation](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/mongodb/connect-your-database-node-mongodb) for connecting to a MongoDB database.

### I want to use Polaris v13.0.0 or higher

Currently, this template is set up to work on node v18.20 or higher. However, `@shopify/polaris` is limited to v12 because v13 can only run on node v20+.

You don't have to make any changes to the code in order to be able to upgrade Polaris to v13, but you'll need to do the following:

- Upgrade your node version to v20.10 or higher.
- Update your `Dockerfile` to pull `FROM node:20-alpine` instead of `node:18-alpine`

### "nbf" claim timestamp check failed

This error will occur of the `nbf` claim timestamp check failed. This is because the JWT token is expired.
If you are consistently getting this error, it could be that the clock on your machine is not in sync with the server.

To fix this ensure you have enabled `Set time and date automatically` in the `Date and Time` settings on your computer.

## Benefits

Shopify apps are built on a variety of Shopify tools to create a great merchant experience.

<!-- TODO: Uncomment this after we've updated the docs -->
<!-- The [create an app](https://shopify.dev/docs/apps/getting-started/create) tutorial in our developer documentation will guide you through creating a Shopify app using this template. -->

The Remix app template comes with the following out-of-the-box functionality:

- [OAuth](https://github.com/Shopify/shopify-app-js/tree/main/packages/shopify-app-remix#authenticating-admin-requests): Installing the app and granting permissions
- [GraphQL Admin API](https://github.com/Shopify/shopify-app-js/tree/main/packages/shopify-app-remix#using-the-shopify-admin-graphql-api): Querying or mutating Shopify admin data
- [Webhooks](https://github.com/Shopify/shopify-app-js/tree/main/packages/shopify-app-remix#authenticating-webhook-requests): Callbacks sent by Shopify when certain events occur
- [AppBridge](https://shopify.dev/docs/api/app-bridge): This template uses the next generation of the Shopify App Bridge library which works in unison with previous versions.
- [Polaris](https://polaris.shopify.com/): Design system that enables apps to create Shopify-like experiences

## Tech Stack

This template uses [Remix](https://remix.run). The following Shopify tools are also included to ease app development:

- [Shopify App Remix](https://shopify.dev/docs/api/shopify-app-remix) provides authentication and methods for interacting with Shopify APIs.
- [Shopify App Bridge](https://shopify.dev/docs/apps/tools/app-bridge) allows your app to seamlessly integrate your app within Shopify's Admin.
- [Polaris React](https://polaris.shopify.com/) is a powerful design system and component library that helps developers build high quality, consistent experiences for Shopify merchants.
- [Webhooks](https://github.com/Shopify/shopify-app-js/tree/main/packages/shopify-app-remix#authenticating-webhook-requests): Callbacks sent by Shopify when certain events occur
- [Polaris](https://polaris.shopify.com/): Design system that enables apps to create Shopify-like experiences

## Resources

- [Remix Docs](https://remix.run/docs/en/v1)
- [Shopify App Remix](https://shopify.dev/docs/api/shopify-app-remix)
- [Introduction to Shopify apps](https://shopify.dev/docs/apps/getting-started)
- [App authentication](https://shopify.dev/docs/apps/auth)
- [Shopify CLI](https://shopify.dev/docs/apps/tools/cli)
- [App extensions](https://shopify.dev/docs/apps/app-extensions/list)
- [Shopify Functions](https://shopify.dev/docs/api/functions)
- [Getting started with internationalizing your app](https://shopify.dev/docs/apps/best-practices/internationalization/getting-started)

## added by AI

<!-- Haan Meri Jaan! Ye Shopify + Live Turso Cloud Database ka Full Tapori Style Documentation hai biddu! -->

# 🚀 Shopify Learning App (Remix + Turso SQLite Cloud + Prisma ORM)

Arey bantai! Tera Shopify Remix App live **Turso (LibSQL) Cloud SQLite Database** se 100% connect ho chuka h! Local SQLite `.db` file ka koi jhanjhat nahi! Full cloud architecture with live testing capabilities.

---

## 🏬 Shopify Ecosystem Clarity: Partner Dashboard vs App vs Development Store

Arey biddu, kaafi logon ko confusion hota h ki Shopify Partner Dashboard par kya hota h, store kidhar h, aur app store ke andar kaise chalega. Samjho poora game detail me:

### 1. Shopify Partner Dashboard (Apun Ka Control Room)

- **Kya h?**: Ye developer log ke liye Shopify ka Central Command Center hai.
- **Kaam kya karta h?**: Idhar se tu nayi **Apps** create karta h (Client ID aur Client Secret lene ke liye) aur **Development Stores** (Testing Stores) banata h.

### 2. Development Store (Testing Dukan)

- **Kya h?**: Partner Dashboard ke andar ek free test Shopify store hota h.
- **Kaam kya karta h?**: As a merchant tu waha products add kar sakta h, checkout test kar sakta h, aur apni App install karke test kar sakta h.

### 3. Shopify App (Apun Ki Code Base)

- **Kya h?**: Ye Remix + Node.js application h jo humne build kiya h.
- **Store ke andar kaise chalta h?**: Jab merchant store me app install karta h, toh Shopify Admin ke andar ek **iFrame** khulta h (via Shopify App Bridge). User ko lagta h app shopify ka part h, lekin background me request hamare Remix server aur **Turso Cloud DB** pe aati h!

---

## ⛓️ Full Architecture Chain Diagram

```
+-------------------------------------------------------------------------------+
|                           SHOPIFY PARTNER DASHBOARD                           |
|  - App Registered: "learning-arjun-app"                                       |
|  - Client ID: 88ff5ca15ac71a23480e1dcd4605eaad                                |
|  - Client Secret: shpss_4ab4999ab9ed7a98b589...                               |
+---------------------------------------+---------------------------------------+
                                        |
                                 OAuth Credentials
                                        v
+-------------------------------------------------------------------------------+
|                            DEVELOPMENT STORE ADMIN                            |
|  (e.g., test-store.myshopify.com)                                             |
|  - Merchant Installs App                                                      |
|  - Renders App inside Shopify Admin iFrame via Shopify App Bridge             |
+---------------------------------------+---------------------------------------+
                                        |
                                 GraphQL / REST API
                                        v
+-------------------------------------------------------------------------------+
|                         REMIX WEB SERVER (LOCAL / LIVE)                       |
|  - Host: http://localhost:3000                                                |
|  - Auth & Session Handling (shopify.server.ts)                                |
|  - UI Components (Polaris UI)                                                 |
+---------------------------------------+---------------------------------------+
                                        |
                            Prisma Client (driverAdapters)
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                       TURSO CLOUD SQLITE DATABASE (LibSQL)                    |
|  - URL: libsql://shopify-learning-arjun-gurjar.aws-ap-south-1.turso.io       |
|  - Auth Token: eyJhbGciOiJFZERTQSIsInR5cCI6...                                |
|  - Persists Sessions & Custom App Models                                      |
+-------------------------------------------------------------------------------+
```

---

## ⚙️ Step-by-Step Configuration & Code Implementation

### Step 1: Environment Variables (`.env`)

Secrets set up in `.env`:

```env
# Shopify Credentials
SHOPIFY_API_KEY="88ff5ca15ac71a23480e1dcd4605eaad"
SHOPIFY_API_SECRET="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"
SCOPES="write_products,read_products"
SHOPIFY_APP_URL="http://localhost:3000"

# Turso Cloud SQLite Database Credentials
TURSO_DATABASE_URL="libsql://shopify-learning-arjun-gurjar.aws-ap-south-1.turso.io"
TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
```

### Step 2: Prisma Schema (`prisma/schema.prisma`)

`previewFeatures = ["driverAdapters"]` enabled for LibSQL integration:

```prisma
// Arey bantai! Ye apna Prisma Schema h biddu!
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.sqlite"
}

model Session {
  id                  String    @id
  shop                String
  state               String
  isOnline            Boolean   @default(false)
  scope               String?
  expires             DateTime?
  accessToken         String
  userId              BigInt?
  firstName           String?
  lastName            String?
  email               String?
  accountOwner        Boolean   @default(false)
  locale              String?
  collaborator        Boolean?  @default(false)
  emailVerified       Boolean?  @default(false)
  refreshToken        String?
  refreshTokenExpires DateTime?
}

model LearningTest {
  id        String   @id @default(uuid())
  title     String
  status    String   @default("active")
  createdAt DateTime @default(now())
}
```

### Step 3: Database Client (`app/db.server.ts`)

Initialization of `@prisma/adapter-libsql` with Remix dev singleton pattern:

```typescript
// Haan meri jaan! Ye DB client setup hai - Live Turso LibSQL database ko Prisma se connect karne ka code!
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

const tursoUrl =
  process.env.TURSO_DATABASE_URL ||
  "libsql://shopify-learning-arjun-gurjar.aws-ap-south-1.turso.io";
const tursoToken = process.env.TURSO_AUTH_TOKEN || "";

const adapter = new PrismaLibSql({
  url: tursoUrl,
  authToken: tursoToken,
});

const prisma =
  global.prismaGlobal ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

export default prisma;
```

---

## 🛠️ Testing Live Turso Connection

To verify live database read/write without starting full Shopify CLI:

```bash
node scripts/test-turso.js
```

Output:

```text
🔥 Connecting to Turso Cloud at: libsql://shopify-learning-arjun-gurjar.aws-ap-south-1.turso.io
🎉 Inserted record into Turso Cloud DB: { id: 'test-1785921786862', title: 'Bantai Turso Connection Test Success! 🚀', status: 'active' }
📊 Total Records in Turso DB: 2
🌟 ALL TURSO CLOUD DB TESTS PASSED!
```

---

## 🚀 Commands to Run the App

1. Install Dependencies:
   ```bash
   npm install
   npm install @libsql/client @prisma/adapter-libsql
   ```
2. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```
3. Run Development Server:
   ```bash
   npm run dev
   ```

---

_Bole toh, full rapchik setup ho gaya bhail! Enjoy Shopify app development!_

1️⃣ Server Config:

shopify.app.toml
toml
embedded = true
Matlab: Shopify ko bol diya ki "Humari app standalone website nahi h, ise Admin Dashboard ke iFrame me embedded render karo!"

[ignoring loop detection]

# 🏛️ Shopify App Deep-Dive Architecture & Flow: 100% Basics & Crystal Clarity!

Arey bantai! Tumhara har ek confusion door karne ke liye step-by-step **Shopify Architecture, Partner Dashboard Settings, aur iFrame Magic** ko visual diagrams ke saath samjho!

---

## 📍 1. Partner Dashboard Me Ye URL Kahan Update Hota Hai?

Jab tum **`npm run dev`** chalate ho, toh Shopify CLI background me Shopify Partner API ko call karke is location par URLs update karti hai:

```text
[Shopify Partner Dashboard]
   └── Apps
        └── learning-arjun-app
             └── Configuration (App Setup Tab)
                  ├── App URL:  https://<random-id>.trycloudflare.com
                  └── Allowed redirection URL(s): https://<random-id>.trycloudflare.com/auth/callback
```

### 💡 Iska Matlab:

Jab koi merchant Admin me tumhari app icon par click karega, Shopify Partner Dashboard ki settings check karke bolta h: _"Is App ka server abhi `https://<random-id>.trycloudflare.com` par hosted h, request wahan bhejo!"_

---

## 🖼️ 2. App Shopify Admin Ke iFrame Me Kaise Chalti Hai? (Where Is The Code?)

Apni app alag browser tab me nahi, Shopify Admin ke andar ek **Embedded iFrame** (Screen-in-Screen) ke roop me load hoti h.

Iska Code **2 Jagah Wired Hai**:

### 1️⃣ Server Config: [`shopify.app.toml`](file:///Users/arjun/.gemini/antigravity/scratch/shopify-learning-app/shopify.app.toml#L6)

```toml
embedded = true
```

- **Matlab**: Shopify ko bol diya ki _"Humari app standalone website nahi h, ise Admin Dashboard ke iFrame me embedded render karo!"_

### 2️⃣ App Bridge Handshake Code: [`app/routes/app.tsx`](file:///Users/arjun/.gemini/antigravity/scratch/shopify-learning-app/app/routes/app.tsx#L16-L35)

```tsx
import { AppProvider } from "@shopify/shopify-app-remix/react";

export default function App() {
  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu> ... </NavMenu>
      <Outlet />
    </AppProvider>
  );
}
```

- **Matlab**: `@shopify/app-bridge-react` library iFrame ke andar parent Shopify Admin (`admin.shopify.com`) ke saath `window.postMessage` se hand-shake karti h. Isse tumhare Remix App ko Admin ke Toasts, Modals, aur Top Navigation Bar ka full control mil jata h!

---

## ⚡ 3. `npm run dev` Chalane Par End-to-End Kya-Kya Hota Hai? (Full Sequence Flow)

Ye hai complete **6-Step Chain Diagram**:

```
+-----------------------------------------------------------------------------------+
| STEP 1: npm run dev starts in Terminal                                            |
|   - Shopify CLI reads shopify.app.toml (Client ID: 88ff5ca15ac71a23480e1dcd46...) |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| STEP 2: Cloudflare Tunnel & Local Servers Start                                   |
|   - Creates live Tunnel: https://abc-123.trycloudflare.com                       |
|   - Starts Remix Vite Dev Server on http://localhost:3000                         |
|   - Starts GraphiQL Server on http://localhost:3457                               |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| STEP 3: Auto-Update Partner Dashboard                                             |
|   - CLI calls Partner Dashboard API -> Updates App URL to Cloudflare Tunnel       |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| STEP 4: You Press (p) or Open Admin Link                                          |
|   - Link: https://admin.shopify.com/store/learning-store-arjun/apps/...          |
|   - Shopify Admin opens iFrame pointing to Cloudflare Tunnel                      |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| STEP 5: Remix Server & Auth Execution                                             |
|   - Tunnel forwards request to app/routes/app._index.tsx                          |
|   - loader runs: `authenticate.admin(request)`                                    |
|   - Checks/Saves Session Token in TURSO CLOUD DB (prisma.session)                 |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| STEP 6: Polaris UI Rendered                                                       |
|   - React components render inside Admin iFrame with Green CONNECTED badge!      |
+-----------------------------------------------------------------------------------+
```

---

## 🎯 Final Summary (Master Class Blueprint)

1. **`npm run dev`**: Terminal local server + live Cloudflare Tunnel chalu karta hai.
2. **`automatically_update_urls_on_dev`**: Tunnel URL ko Partner Dashboard setup tab me overwrite kar deta hai.
3. **`embedded = true`**: App ko Shopify Admin iFrame me allow karta h.
4. **`PrismaSessionStorage`**: OAuth session and Access Tokens ko Live Turso Cloud DB me store aur verify karta h! 🚀
