# Project Structure and File Interactions Explained

This document explains the structure of the `gradjanskizahtevi` project and how the various files interact, focusing on a typical modern web application setup using React, TypeScript, Vite, Tailwind CSS, Shadcn UI, Clerk for authentication, and Supabase for the backend.

## Directory Structure

The project follows a common structure for React/Vite applications:

*   **`/` (Root)**
    *   `package.json`: Defines project dependencies and scripts.
    *   `vite.config.ts`: Configuration for Vite, the build tool.
    *   `tailwind.config.ts`: Configuration for Tailwind CSS utility classes.
    *   `postcss.config.js`: Configuration for PostCSS (often used with Tailwind).
    *   `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`: TypeScript configuration files for the overall project, the application code, and Node.js specific code (like config files), respectively. The `paths` alias (`@/*`) allows for cleaner imports (e.g., `@/components/Button` instead of `../components/Button`).
    *   `.env*`: Files for environment variables (like API keys). **Important:** Ensure sensitive keys are not committed to version control.
*   **`/public`**: Contains static assets that are served directly without processing by Vite.
    *   `_redirects`: Configuration file likely for Netlify or a similar hosting provider to handle URL redirects and potentially proxying.
    *   `hero-image.svg`: An example static asset.
*   **`/src`**: Contains the core application source code.
    *   **`/components`**: Reusable UI components.
        *   **`/ui`**: Auto-generated components from Shadcn UI (like `Button`, `Card`, `Input`, etc.). These are building blocks for your custom components.
        *   **`/admin`**: Components specific to the admin dashboard (`CategoryForm.tsx`, `RequestForm.tsx`).
        *   Custom components like `Header.tsx`, `Footer.tsx`, `VoteCard.tsx`, `RequestCard.tsx`, `SuggestedRequestCard.tsx`, `CategoryCard.tsx`, `CommentSystem.tsx`, etc. These compose the UI elements from `/ui` and add application-specific logic and structure.
    *   **`/hooks`**: Custom React Hooks to encapsulate reusable logic, especially for data fetching and state management.
        *   `use-queries.ts`: Contains custom hooks built on top of `@tanstack/react-query` to fetch and manage data from Supabase (e.g., `useCategories`, `useRequests`, `useUserVote`). This centralizes data fetching logic.
        *   `use-supabase-auth.ts`: A crucial hook managing the authentication state synchronization between Clerk (frontend auth) and Supabase (backend/database auth). It handles getting JWT tokens from Clerk and using them to interact with Supabase securely.
        *   `use-toast.ts`: Likely a simple hook for displaying notifications (toasts).
    *   **`/lib`**: Utility functions and library initializations.
        *   `utils.ts`: General utility functions, like `cn` for combining Tailwind classes.
        *   `supabase.ts`: Initializes the Supabase client (anonymous instance).
        *   `clerk-supabase.ts`: Contains helper functions specifically for the Clerk-Supabase integration, like creating authenticated Supabase clients using Clerk tokens and checking token validity.
    *   **`/pages`**: Top-level components representing different pages/views of the application (e.g., `Index.tsx`, `Home.tsx`, `Admin.tsx`, `CategoryDetail.tsx`, `NotFound.tsx`). These components typically compose smaller components from `/components` and use hooks from `/hooks` to fetch data.
    *   **`/scripts`**: Standalone scripts, potentially for maintenance, debugging, or build processes.
        *   `debug-auth.ts`: A Node.js script specifically for debugging the Clerk-Supabase authentication setup by checking environment variables, connections, and JWT secrets.
    *   **`/services`**: Modules responsible for interacting with the backend (Supabase). They abstract the direct database calls.
        *   `categories.ts`, `comments.ts`, `requests.ts`, `suggestedRequests.ts`, `timelineEvents.ts`, `users.ts`, `votes.ts`: Each file contains functions to perform CRUD (Create, Read, Update, Delete) operations on the corresponding Supabase tables (e.g., `getRequests`, `castVote`, `syncUserWithSupabase`).
    *   **`/types`**: TypeScript type definitions.
        *   `supabase.ts`: **(Currently Incomplete/Error)** This file *should* contain TypeScript types generated from your Supabase database schema, likely using the Supabase CLI (`supabase gen types typescript`). This provides type safety when interacting with the database. The current content suggests the generation process hasn't completed successfully.
    *   `App.tsx`: The main application component. It sets up routing (using `react-router-dom`), global providers (like `QueryClientProvider` for React Query, `TooltipProvider`, and the custom `SupabaseAuthProvider`), and renders the main layout.
    *   `main.tsx`: The entry point of the application. It initializes the React app, sets up the Clerk provider with the publishable key, and renders the `App` component into the DOM.
    *   `index.css`: Global CSS styles, including Tailwind CSS directives.

## Key File Interactions & Data Flow

