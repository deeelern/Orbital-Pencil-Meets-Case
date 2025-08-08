export const formatLastSeen = (date) => {
  const now = new Date();
  const diff = Math.floor((now - date) / 60000);

  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};