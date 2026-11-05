import sharp from 'sharp';
import fs from 'fs';

const svgImage = `
<svg width="600" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <text x="10" y="50" font-family="monospace" font-size="28" fill="black" font-weight="bold">I&lt;COL1234567895&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text>
  <text x="10" y="100" font-family="monospace" font-size="28" fill="black" font-weight="bold">9001015M3001011COL&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;4</text>
  <text x="10" y="150" font-family="monospace" font-size="28" fill="black" font-weight="bold">PEREZ&lt;GOMEZ&lt;&lt;JUAN&lt;CARLOS&lt;&lt;&lt;&lt;&lt;&lt;</text>
</svg>
`;

async function createTestImage() {
  await sharp(Buffer.from(svgImage))
    .jpeg()
    .toFile('public/test-mrz.jpg');
  console.log('Imagen de prueba creada en public/test-mrz.jpg');
}

createTestImage();
