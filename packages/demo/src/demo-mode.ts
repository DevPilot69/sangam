/**
 * `isDemoMode()` lives in its own module (rather than directly on
 * `@sangam/demo/index.ts`) on purpose. Several providers (email, storage,
 * razorpay) call it at module-evaluation time to pick which implementation
 * object to export. If those modules imported from `./index` to get
 * `isDemoMode`, the chunk Turbopack produces would have a circular init:
 * `index.ts` → `export *` from `email.ts` → which calls `isDemoMode()` →
 * but `isDemoMode` is still in the temporal dead zone of `index.ts`.
 *
 * That circular init showed up as
 *   ReferenceError: Cannot access 'm' before initialization
 * during Vercel's "Collecting page data" step. Pulling this constant out
 * into its own module fixes it.
 */
export const isDemoMode = (): boolean =>
  (process.env.DEMO_MODE ?? "true").toLowerCase() !== "false";
