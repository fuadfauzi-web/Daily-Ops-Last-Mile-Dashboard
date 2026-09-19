// The region/zone/East-Malaysia/search filter bar. Only Dashboard.jsx renders
// this today (every other tab receives already-filtered props from it) --
// pulled out on its own so it isn't redrawn by hand if a future tab needs its
// own instance.
export default function FilterBar({
  canPickRegion,
  canPickZone,
  canToggleEastMalaysia,
  regionFilter,
  onRegionFilterChange,
  zoneFilter,
  onZoneFilterChange,
  visibleRegions,
  zoneOptions,
  includeEastMalaysia,
  onIncludeEastMalaysiaChange,
  search,
  onSearchChange,
  onClear,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <span className="font-display text-xs font-semibold text-slate-700">Filter:</span>
      {canPickRegion && (
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
          value={regionFilter}
          onChange={(e) => onRegionFilterChange(e.target.value)}
        >
          <option value="all">All regions</option>
          {visibleRegions.map((r) => (
            <option key={r.region} value={r.region}>
              {r.region}
            </option>
          ))}
        </select>
      )}
      {canToggleEastMalaysia && (
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={includeEastMalaysia}
            onChange={(e) => onIncludeEastMalaysiaChange(e.target.checked)}
          />
          Include East Malaysia
        </label>
      )}
      {canPickZone && (
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
          value={zoneFilter}
          onChange={(e) => onZoneFilterChange(e.target.value)}
        >
          <option value="all">All zones</option>
          {zoneOptions.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      )}
      {(canPickRegion || canPickZone) && (
        <button onClick={onClear} className="rounded-lg bg-ink px-3 py-1.5 font-display text-xs font-medium text-white">
          Clear
        </button>
      )}
      <input
        className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
        placeholder="Search station…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}
