'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';


export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState(null); // null → choose screen, 'user' or 'admin'
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

 const handleLogin = (e) => {
  e.preventDefault();

  // Save details temporarily
  const userInfo = {
    role: mode, // 'user' or 'admin'
    email: email,
  };
  localStorage.setItem('loginInfo', JSON.stringify(userInfo));

  if (mode === 'user') {
    router.push('/map');
  } else if (mode === 'admin') {
     router.push('/map');
  }
};

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem',
    }}>
      {/* Step 1: Choose Role */}
      {!mode && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1e293b' }}>
            Who do you want to login as?
          </h2>
          <button
            onClick={() => setMode('user')}
            style={selectButtonStyle}
          >
            👤 Login as User
          </button>
          <button
            onClick={() => setMode('admin')}
            style={selectButtonStyle}
          >
            🛡️ Login as Admin
          </button>
        </div>
      )}

      {/* Step 2: Login Form */}
      {mode && (
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#1e293b'
          }}>
            {mode === 'user' ? '👤 User Login' : '🛡️ Admin Login'}
          </h2>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
              style={inputStyle}
            />
            <button type="submit" style={loginButtonStyle}>
              Login
            </button>
          </form>

          <button
            onClick={() => {
              setMode(null);
              setEmail('');
              setPass('');
            }}
            style={{
              marginTop: '1rem',
              fontSize: '0.875rem',
              color: '#64748b',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            ← Back to role selection
          </button>
        </div>
      )}
    </div>
  );
}

// 🔘 Style for the select buttons
const selectButtonStyle = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '8px',
  background: '#10b981',
  color: 'white',
  fontSize: '1rem',
  fontWeight: '600',
  border: 'none',
  cursor: 'pointer',
  transition: 'background 0.3s',
};

// 🔐 Style for the input boxes
const inputStyle = {
  padding: '0.75rem',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '0.875rem',
};

// ✅ Login button
const loginButtonStyle = {
  background: '#10b981',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '0.75rem',
  fontSize: '0.875rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background 0.3s',
};
