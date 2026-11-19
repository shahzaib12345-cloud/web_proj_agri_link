/**
 * Decides whether a brand-new listing is visible straight away.
 *   off        -> always visible
 *   unverified -> visible only when the farmer has been verified by an admin
 *   all        -> never visible until an admin approves it
 * Anything unexpected is treated as the strictest option, so a typo can't publish unreviewed content.
 */
export function initialModeration(mode, farmer) {
  if (mode === 'off') return true;
  if (mode === 'unverified') return farmer?.isVerified === true;
  return false;
}
