import { useEffect, useState } from 'react';

export default function DeliveryMap({ onChange }) {
  const zones = [
    { name: 'Madaraka / Strathmore Area', fee: 150, lat: -1.3089, lng: 36.8126 },
    { name: 'Nairobi CBD', fee: 200, lat: -1.2864, lng: 36.8172 },
    { name: 'Westlands', fee: 300, lat: -1.2676, lng: 36.8112 },
    { name: 'Kilimani / Yaya', fee: 250, lat: -1.2901, lng: 36.7876 },
    { name: 'Karen / Langata', fee: 400, lat: -1.3204, lng: 36.7565 }
  ];

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Auto-emit initial location on mount so state is ready immediately
  useEffect(() => {
    if (onChange) {
      const defaultZone = zones[0];
      onChange({ lat: defaultZone.lat, lng: defaultZone.lng, fee: defaultZone.fee });
    }
  }, []);

  function handleSelect(e) {
    const idx = Number(e.target.value);
    setSelectedIndex(idx);
    const zone = zones[idx];
    if (onChange) {
      onChange({ lat: zone.lat, lng: zone.lng, fee: zone.fee });
    }
  }

  const current = zones[selectedIndex];

  return (
    <div style={{ background: '#f9f9f9', padding: '14px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '16px' }}>
      <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>
        Select Delivery Zone:
      </label>
      <select
        className="inp"
        value={selectedIndex}
        onChange={handleSelect}
        style={{ width: '100%', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}
      >
        {zones.map((z, i) => (
          <option key={i} value={i}>
            {z.name} — KES {z.fee}
          </option>
        ))}
      </select>

      <div style={{ padding: '10px', background: '#eef3f0', borderRadius: '6px', fontSize: '0.9rem' }}>
        <div>📍 <strong>Location:</strong> {current.name}</div>
        <div>Coordinates: {current.lat}, {current.lng}</div>
        <div>Delivery Fee: <strong>KES {current.fee}</strong></div>
      </div>
    </div>
  );
}