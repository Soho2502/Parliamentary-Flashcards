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
  { value: 'reform', label: 'Reform UK' },
  { value: 'scottish national', label: 'SNP' },
  { value: 'green', label: 'Green' },
  { value: 'plaid', label: 'Plaid Cymru' },
  { value: 'sinn', label: 'Sinn Féin' },
  { value: 'dup', label: 'DUP' },
  { value: 'crossbench', label: 'Crossbench' },
];

export function Filters({ filters, onChange, total }: Props) {
  const handleMinistersToggle = () => {
    if (!filters.ministersOnly) {
      onChange({ ministersOnly: true, shadowMinistersOnly: false });
    } else {
      onChange({ ministersOnly: false });
    }
  };

  const handleShadowToggle = () => {
    if (!filters.shadowMinistersOnly) {
      onChange({ shadowMinistersOnly: true, ministersOnly: false });
    } else {
      onChange({ shadowMinistersOnly: false });
    }
  };

  return (
    <div style={{
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      {/* Party chips row */}
      <div style={{
        padding: '8px 16px 0',
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {PARTIES.map(p => {
          const active = filters.party === p.value;
          return (
            <button
              key={p.value}
              onClick={() => onChange({ party: p.value })}
              style={{
                flexShrink: 0,
                padding: '5px 13px',
                borderRadius: 20,
                border: `1px solid ${active ? 'var(--green-light)' : 'var(--border)'}`,
                background: active ? 'rgba(46,160,67,0.15)' : 'var(--surface2)',
                color: active ? 'var(--green-light)' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Toggles + count row */}
      <div style={{
        padding: '8px 16px',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        flexWrap: 'wrap',
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

        <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

        <ToggleChip
          active={filters.ministersOnly}
          onClick={handleMinistersToggle}
          label="★ Ministers"
          activeColor="var(--gold-light)"
          activeBg="rgba(201,162,39,0.15)"
        />

        <ToggleChip
          active={filters.shadowMinistersOnly}
          onClick={handleShadowToggle}
          label="◈ Shadow Ministers"
          activeColor="#a78bfa"
          activeBg="rgba(167,139,250,0.12)"
        />

        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {total} cards
        </span>
      </div>
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
