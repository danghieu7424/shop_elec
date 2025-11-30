import React from 'react';

export const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100",
    danger: "bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
  };
  return <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>{children}</button>;
};

export const Card = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>{children}</div>
);

export const Badge = ({ children, color = 'blue' }) => {
  const colors = { 
    blue: 'bg-blue-100 text-blue-800', 
    green: 'bg-green-100 text-green-800', 
    yellow: 'bg-yellow-100 text-yellow-800', 
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800'
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[color] || colors.blue}`}>{children}</span>;
};