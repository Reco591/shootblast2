export function formatDistance(km) {
  if (km < 1000) return `${Math.floor(km)} km`;
  if (km < 1_000_000) return `${(km / 1000).toFixed(1)}K km`;
  if (km < 1_000_000_000) return `${(km / 1_000_000).toFixed(1)}M km`;
  if (km < 1_000_000_000_000) return `${(km / 1_000_000_000).toFixed(2)}B km`;
  return `${(km / 1_000_000_000_000).toFixed(2)}T km`;
}
