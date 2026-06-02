import { getHeroArtwork, fieldGuideAssets } from '../../assets/illustrations';
import type { FocusVisualKey } from '../../utils/focusVisuals';
import './FieldGuideArt.css';

interface HeroArtProps {
  visualKey: FocusVisualKey;
  alt: string;
  className?: string;
}

/** Large editorial hero artwork — real raster illustration assets */
export function HeroArt({ visualKey, alt, className = '' }: HeroArtProps) {
  return (
    <img
      src={getHeroArtwork(visualKey)}
      alt={alt}
      className={`hero-art ${className}`.trim()}
      loading="eager"
      decoding="async"
    />
  );
}

export function CompassArt({ className = '', size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <img
      src={fieldGuideAssets.compassRose}
      alt=""
      aria-hidden="true"
      className={`compass-art compass-art--${size} ${className}`.trim()}
    />
  );
}

export function TrailMarkerArt({ className = '' }: { className?: string }) {
  return (
    <img
      src={fieldGuideAssets.trailMarker}
      alt=""
      aria-hidden="true"
      className={`trail-marker-art ${className}`.trim()}
    />
  );
}

export function MarginFlourish({ className = '' }: { className?: string }) {
  return (
    <img
      src={fieldGuideAssets.marginFlourish}
      alt=""
      aria-hidden="true"
      className={`margin-flourish ${className}`.trim()}
    />
  );
}

export function TopoBackdrop({ className = '' }: { className?: string }) {
  return <div className={`topo-backdrop ${className}`.trim()} aria-hidden="true" />;
}

export function ParkIcon({ type, className = '' }: { type: 'tree' | 'peak'; className?: string }) {
  const src = type === 'tree' ? fieldGuideAssets.parkIconTree : fieldGuideAssets.parkIconPeak;
  return (
    <img src={src} alt="" aria-hidden="true" className={`park-icon park-icon--${type} ${className}`.trim()} />
  );
}
