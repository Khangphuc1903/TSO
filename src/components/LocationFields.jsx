import { VN_CITIES, districtsOf } from "../data/locations";

const chevronStyle = {
  backgroundImage:
    "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394A3B8' viewBox='0 0 16 16'%3E%3Cpath d='M4.6 6.3a1 1 0 0 1 1.4 0L8 8.6l2-2.3a1 1 0 1 1 1.5 1.4l-2.7 3.1a1 1 0 0 1-1.5 0L4.6 7.7a1 1 0 0 1 0-1.4z'/%3E%3C/svg%3E\")",
  backgroundPosition: "right 0.7rem center",
  backgroundRepeat: "no-repeat",
};

const selectClass = "input appearance-none pr-9 text-sm disabled:bg-slate-50";

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
        style={chevronStyle}
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
        style={chevronStyle}
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
