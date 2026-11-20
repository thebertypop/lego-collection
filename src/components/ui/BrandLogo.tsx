import React, { useEffect, useState } from 'react';

interface BrandLogoProps {
  alt?: string;
  className?: string;
  darkMode?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  alt = 'BRICKbyBRICK',
  className = 'h-12 w-auto object-contain',
  darkMode,
}) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof darkMode === 'boolean') return darkMode;
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (typeof darkMode === 'boolean') {
      setIsDark(darkMode);
      return;
    }

    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains('dark'));
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [darkMode]);

  const logoFile = isDark ? 'brickbybrick-light.svg' : 'brickbybrick.svg';

  return (
    <img
      src={`${import.meta.env.BASE_URL}${logoFile}`}
      alt={alt}
      className={className}
    />
  );
};