import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const { pathname } = useLocation();

  const navStyle = {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'rgba(15,17,23,0.92)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #2A3050',
    padding: '0 2rem',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    height: '64px',
  };

  const logoStyle = {
    fontFamily: 'Georgia, serif',
    fontSize: '1.3rem', fontWeight: 'bold',
    color: '#E8ECF4', textDecoration: 'none',
    display: 'flex', alignItems: 'center', gap: '10px',
  };

  const linkStyle = (path) => ({
    textDecoration: 'none',
    fontSize: '0.9rem', fontWeight: 500,
    color: pathname === path ? '#4F8EF7' : '#7B85A0',
    borderBottom: pathname === path ? '2px solid #4F8EF7' : '2px solid transparent',
    paddingBottom: '2px', transition: 'color 0.2s',
  });

  return (
    <nav style={navStyle}>
      <Link to="/" style={logoStyle}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%',
          background: 'linear-gradient(135deg,#4F8EF7,#34C78A)',
          display: 'inline-block'
        }}/>
        CKD Predictor
      </Link>
      <div style={{ display: 'flex', gap: '2rem' }}>
        {[['/', 'Home'], ['/predict', 'Predict'], ['/about', 'About']].map(([path, label]) => (
          <Link key={path} to={path} style={linkStyle(path)}>{label}</Link>
        ))}
      </div>
    </nav>
  );
}