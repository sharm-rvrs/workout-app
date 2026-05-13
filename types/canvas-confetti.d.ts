declare module "canvas-confetti" {
  // Fallback declaration to satisfy TypeScript under `moduleResolution: bundler`.
  // Runtime behavior is provided by the `canvas-confetti` package.
  const confetti: (options?: unknown) => unknown
  export default confetti
}
