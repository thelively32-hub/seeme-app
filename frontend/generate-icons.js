const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// SEE ME App Icon Generator
// Pin de ubicación dorado sobre fondo oscuro premium

const createIcon = async (size, outputPath) => {
  // Calculamos proporciones basadas en el tamaño
  const padding = Math.floor(size * 0.12);
  const pinWidth = Math.floor(size * 0.5);
  const pinHeight = Math.floor(size * 0.65);
  const circleRadius = Math.floor(pinWidth * 0.35);
  const centerX = size / 2;
  const pinTopY = padding + pinHeight * 0.15;
  
  const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradiente de fondo premium oscuro -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a0a2e"/>
      <stop offset="50%" style="stop-color:#0d0415"/>
      <stop offset="100%" style="stop-color:#16082a"/>
    </linearGradient>
    
    <!-- Gradiente dorado premium para el pin -->
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700"/>
      <stop offset="30%" style="stop-color:#F4C542"/>
      <stop offset="70%" style="stop-color:#DAA520"/>
      <stop offset="100%" style="stop-color:#B8860B"/>
    </linearGradient>
    
    <!-- Gradiente para el brillo interno -->
    <linearGradient id="innerShine" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFF8DC;stop-opacity:0.9"/>
      <stop offset="100%" style="stop-color:#FFD700;stop-opacity:0"/>
    </linearGradient>
    
    <!-- Sombra del pin -->
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="${size * 0.02}" stdDeviation="${size * 0.03}" flood-color="#FFD700" flood-opacity="0.5"/>
    </filter>
    
    <!-- Glow effect -->
    <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="${size * 0.02}" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <!-- Clip path para esquinas redondeadas -->
    <clipPath id="roundedCorners">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${size * 0.22}" ry="${size * 0.22}"/>
    </clipPath>
  </defs>
  
  <!-- Fondo con esquinas redondeadas (para iOS) -->
  <g clip-path="url(#roundedCorners)">
    <rect width="${size}" height="${size}" fill="url(#bgGradient)"/>
    
    <!-- Círculo decorativo de fondo sutil -->
    <circle cx="${centerX}" cy="${centerX}" r="${size * 0.4}" fill="none" stroke="#F4C54210" stroke-width="${size * 0.01}"/>
    <circle cx="${centerX}" cy="${centerX}" r="${size * 0.35}" fill="none" stroke="#F4C54208" stroke-width="${size * 0.005}"/>
  </g>
  
  <!-- Pin de ubicación principal -->
  <g filter="url(#shadow)">
    <!-- Forma del pin (path SVG de un location pin) -->
    <path 
      d="M ${centerX} ${pinTopY + pinHeight}
         C ${centerX} ${pinTopY + pinHeight}
           ${centerX - pinWidth * 0.08} ${pinTopY + pinHeight * 0.7}
           ${centerX - pinWidth * 0.5} ${pinTopY + pinHeight * 0.35}
         A ${pinWidth * 0.5} ${pinWidth * 0.5} 0 1 1 ${centerX + pinWidth * 0.5} ${pinTopY + pinHeight * 0.35}
         C ${centerX + pinWidth * 0.5} ${pinTopY + pinHeight * 0.35}
           ${centerX + pinWidth * 0.08} ${pinTopY + pinHeight * 0.7}
           ${centerX} ${pinTopY + pinHeight}
         Z"
      fill="url(#goldGradient)"
      filter="url(#glow)"
    />
    
    <!-- Círculo interior (el "ojo" del pin) -->
    <circle 
      cx="${centerX}" 
      cy="${pinTopY + pinHeight * 0.35}" 
      r="${circleRadius}" 
      fill="#0d0415"
      stroke="url(#goldGradient)"
      stroke-width="${size * 0.015}"
    />
    
    <!-- Punto central brillante -->
    <circle 
      cx="${centerX}" 
      cy="${pinTopY + pinHeight * 0.35}" 
      r="${circleRadius * 0.35}" 
      fill="url(#goldGradient)"
    />
    
    <!-- Brillo superior del pin -->
    <ellipse
      cx="${centerX - pinWidth * 0.15}"
      cy="${pinTopY + pinHeight * 0.2}"
      rx="${pinWidth * 0.12}"
      ry="${pinWidth * 0.08}"
      fill="url(#innerShine)"
      opacity="0.6"
    />
  </g>
</svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
    
  console.log(`Created: ${outputPath}`);
};

