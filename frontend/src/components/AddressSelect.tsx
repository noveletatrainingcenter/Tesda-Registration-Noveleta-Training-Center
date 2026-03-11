// frontend/src/components/AddressSelect.tsx
import { useState, useMemo } from 'react';
import regionData from '@/data/Region.json';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MunicipalityEntry { barangay_list: string[] }
interface ProvinceEntry     { municipality_list: Record<string, MunicipalityEntry> }
interface RegionEntry       { region_name: string; province_list: Record<string, ProvinceEntry> }
const data = regionData as Record<string, RegionEntry>;

// ─── Lookup helpers ───────────────────────────────────────────────────────────
export const REGION_OPTIONS = Object.values(data).map(r => r.region_name);

export function getProvinces(regionName: string): string[] {
  const entry = Object.values(data).find(r => r.region_name === regionName);
  return entry ? Object.keys(entry.province_list) : [];
}

export function getMunicipalities(regionName: string, province: string): string[] {
  const entry = Object.values(data).find(r => r.region_name === regionName);
  return entry ? Object.keys(entry.province_list[province]?.municipality_list ?? {}) : [];
}

export function getBarangays(regionName: string, province: string, municipality: string): string[] {
  const entry = Object.values(data).find(r => r.region_name === regionName);
  return entry?.province_list[province]?.municipality_list[municipality]?.barangay_list ?? [];
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface AddressValue {
  address_subdivision: string;
  address_street:      string;
  address_barangay:    string;
  address_city:        string;
  address_province:    string;
  address_region:      string;
}

interface AddressSelectProps {
  value:    AddressValue;
  onChange: (updated: AddressValue) => void;
}

function Sel({ value, onChange, options, placeholder, disabled }: {
  value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string; disabled?: boolean;
}) {
  return (
    <select
      className="input-base disabled:opacity-50 disabled:cursor-not-allowed"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">{placeholder ?? '— Select —'}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export default function AddressSelect({ value, onChange }: AddressSelectProps) {
  const [manualBarangay, setManualBarangay] = useState(false);

  const provinces      = useMemo(() => getProvinces(value.address_region), [value.address_region]);
  const municipalities = useMemo(() => getMunicipalities(value.address_region, value.address_province), [value.address_region, value.address_province]);
  const barangays      = useMemo(() => getBarangays(value.address_region, value.address_province, value.address_city), [value.address_region, value.address_province, value.address_city]);

  function set(field: keyof AddressValue, val: string) {
    const reset: Partial<AddressValue> = {};
    if (field === 'address_region')   { reset.address_province = ''; reset.address_city = ''; reset.address_barangay = ''; }
    if (field === 'address_province') { reset.address_city = ''; reset.address_barangay = ''; }
    if (field === 'address_city')     { reset.address_barangay = ''; }
    onChange({ ...value, ...reset, [field]: val });
  }

  return (
    <div className="space-y-4">
      {/* Subdivision / Condo — optional */}
      <div>
        <label className="label">
          Subdivision / Condominium
          <span className="text-xs font-normal text-text-muted ml-1">(optional)</span>
        </label>
        <input
          className="input-base"
          value={value.address_subdivision}
          onChange={e => set('address_subdivision', e.target.value)}
          placeholder="e.g. Greenfield Subdivision, One Ayala Tower 2"
        />
      </div>

      {/* House No. + Street */}
      <div>
        <label className="label">House / Building No. &amp; Street</label>
        <input
          className="input-base"
          value={value.address_street}
          onChange={e => set('address_street', e.target.value)}
          placeholder="e.g. 123 Rizal Street"
        />
      </div>

      {/* Region → Province → City (always dropdowns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="label">Region</label>
          <Sel value={value.address_region} onChange={v => set('address_region', v)} options={REGION_OPTIONS} placeholder="— Select Region —" />
        </div>
        <div>
          <label className="label">Province</label>
          <Sel value={value.address_province} onChange={v => set('address_province', v)} options={provinces} placeholder="— Select Province —" disabled={!value.address_region} />
        </div>
        <div>
          <label className="label">City / Municipality</label>
          <Sel value={value.address_city} onChange={v => set('address_city', v)} options={municipalities} placeholder="— Select City —" disabled={!value.address_province} />
        </div>
      </div>

      {/* Barangay — dropdown with manual fallback only */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Barangay</label>
          <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={manualBarangay}
              onChange={() => { setManualBarangay(m => !m); set('address_barangay', ''); }}
              className="accent-accent"
            />
            Not in list
          </label>
        </div>
        {manualBarangay ? (
          <input
            className="input-base"
            value={value.address_barangay}
            onChange={e => set('address_barangay', e.target.value)}
            placeholder="Type your barangay name"
          />
        ) : (
          <Sel
            value={value.address_barangay}
            onChange={v => set('address_barangay', v)}
            options={barangays}
            placeholder="— Select Barangay —"
            disabled={!value.address_city}
          />
        )}
      </div>
    </div>
  );
}