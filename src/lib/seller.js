/**
 * The printed letterhead belongs to the business profile, not to the signed-in
 * account. Profiles are stored per user in browser storage today, so every
 * caller can build the same seller object from this helper.
 */
export function sellerDetails(user, profile = {}) {
  return {
    business: profile.businessName || user?.business || user?.name || '',
    ntn: profile.ntn || user?.businessNtn || '',
    strn: profile.strn || '',
    address: user?.businessAddress || '',
    email: user?.email || '',
  };
}
