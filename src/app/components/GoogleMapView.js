'use client';

import { useEffect, useState, useRef } from 'react';
import { LoadScript } from '@react-google-maps/api';
import ClusterMap from './ClusterMap';
import DisasterStats from './DisasterStats';
import EmergencySupport from './EmergencySupport';

const disasterTypes = {
  EQ: { label: 'Earthquake', icon: '🗻', color: '#ff6b6b' },
  FL: { label: 'Flood', icon: '🌊', color: '#4ecdc4' },
  TC: { label: 'Cyclone', icon: '🌀', color: '#45b7d1' },
  VO: { label: 'Volcano', icon: '🌋', color: '#ffa726' },
  TS: { label: 'Tsunami', icon: '🌊', color: '#26c6da' },
  DR: { label: 'Drought', icon: '🌵', color: '#8d6e63' },
  WF: { label: 'Wildfire', icon: '🔥', color: '#ff7043' },
  EH: { label: 'Extreme Heat', icon: '☀️', color: '#ff9800' },
  CW: { label: 'Cold Wave', icon: '❄️', color: '#90caf9' },
  LS: { label: 'Landslide', icon: '🏔️', color: '#795548' },
};

export default function GoogleMapView() {
  const [disasters, setDisasters] = useState([]);
  const [historicalDisasters, setHistoricalDisasters] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [userState, setUserState] = useState(null);
  const [userCountry, setUserCountry] = useState(null);
  const [proximityMode, setProximityMode] = useState('nearby');
  const [radiusKm, setRadiusKm] = useState(500);
  const [alertDisasters, setAlertDisasters] = useState([]);
  const [address, setAddress] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyDateRange, setHistoryDateRange] = useState('30'); // days
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [detailedLocation, setDetailedLocation] = useState(null);
  const mapRef = useRef(null);

  const fetchDisasters = async () => {
    try {
      const res = await fetch('https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?format=geojson');
      const json = await res.json();
      const features = json.features || [];
      const markers = features.map((feature, index) => {
        const coords = feature.geometry?.coordinates;
        const props = feature.properties || {};
        if (!coords || coords.length < 2) return null;
        return {
          id: props.eventid + '-' + index,
          lat: parseFloat(coords[1]),
          lng: parseFloat(coords[0]),
          name: props.name || props.description || 'Unknown',
          type: props.eventtype,
          country: props.country || 'Unknown',
          state: props.adm1 || null,
          date: props.fromdate || props.datemodified,
          toDate: props.todate || props.datemodified,
          severity: props.severity || 'Unknown',
          alertlevel: props.alertlevel || 'Unknown',
        };
      }).filter(Boolean);
      setDisasters(markers);
    } catch (err) {
      console.error('Error fetching disaster data:', err);
    }
  };

  const fetchHistoricalDisasters = async (days = 30) => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const res = await fetch(`https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?format=geojson&fromdate=${startDate.toISOString().split('T')[0]}&todate=${endDate.toISOString().split('T')[0]}`);
      const json = await res.json();
      const features = json.features || [];
      const markers = features.map((feature, index) => {
        const coords = feature.geometry?.coordinates;
        const props = feature.properties || {};
        if (!coords || coords.length < 2) return null;
        return {
          id: 'hist-' + props.eventid + '-' + index,
          lat: parseFloat(coords[1]),
          lng: parseFloat(coords[0]),
          name: props.name || props.description || 'Unknown',
          type: props.eventtype,
          country: props.country || 'Unknown',
          state: props.adm1 || null,
          date: props.fromdate || props.datemodified,
          toDate: props.todate || props.datemodified,
          severity: props.severity || 'Unknown',
          alertlevel: props.alertlevel || 'Unknown',
          isHistorical: true,
        };
      }).filter(Boolean);
      setHistoricalDisasters(markers);
    } catch (err) {
      console.error('Error fetching historical disaster data:', err);
    }
  };

  const reverseGeocodeUser = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`
      );
      const json = await res.json();
      const address = json.address || {};
      setUserState(address.state || null);
      setUserCountry(address.country || null);
      setDetailedLocation({
        city: address.city || address.town || address.village || 'Unknown',
        state: address.state || 'Unknown',
        country: address.country || 'Unknown',
        postcode: address.postcode || null,
        fullAddress: json.display_name || 'Unknown',
        coordinates: { lat, lng }
      });
    } catch {
      setUserState(null);
      setUserCountry(null);
      setDetailedLocation(null);
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const json = await res.json();
      return json.display_name || '';
    } catch {
      return '';
    }
  };

  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDuration = (start, end) => {
    const diff = new Date(end) - new Date(start);
    if (diff <= 0) return 'Ongoing';

    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);

    if (days > 0) return `${days} days`;
    if (hrs > 0) return `${hrs} hours`;
    return `${mins} minutes`;
  };

  const getCurrentLocation = () => {
    setLocationLoading(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        await reverseGeocodeUser(coords.lat, coords.lng);
        setLocationLoading(false);
      },
      err => {
        console.error('Location error:', err);
        setLocationError('Unable to get your location. Please check your browser settings.');
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  useEffect(() => {
    fetchDisasters();
    fetchHistoricalDisasters(parseInt(historyDateRange));
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (!userLocation || disasters.length === 0) {
      setAlertDisasters([]);
      setAlertVisible(false);
      return;
    }

    let filtered = [];

    if (proximityMode === 'nearby') {
      filtered = disasters.filter(d =>
        haversineDistance(userLocation.lat, userLocation.lng, d.lat, d.lng) <= radiusKm
      );
    } else if (proximityMode === 'state') {
      filtered = disasters.filter(
        d => d.state && userState && d.state.toLowerCase() === userState.toLowerCase()
      );
    } else if (proximityMode === 'country') {
      filtered = disasters.filter(
        d => d.country && userCountry && d.country.toLowerCase() === userCountry.toLowerCase()
      );
    }

    setAlertDisasters(filtered);
    setAlertVisible(filtered.length > 0);

    if (filtered.length > 0) {
      reverseGeocode(filtered[0].lat, filtered[0].lng).then(setAddress);
    } else {
      setAddress('');
    }
  }, [userLocation, disasters, proximityMode, radiusKm, userState, userCountry]);

  const filteredDisasters = filter === 'ALL' ? disasters : disasters.filter(d => d.type === filter);
  const allDisasters = showHistory ? [...filteredDisasters, ...historicalDisasters] : filteredDisasters;

  const getEmojiIcon = (type) => {
    const emoji = disasterTypes[type]?.icon || '❔';
    if (!window.google || !googleLoaded) return null;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-size: 16px; text-align: center;">
            ${emoji}
          </div>
        </foreignObject>
      </svg>
    `;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(30, 30),
    };
  };

  return (
    <div
      style={{
        fontFamily: 'sans-serif',
        backgroundColor: darkMode ? '#1e1e1e' : '#ece2d0',
        color: darkMode ? '#ffffff' : '#2b3e35',
        minHeight: '100vh',
        padding: '60px 48px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '36px' }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: '700',
          letterSpacing: '1.5px',
          margin: 0,
          color: darkMode ? '#ffe8b3' : '#4b3b2b',
          textShadow: '1px 1px 1px #c8b9a6',
        }}>
          🌐 Project Vigyaan
        </h1>
        <p style={{ fontSize: '1.25rem', marginTop: '6px', color: darkMode ? '#d2c3b5' : '#5a4a3c' }}>
          Live Environmental Disaster Monitor
        </p>
      </header>

      {/* Enhanced Location Display */}
      {detailedLocation && (
        <div style={{
          background: darkMode ? '#2a2a2a' : '#f9f3e9',
          padding: '16px 24px',
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: `2px solid ${darkMode ? '#4a4a4a' : '#d4c4a8'}`,
          maxWidth: '600px',
          width: '100%',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '24px' }}>📍</span>
            <h3 style={{ margin: 0, fontWeight: '600', color: darkMode ? '#ffe8b3' : '#6d5b44' }}>
              Your Location
            </h3>
            <button 
              onClick={getCurrentLocation}
              disabled={locationLoading}
              style={{
                background: locationLoading ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: locationLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              {locationLoading ? '🔄 Updating...' : '🔄 Refresh'}
            </button>
          </div>
          
          {locationError && (
            <div style={{ color: '#ff6b6b', fontSize: '14px', marginBottom: '8px' }}>
              ⚠️ {locationError}
            </div>
          )}
          
          <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
            <div><strong>City:</strong> {detailedLocation.city}</div>
            <div><strong>State:</strong> {detailedLocation.state}</div>
            <div><strong>Country:</strong> {detailedLocation.country}</div>
            {detailedLocation.postcode && <div><strong>Postcode:</strong> {detailedLocation.postcode}</div>}
            <div><strong>Coordinates:</strong> {detailedLocation.coordinates.lat.toFixed(4)}, {detailedLocation.coordinates.lng.toFixed(4)}</div>
          </div>
        </div>
      )}

      {/* Controls row */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '32px',
        gap: '36px',
        flexWrap: 'wrap',
        width: '100%',
        maxWidth: '1200px',
      }}>
        <div style={{
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          flexWrap: 'wrap',
          flexGrow: 1,
          maxWidth: '800px',
          justifyContent: 'flex-start',
        }}>
          <label style={{ fontWeight: '600' }}>Filter:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={selectStyle(darkMode)}>
            <option value="ALL">All</option>
            {Object.entries(disasterTypes).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <label style={{ fontWeight: '600' }}>Proximity:</label>
          <select value={proximityMode} onChange={(e) => setProximityMode(e.target.value)} style={selectStyle(darkMode)}>
            <option value="nearby">Nearby</option>
            <option value="state">State</option>
            <option value="country">Nationwide</option>
          </select>

          {proximityMode === 'nearby' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
              <input type="range" min="50" max="1000" step="50" value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} style={{ flexGrow: 1 }} />
              <span style={{ minWidth: '55px', textAlign: 'center', fontWeight: '600' }}>{radiusKm} km</span>
            </div>
          )}

          {/* History Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: '600' }}>History:</label>
          <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                background: showHistory ? '#4CAF50' : '#666',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              {showHistory ? '📚 Showing' : '📚 Show'}
            </button>
          </div>

          {showHistory && (
            <select 
              value={historyDateRange} 
              onChange={(e) => {
                setHistoryDateRange(e.target.value);
                fetchHistoricalDisasters(parseInt(e.target.value));
              }} 
              style={selectStyle(darkMode)}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 6 months</option>
              <option value="365">Last year</option>
            </select>
          )}
        </div>

        {/* Notification bell */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setNotifOpen(!notifOpen)} style={bellButtonStyle(alertVisible)}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} width={28} height={28} style={{ color: alertVisible ? '#ff4d4d' : '#fff' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {alertVisible && <span style={sirenPulseStyle} />}
          </button>

          {notifOpen && (
            <div style={notifBoxStyle}>
              {alertVisible ? (
                <>
                  <strong style={{ display: 'block', fontSize: '1.15rem', marginBottom: '14px' }}>
                    ⚠️ Disaster Alert{alertDisasters.length > 1 ? `s (${alertDisasters.length})` : ''}
                  </strong>
                  <p><b>📍 Location:</b> {address}</p>
                  <p><b>📡 Mode:</b> {proximityMode.toUpperCase()}</p>
                  <ul style={{ marginTop: 0, paddingLeft: '20px' }}>
                    {alertDisasters.map((d, idx) => (
                      <li key={d.id} style={{ marginBottom: idx === alertDisasters.length - 1 ? 0 : '14px' }}>
                        <b>{disasterTypes[d.type]?.label || d.type}</b><br />
                        📍 {d.name || 'Unknown Location'}<br />
                        🕒 From: {new Date(d.date).toLocaleString()}<br />
                        ⏱️ Duration: {formatDuration(d.date, d.toDate)}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p style={{ margin: 0, fontWeight: '600' }}>✅ No environmental dangers detected nearby currently.</p>
              )}
            </div>
          )}
        </div>

        {/* 🌗 Dark mode toggle */}
        <button onClick={() => setDarkMode(!darkMode)} style={darkModeToggleStyle}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Map and Legend */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '48px',
          alignItems: 'flex-start',
          width: '100%',
          maxWidth: '1200px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            flex: '1 1 640px',
            background: darkMode ? '#2a2a2a' : '#f9f3e9',
            borderRadius: '16px',
            boxShadow: '0 6px 14px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            minWidth: '300px',
            position: 'relative',
          }}
        >
                <LoadScript
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
            onLoad={() => setGoogleLoaded(true)}
            libraries={['places', 'geometry']}
          >
        <ClusterMap
              disasters={allDisasters}
          getEmojiIcon={getEmojiIcon}
          userLocation={userLocation}
              radiusKm={radiusKm}
              proximityMode={proximityMode}
          darkMode={darkMode}
          mapRef={mapRef}
              showHistory={showHistory}
        />
      </LoadScript>

          {/* 🔄 Recenter to user button */}
      {userLocation && (
        <button
          title="Recenter Map"
          onClick={() => {
            if (mapRef.current) {
              mapRef.current.panTo(userLocation);
              mapRef.current.setZoom(6);
            }
          }}
              style={{
                position: 'absolute',
                bottom: '16px',
                right: '16px',
                zIndex: 99,
                background: '#ffcf91',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              }}
            >
              📍 My Location
        </button>
      )}
        </div>

        {/* Enhanced Legend box */}
        <aside
          style={{
            width: '280px',
            padding: '18px 20px',
            borderRadius: '16px',
            background: darkMode ? '#2a2a2a' : '#f9f3e9',
            color: darkMode ? '#eee' : '#4b3b2b',
            boxShadow: '0 6px 14px rgba(0,0,0,0.2)',
            alignSelf: 'flex-start',
          }}
        >
          <h4 style={{
            textAlign: 'center',
            marginBottom: '16px',
            fontWeight: '700',
            fontSize: '1.25rem',
            letterSpacing: '0.03em',
            color: darkMode ? '#ffe8b3' : '#6d5b44',
          }}>
            Legend
          </h4>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: darkMode ? '#d2c3b5' : '#5a4a3c'
            }}>
              <span>Live Events</span>
              <span style={{ color: '#4CAF50' }}>●</span>
            </div>
            {showHistory && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: '600',
                color: darkMode ? '#d2c3b5' : '#5a4a3c'
              }}>
                <span>Historical Events</span>
                <span style={{ color: '#FF9800' }}>●</span>
              </div>
            )}
          </div>
          
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {Object.entries(disasterTypes).map(([type, { label, icon, color }]) => (
              <li
                key={type}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                  fontWeight: '600',
                  fontSize: '1rem',
                }}
              >
                <span style={{ fontSize: '22px' }}>{icon}</span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
          
          {showHistory && (
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              background: darkMode ? '#3a3a3a' : '#f0e6d6',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>📚 History Mode</div>
              <div>Showing events from the last {historyDateRange} days</div>
        </div>
      )}
        </aside>
      </div>

      {/* Statistics Component */}
      <DisasterStats 
        disasters={disasters}
        historicalDisasters={historicalDisasters}
        showHistory={showHistory}
        darkMode={darkMode}
      />

      {/* Emergency Support Component */}
      <EmergencySupport 
        userLocation={userLocation}
        darkMode={darkMode}
        mapRef={mapRef}
      />

      {/* 🔁 Animations */}
      <style>{`
        @keyframes sirenPulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// 🔧 Reusable styles
const selectStyle = (darkMode) => ({
  padding: '6px 14px',
  borderRadius: '8px',
  fontSize: '1rem',
  border: '1.5px solid #b49e74',
  backgroundColor: darkMode ? '#333' : '#f9f3e9',
  color: darkMode ? '#fff' : '#4b3b2b',
  cursor: 'pointer',
});

const bellButtonStyle = (alertVisible) => ({
  fontSize: '28px',
  borderRadius: '50%',
  border: 'none',
  cursor: 'pointer',
  padding: '8px 12px',
  backgroundColor: '#b49e74',
  color: '#fff',
  boxShadow: '0 0 10px rgba(180,158,116,0.6)',
  position: 'relative',
  transition: 'box-shadow 0.3s ease',
  outline: 'none',
});

const sirenPulseStyle = {
  position: 'absolute',
  top: '-6px',
  left: '-6px',
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  border: '2.5px solid rgba(255, 77, 77, 0.7)',
  animation: 'sirenPulse 1.5s infinite ease-in-out',
};

const notifBoxStyle = {
  position: 'absolute',
  top: '44px',
  right: '0',
  width: '340px',
  background: '#fff8f0',
  color: '#4b3b2b',
  border: '1.5px solid #b49e74',
  borderRadius: '14px',
  padding: '20px 24px',
  boxShadow: '0 8px 14px rgba(180,158,116,0.35)',
  zIndex: 9999,
  fontSize: '0.95rem',
};

const darkModeToggleStyle = {
  fontSize: '26px',
  padding: '6px 10px',
  borderRadius: '10px',
  background: '#ffcf91',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
};
