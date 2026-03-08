import React from 'react';

export default function WelcomeBanner({ title, subtitle }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-primary via-blue-700 to-secondary rounded-2xl p-7 text-white mb-6">
      {/* Decorative circles */}
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5"></div>
      <div className="absolute right-14 -bottom-10 w-24 h-24 rounded-full bg-white/[0.04]"></div>
      <div className="text-xl font-bold mb-1">{title}</div>
      <div className="text-sm opacity-80">{subtitle}</div>
    </div>
  );
}
