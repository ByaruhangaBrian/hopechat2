/**
 * Deterministic vibrant gradients for contact and user avatar fallbacks.
 * Keeps UI lively and colorful while maintaining visual consistency for any given name/id.
 */

const AVATAR_GRADIENTS = [
  "bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/20",
  "bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-sm shadow-sky-500/20",
  "bg-gradient-to-tr from-violet-500 to-purple-600 text-white shadow-sm shadow-violet-500/20",
  "bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-sm shadow-amber-500/20",
  "bg-gradient-to-tr from-rose-500 to-pink-600 text-white shadow-sm shadow-rose-500/20",
  "bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/20",
  "bg-gradient-to-tr from-fuchsia-500 to-purple-600 text-white shadow-sm shadow-fuchsia-500/20",
  "bg-gradient-to-tr from-teal-500 to-emerald-600 text-white shadow-sm shadow-teal-500/20",
];

export function getAvatarGradient(seed?: string | null): string {
  if (!seed) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}
