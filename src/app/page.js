'use client';

import GoogleMapView from './components/GoogleMapView';

export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '1.5rem' }}>
        🌍 Live Disaster Zones Map
      </h1>
      <GoogleMapView />
    </main>
  );
}
