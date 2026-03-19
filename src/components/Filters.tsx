import type { Filters as FiltersType } from '../types';

interface Props {
  filters: FiltersType;
  onChange: (f: Partial<FiltersType>) => void;
  total: number;
}

const PARTIES = [
  { value: 'all', label: 'All Parties' },
  { value: 'labour', label: 'Labour' },
  { value: 'conservative', label: 'Conservative' },
  { value: 'liberal democrat', label: 'Lib Dems' },
  { value: 'scottish national', label: 'SNP' },
  { value: 'green', label: 'Green' },
  { value: 'reform', label: 'Reform' },
  { value: 'plaid', label: 'Plaid Cymru' },
  { value: 'sinn', label: 'Sinn Féin' },
  { value: 'dup', label: 'DUP' },
];

export function Filters({ filters, onChange, total }: Props) {
  return (
    <div style={{
      padding: '10px 16px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      alignItems: 'center',
      flexShrink: 0,
      overflowX: 'auto',
    }}>
      {/* House filter */}
      <SegmentedControl
        options={[
          { value: 'all', label: 'All' },
          { value: 'Commons', label: 'Commons' },
          { value: 'Lords', label: 'Lords' },
        ]}
        value={filters.house}
        onChange={v => onChange({ house: v as FiltersType['house'] })}
      />

      <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />

      {/* Party filter */}
      <select
        value={filters.party}
        onChange={e => onChange({ party: e.target.value })}
        style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
          borderRadius: 8,
          padding: '5px 10px',
          fontSize: 12,
          cursor: 'pointer',
          outline: 'none',
          fontFamily: 'var(--font-body)',
        }}
      >
        {PARTIES.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      {/* Ministers toggle */}
      <ToggleChip
        active={filters.ministersOnly}
        onClick={() => onChange({ ministersOnly: !filters.ministersOnly })}
        label="★ Ministers only"
        activeColor="var(--gold-light)"
        activeBg="rgba(201,162,39,0.15)"
      />

      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {total} cards
      </span>
    </div>
  );
}

function SegmentedControl({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: 'flex',
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 600,
            background: value === opt.value ? 'rgba(255,255,255,0.12)' : 'transparent',
            color: value === opt.value ? 'var(--text)' : 'var(--text-muted)',
            border: 'none',
            borderRight: '1px solid var(--border)',
            transition: 'all 0.15s',
            cursor: 'pointer',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ToggleChip({ active, onClick, label, activeColor, activeBg }: {
  active: boolean;
  onClick: () => void;
  label: string;
  activeColor: string;
  activeBg: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? activeBg : 'var(--surface2)',
        border: `1px solid ${active ? activeColor : 'var(--border)'}`,
        color: active ? activeColor : 'var(--text-muted)',
        borderRadius: 8,
        padding: '5px 12px',
        fontSize: 12,
        fontWeight: 600,
        transition: 'all 0.15s',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}
