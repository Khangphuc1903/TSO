import { VN_CITIES, districtsOf } from "../data/locations";

const selectClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 disabled:bg-slate-50";

export default function LocationFields({
  city,
  district,
  onChange,
  required = false,
  allowEmpty = false,
  emptyCityLabel = "Chọn tỉnh / thành",
  emptyDistrictLabel = "Chọn quận / huyện",
}) {
  const districts = districtsOf(city);
  const unknownCity = city && !VN_CITIES.some((c) => c.name === city);
  const unknownDistrict = district && !districts.includes(district);

  return (
    <>
      <select
        required={required}
        value={city}
        onChange={(e) => onChange({ city: e.target.value, district: "" })}
        className={selectClass}
      >
        <option value="">{allowEmpty ? "Tất cả khu vực" : emptyCityLabel}</option>
        {unknownCity && <option value={city}>{city}</option>}
        {VN_CITIES.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        required={required}
        value={district}
        disabled={!city}
        onChange={(e) => onChange({ city, district: e.target.value })}
        className={selectClass}
      >
        <option value="">{allowEmpty ? "Tất cả quận / huyện" : emptyDistrictLabel}</option>
        {unknownDistrict && <option value={district}>{district}</option>}
        {districts.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </>
  );
}
