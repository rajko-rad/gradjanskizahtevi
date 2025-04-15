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
        *   `use-queries.ts`: Contains custom hooks built on top of `@tanstack/react-query` to fetch and manage data from Supabase (e.g., `useCategories`, `useRequests`, `useUserVote`). This centralizes data fetching logic. Also includes hooks for optimized bulk fetching (e.g., `useUserVotesForRequests`).
        *   `use-supabase-auth.ts`: A hook that **consumes** the centrally managed authentication context (`AuthContext` from `App.tsx`). It provides easy access to the Supabase JWT, the fetched Supabase user profile, authentication status, and an authenticated Supabase client instance.
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
    *   `App.tsx`: The main application component. Sets up routing, global providers (`QueryClientProvider`, `TooltipProvider`), and importantly, the **`SupabaseAuthProvider`**. This provider manages the core Clerk-Supabase auth link (token fetching, user sync, profile fetch) and provides the auth state via `AuthContext`.
    *   `main.tsx`: The entry point of the application. It initializes the React app, sets up the Clerk provider with the publishable key, and renders the `App` component into the DOM.
    *   `index.css`: Global CSS styles, including Tailwind CSS directives.

## Key File Interactions & Data Flow

1.  **Initialization (`main.tsx` -> `App.tsx`)**:
    *   `main.tsx` sets up `ClerkProvider`.
    *   `App.tsx` sets up:
        *   React Router, React Query, UI Providers.
        *   `SupabaseAuthProvider`: **(Central Auth Hub)** This component now manages the entire Clerk-Supabase link lifecycle. It fetches the token, syncs the user to the `public.users` table, fetches the `public.users` profile, and provides `token`, `supabaseUser`, `isAuthenticated`, `isLoadingAuth` via `AuthContext`.
        *   Routes.

2.  **Authentication (`App.tsx`, `use-supabase-auth.ts`, `clerk-supabase.ts`, `users.ts`)**: 
    *   Clerk handles frontend UI/session.
    *   `SupabaseAuthProvider` in `App.tsx` handles token fetching, user syncing (`syncUserWithSupabase` from `services/users.ts`), and profile fetching, making state available via context.
    *   `use-supabase-auth.ts` is now primarily a **consumer** of this context, providing convenient access to the state (token, `supabaseUser`, etc.) and an authenticated Supabase client (`getSupabaseClient(token)` from `lib/clerk-supabase.ts`).
    *   RLS in Supabase uses the `auth.uid()` from the token provided in requests.

3.  **Data Fetching (`Pages` -> `use-queries.ts` -> `Services` -> `Supabase`)**: 
    *   Pages call hooks from `use-queries.ts`.
    *   For general data, hooks like `useRequests` call service functions (e.g., `requestsService.getRequestsByCategory`).
    *   For user-specific data across multiple items (like votes on a page), pages use **bulk-fetching hooks** like `useUserVotesForRequests` (defined in `use-queries.ts`). This hook calls a service function (e.g., `votesService.getUserVotesForRequests`) that gets all necessary votes in one Supabase query.
    *   Service functions use `getSupabaseClient()` (potentially authenticated via token from context) to query Supabase.
    *   Data flows back: Supabase -> Service -> React Query Hook -> Page Component -> UI.

4.  **Data Mutation (e.g., Voting: `VoteCard.tsx` -> `use-queries.ts` -> `services/votes.ts` -> `Supabase`)**: 
    *   User interacts (e.g., clicks vote button).
    *   Component calls mutation hook (e.g., `useCastVote().mutate(...)`).
    *   Mutation hook gets necessary info (like `userId` from `supabaseUser`) and token via `useSupabaseAuth()` (which gets it from context).
    *   Calls service function (e.g., `votesService.castVote(..., authToken)`).
    *   Service function uses authenticated client (`getSupabaseClient(authToken)`).
    *   RLS policies apply in Supabase.
    *   `queryClient.invalidateQueries` triggers UI updates.

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