1.  **Initialization (`main.tsx` -> `App.tsx`)**:
    *   `main.tsx` sets up the Clerk provider (`ClerkProvider`) which makes authentication context available throughout the app.
    *   It renders `App.tsx`.
    *   `App.tsx` sets up:
        *   React Router (`BrowserRouter`) for handling navigation.
        *   React Query (`QueryClientProvider`) for server state management (fetching, caching, updating data).
        *   `SupabaseAuthProvider`: This custom provider wraps the application and uses the `use-supabase-auth` hook to manage the Clerk-Supabase authentication link. It gets the JWT from Clerk and makes it available (indirectly via `useSupabaseAuth`) for authenticated Supabase requests. It handles the initial user sync.
        *   UI Providers (`TooltipProvider`, `Toaster`).
        *   Defines the application's routes (`Routes`, `Route`).

2.  **Authentication (`use-supabase-auth.ts`, `clerk-supabase.ts`, `users.ts`)**:
    *   Clerk handles the frontend sign-in/sign-up UI and session management (`SignIn`, `SignUp`, `useAuth`, `useUser`).
    *   When a user signs in, `SupabaseAuthProvider` (via `use-supabase-auth.ts`) detects the change.
    *   `use-supabase-auth.ts` uses `useAuth().getToken({ template: 'supabase' })` to get a short-lived JWT specifically configured for Supabase access.
    *   This hook then calls `syncUserWithSupabase` (from `services/users.ts`).
    *   `syncUserWithSupabase` takes the user's Clerk details (ID, email) and the Supabase JWT. It uses `getSupabaseClient(authToken)` (from `lib/clerk-supabase.ts`) to get an authenticated Supabase client instance.
    *   It then upserts the user's data into the `users` table in Supabase, ensuring a corresponding user record exists linked to the Clerk ID. This step is crucial for RLS (Row Level Security) in Supabase, which relies on the `auth.uid()` function matching the user's ID in the table.
    *   The `use-supabase-auth.ts` hook provides access to the authenticated Supabase client instance (`supabase`), the JWT (`authToken`), and user status (`supabaseUser`, `canVote`, `tokenVerified`).

3.  **Data Fetching (`Pages` -> `use-queries.ts` -> `Services` -> `Supabase`)**:
    *   Page components (e.g., `Index.tsx`, `CategoryDetail.tsx`) need data.
    *   They call custom hooks from `use-queries.ts` (e.g., `useCategories()`, `useRequests(categoryId)`).
    *   These hooks use React Query (`useQuery`) to manage the data fetching lifecycle (loading, error, success, caching).
    *   The `queryFn` within `useQuery` calls functions from the relevant service module (e.g., `categoriesService.getCategories()`, `requestsService.getRequestsByCategory(categoryId)`).
    *   Service functions (e.g., in `services/categories.ts`) use `getSupabaseClient()` (often the anonymous client for reads, or an authenticated one via a token passed from the hook for writes/RLS-protected reads) to interact directly with the Supabase database (e.g., `supabase.from('categories').select('*')`).
    *   Data flows back up: Supabase -> Service -> React Query Hook -> Page Component -> Rendered UI.

4.  **Data Mutation (e.g., Voting: `VoteCard.tsx` -> `use-queries.ts` -> `services/votes.ts` -> `Supabase`)**:
    *   A user interacts with a component (e.g., clicks a vote button in `VoteCard.tsx`).
    *   The component calls a mutation hook from `use-queries.ts` (e.g., `useCastVote().mutate(...)`).
    *   The mutation hook (`useMutation`) gets the current user ID and retrieves an auth token using `use-supabase-auth.ts` helpers (`supabaseUser`, `getCurrentAuthToken`).
    *   It calls the relevant service function (e.g., `votesService.castVote(userId, requestId, value, authToken)`).
    *   The service function uses an *authenticated* Supabase client (`getSupabaseClient(authToken)`) to perform the database operation (inserting/updating a vote). RLS policies on the `votes` table ensure the user can only modify their own vote.
    *   On success, the mutation hook uses `queryClient.invalidateQueries` to tell React Query that related data (like vote stats or the user's current vote) is stale, triggering refetches and updating the UI.

5.  **UI and Styling (`Components`, `Shadcn UI`, `Tailwind CSS`)**:
    *   Pages are built by composing components from `/src/components`.
    *   Custom components (e.g., `VoteCard`, `Header`) use pre-built UI primitives from `/src/components/ui` (e.g., `Card`, `Button`).
    *   Shadcn UI provides these primitives, which are styled using Tailwind CSS.
    *   `tailwind.config.ts` defines the theme (colors like `serbia-blue`, `serbia-red`), fonts, and other design tokens.
    *   The `cn` utility function (from `lib/utils.ts`) is used extensively to conditionally combine Tailwind classes.

## Linter Errors & Type Issues

*   The linter errors indicate that the type definition file (`src/types/supabase.ts`) is either missing, incomplete, or incorrect. It cannot find the `Database` type export. You likely need to run the Supabase CLI command `supabase gen types typescript --project-id <your-project-ref> --schema public > src/types/supabase.ts` to generate the correct types based on your database schema.
*   Similarly, the errors in `src/hooks/use-queries.ts` regarding `timelineEventsService` suggest that the functions `getTimelineEvents` and `getTimelineEventsForRequest` are either not defined or not exported correctly in `src/services/timelineEvents.ts`. That file appears to be empty currently.

This structure provides a good separation of concerns: UI components, state/data fetching logic (hooks), backend interaction logic (services), and core utilities/configuration. 