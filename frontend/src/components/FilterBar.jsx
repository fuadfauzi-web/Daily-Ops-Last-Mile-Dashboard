import { useState } from "react";

// The region/zone/East-Malaysia/search filter bar. Only Dashboard.jsx renders
// this today (every other tab receives already-filtered props from it) --
// pulled out on its own so it isn't redrawn by hand if a future tab needs its
// own instance.
//
// Below `sm` this collapses to a single "Filters" button opening a bottom
// sheet with the same controls, full-width and stacked -- there isn't room
// for six inline controls on a phone.
function FilterControls({
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
  stacked,
}) {
  const controlWidth = stacked ? "w-full" : "";
  return (
    <>
      {!stacked && <span className="font-display text-xs font-semibold text-slate-700">Filter:</span>}
      {canPickRegion && (
        <select
          className={`min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm ${controlWidth}`}
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
        <label className="flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-slate-600">
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
          className={`min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm ${controlWidth}`}
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
        <button
          onClick={onClear}
          className={`min-h-[44px] rounded-lg bg-ink px-3 py-1.5 font-display text-xs font-medium text-white ${controlWidth}`}
        >
          Clear
        </button>
      )}
      <input
        className={`min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm ${stacked ? "w-full" : "w-56"}`}
        placeholder="Search station…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </>
  );
}

export default function FilterBar(props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeCount = [props.regionFilter !== "all", props.zoneFilter !== "all", props.search.trim() !== ""].filter(
    Boolean
  ).length;

  return (
    <>
      <div className="hidden flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200 sm:flex">
        <FilterControls {...props} />
      </div>

      <button
        onClick={() => setSheetOpen(true)}
        className="flex min-h-[44px] w-full items-center justify-between rounded-xl bg-white px-4 font-display text-sm font-medium text-slate-700 ring-1 ring-slate-200 sm:hidden"
      >
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-white">{activeCount}</span>
        )}
      </button>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-sm font-semibold text-ink">Filters</span>
              <button
                onClick={() => setSheetOpen(false)}
                className="min-h-[44px] font-display text-sm font-medium text-brand"
              >
                Done
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <FilterControls {...props} stacked />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