const createSplashIcon = async (size, outputPath) => {
  // Splash screen: Solo el pin centrado, más grande, sin fondo redondeado
  const pinWidth = Math.floor(size * 0.35);
  const pinHeight = Math.floor(size * 0.45);
  const circleRadius = Math.floor(pinWidth * 0.35);
  const centerX = size / 2;
  const pinTopY = (size - pinHeight) / 2;
  
  const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700"/>
      <stop offset="30%" style="stop-color:#F4C542"/>
      <stop offset="70%" style="stop-color:#DAA520"/>
      <stop offset="100%" style="stop-color:#B8860B"/>
    </linearGradient>
    <linearGradient id="innerShine" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFF8DC;stop-opacity:0.9"/>
      <stop offset="100%" style="stop-color:#FFD700;stop-opacity:0"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="${size * 0.015}" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Fondo transparente -->
  <rect width="${size}" height="${size}" fill="#0d0415"/>
  
  <!-- Pin -->
  <g filter="url(#glow)">
    <path 
      d="M ${centerX} ${pinTopY + pinHeight}
         C ${centerX} ${pinTopY + pinHeight}
           ${centerX - pinWidth * 0.08} ${pinTopY + pinHeight * 0.7}
           ${centerX - pinWidth * 0.5} ${pinTopY + pinHeight * 0.35}
         A ${pinWidth * 0.5} ${pinWidth * 0.5} 0 1 1 ${centerX + pinWidth * 0.5} ${pinTopY + pinHeight * 0.35}
         C ${centerX + pinWidth * 0.5} ${pinTopY + pinHeight * 0.35}
           ${centerX + pinWidth * 0.08} ${pinTopY + pinHeight * 0.7}
           ${centerX} ${pinTopY + pinHeight}
         Z"
      fill="url(#goldGradient)"
    />
    <circle 
      cx="${centerX}" 
      cy="${pinTopY + pinHeight * 0.35}" 
      r="${circleRadius}" 
      fill="#0d0415"
      stroke="url(#goldGradient)"
      stroke-width="${size * 0.012}"
    />
    <circle 
      cx="${centerX}" 
      cy="${pinTopY + pinHeight * 0.35}" 
      r="${circleRadius * 0.35}" 
      fill="url(#goldGradient)"
    />
    <ellipse
      cx="${centerX - pinWidth * 0.15}"
      cy="${pinTopY + pinHeight * 0.2}"
      rx="${pinWidth * 0.12}"
      ry="${pinWidth * 0.08}"
      fill="url(#innerShine)"
      opacity="0.6"
    />
  </g>
  
  <!-- Texto SEE ME debajo del pin -->
  <text 
    x="${centerX}" 
    y="${pinTopY + pinHeight + size * 0.12}" 
    text-anchor="middle" 
    font-family="Arial, sans-serif" 
    font-size="${size * 0.08}" 
    font-weight="bold"
    fill="url(#goldGradient)"
    letter-spacing="${size * 0.015}"
  >SEE ME</text>
</svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
    
  console.log(`Created: ${outputPath}`);
};

const main = async () => {
  const assetsDir = path.join(__dirname, 'assets', 'images');
  
  // Crear íconos en diferentes tamaños
  await createIcon(1024, path.join(assetsDir, 'icon.png'));
  await createIcon(1024, path.join(assetsDir, 'adaptive-icon.png'));
  await createIcon(48, path.join(assetsDir, 'favicon.png'));
  await createSplashIcon(1284, path.join(assetsDir, 'splash-image.png'));
  
  console.log('\n✅ All icons created successfully!');
  console.log('\nIcon specs:');
  console.log('- Pin de ubicación dorado');
  console.log('- Fondo oscuro premium (#0d0415)');
  console.log('- Gradiente dorado con brillo');
  console.log('- Estilo moderno y elegante');
};

main().catch(console.error);
