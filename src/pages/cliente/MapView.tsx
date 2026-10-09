import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import type { Propiedad } from '@/types';
import { CHACRAS_CENTER } from '@/data/properties';
import { fmtARSShort } from '@/lib/format';
import { useT } from '@/i18n';

function FitBounds({ items }: { items: Propiedad[] }) {
  const map = useMap();
  useEffect(() => {
    if (!items.length) return;
    const b = L.latLngBounds(items.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(b, { padding: [36, 36], maxZoom: 15 });
  }, [items, map]);
  // Leaflet necesita recalcular su tamaño cuando el contenedor cambia (toggle lista/mapa)
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  });
  return null;
}

/** Mapa de Chacras de Coria con pines de precio (OpenStreetMap) */
export default function MapView({ items, activeId, onSelect, single, className }: { items: Propiedad[]; activeId?: string | null; onSelect?: (id: string) => void; single?: boolean; className?: string }) {
  const navigate = useNavigate();
  const { lang } = useT();
  const icons = useMemo(
    () =>
      Object.fromEntries(
        items.map((p) => [
          p.id,
          L.divIcon({
            className: '',
            html: `<span class="price-pin${p.id === activeId || single ? ' active' : ''}">${single ? '●' : fmtARSShort(p.precioNoche, lang)}</span>`,
            iconSize: [0, 0],
          }),
        ]),
      ),
    [items, activeId, single, lang],
  );
  return (
    <div className={className}>
      <MapContainer center={single && items[0] ? [items[0].lat, items[0].lng] : CHACRAS_CENTER} zoom={single ? 15 : 14} scrollWheelZoom={false} className="h-full w-full rounded-card">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {!single && <FitBounds items={items} />}
        {items.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={icons[p.id]}
            eventHandlers={{
              click: () => (onSelect ? onSelect(p.id) : navigate(`/propiedad/${p.slug}`)),
            }}
          >
            {!single && <Tooltip direction="top" offset={[0, -14]}>{p.nombre}</Tooltip>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
