import fs from 'fs';
import path from 'path';
import { extractTextFromImage } from './server/services/tesseractOcr.js';
import { parseCedula } from './server/services/cedulaParser.js';

interface TestCase {
  name: string;
  file: string;
  expected: {
    cedula?: string;
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    bloodType?: string;
  };
}

const testCases: TestCase[] = [
  {
    name: 'Cédula Nueva (HEIC)',
    file: 'public/cédula ejemplo.HEIC',
    expected: {
      cedula: '1087407675',
      firstName: 'RAFAEL ANTONIO',
      lastName: 'TOBAR CORTES',
      birthDate: '2004-08-31',
    },
  },
  {
    name: 'Amarilla 1 Frontal',
    file: 'public/amarilla 1 frontal.jpeg',
    expected: {
      cedula: '1055751038',
      lastName: 'MONTES ARANGO',
      firstName: 'JUAN FELIPE',
    },
  },
  {
    name: 'Amarilla 1 Reverso',
    file: 'public/amarilla 1 reverso.jpeg',
    expected: {
      birthDate: '2004-06-11',
      bloodType: 'O+',
    },
  },
  {
    name: 'Amarilla 2 Frontal',
    file: 'public/amarilla 2 frontal.PNG',
    expected: {
      cedula: '6845256666',
      lastName: 'TORRES CAMARGO',
      firstName: 'LUIS CARLOS',
    },
  },
];

async function runTests() {
  console.log('🚀 Iniciando batería de pruebas OCR y manejo de errores...\n');
  let passedCount = 0;

  // Prueba especial: Imagen ilegible (no debe colgarse ni colapsar)
  console.log(`--------------------------------------------------`);
  console.log(`📋 Probando: Resiliencia con Imagen Ilegible / Vacía`);
  const dummyBase64 = 'data:image/jpeg;base64,' + Buffer.from('dummy data garbage').toString('base64');
  try {
    const start = Date.now();
    const tesseractData = await extractTextFromImage(dummyBase64);
    const result = parseCedula(tesseractData.text, tesseractData);
    const duration = Date.now() - start;
    if (!result.success) {
      console.log(`  ✅ Manejo correcto de imagen ilegible (${duration}ms). Error: "${result.error}"`);
      passedCount++;
    } else {
      console.error(`  ❌ Error: Imagen vacía produjo datos inesperados.`);
    }
  } catch (err: any) {
    console.log(`  ✅ Excepción capturada correctamente sin colapso: ${err.message}`);
    passedCount++;
  }

  for (const tc of testCases) {
    console.log(`--------------------------------------------------`);
    console.log(`📋 Probando: ${tc.name} (${tc.file})`);
    const filePath = path.resolve(process.cwd(), tc.file);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Archivo no encontrado: ${filePath}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const base64Image = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;

    try {
      const tesseractData = await extractTextFromImage(base64Image);
      const result = parseCedula(tesseractData.text, tesseractData);

      if (!result.success || !result.data) {
        console.error(`❌ Error en parseo: ${result.error}`);
        console.log('--- Texto Crudo Extraído ---');
        console.log(tesseractData.text);
        continue;
      }

      const extracted = result.data;
      console.log('DATOS EXTRAÍDOS:', JSON.stringify(extracted, null, 2));

      let testPassed = true;
      for (const [key, expectedValue] of Object.entries(tc.expected)) {
        const actualValue = (extracted as any)[key];
        const normActual = (actualValue || '').toString().trim().toUpperCase();
        const normExpected = (expectedValue || '').toString().trim().toUpperCase();

        if (normActual !== normExpected) {
          console.error(`  ❌ Campo '${key}': esperado "${normExpected}", obtenido "${normActual}"`);
          testPassed = false;
        } else {
          console.log(`  ✅ Campo '${key}': "${normActual}"`);
        }
      }

      if (testPassed) {
        console.log(`🎉 PRUEBA PASADA: ${tc.name}`);
        passedCount++;
      } else {
        console.log(`⚠️ PRUEBA FALLIDA: ${tc.name}`);
        console.log('--- Texto Crudo Extraído ---');
        console.log(tesseractData.text);
      }
    } catch (err: any) {
      console.error(`💥 Excepción durante OCR: ${err.message}`, err);
    }
  }

  const totalTests = testCases.length + 1;
  console.log(`\n================ RESULTADOS FINALES ================`);
  console.log(`Pruebas pasadas: ${passedCount} / ${totalTests}`);
  console.log(`====================================================\n`);

  if (passedCount === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
