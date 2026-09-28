// One line-haul trip's arrival time + parcel count, coloured by how late it landed ("after 10am pre-warning, after
// 11am warning, after 12pm red flag"). Shared by Shipment Details (live) and the DoD Daily View (that day's captured
// trips), so the two tabs read the same way (2026-09-28).
export function tripBadgeClass(isoTime) {
  const hour = new Date(isoTime.includes("T") ? isoTime : isoTime.replace(" ", "T")).getHours();
  if (hour >= 12) return "bg-status-critical/10 text-status-critical";
  if (hour >= 11) return "bg-status-warning/10 text-status-warning";
  if (hour >= 10) return "bg-status-neutral/10 text-status-neutral";
  return "bg-status-good/10 text-status-good";
}

export function tripLabel(isoTime) {
  const d = new Date(isoTime.includes("T") ? isoTime : isoTime.replace(" ", "T"));
  return d.toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function TripBadge({ trip }) {
  if (!trip) return <span className="text-slate-300">—</span>;
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${tripBadgeClass(trip.time)}`}>
      {tripLabel(trip.time)} · {trip.parcels.toLocaleString()}
    </span>
  );
}
