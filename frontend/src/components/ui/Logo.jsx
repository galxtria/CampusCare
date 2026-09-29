import React from 'react';

export default function Logo({ size = 40, className = '', rounded = true }) {
  return (
    <img
      src={`${process.env.PUBLIC_URL || ''}/logo.svg`}
      alt="Logo CampusCare"
      width={size}
      height={size}
      className={`${rounded ? 'rounded-xl' : ''} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
