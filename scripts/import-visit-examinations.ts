import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parseStringPromise } from 'xml2js';

// Get the correct database path
const projectRoot = path.join(__dirname, '..');
const databasePath = path.join(projectRoot, 'prisma', 'dev.db');
const databaseUrl = `file:${databasePath}`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

interface XmlVisitData {
  N__Enr?: string[];
  CDEP?: string[];
  DATECLI?: string[];
  MEDCIN?: string[];
  Ag2?: string[];
  MOTIF?: string[];
  
  // Left Eye (OG)
  SCOG?: string[];      // SV
  AVOG?: string[];      // AV
  p3?: string[];        // SPHÈRE
  p5?: string[];        // CYLINDRE
  p6?: string[];        // Alternative VL sphere
  p7?: string[];        // VL (auto-generated, ignore)
  AXG?: string[];       // AXE
  K1_G?: string[];      // K1
  K2_G?: string[];      // K2
  R1_G?: string[];      // R1 (auto-calculated, ignore)
  R2_G?: string[];      // R2 (auto-calculated, ignore)
  RAYONG?: string[];    // R0 (auto-calculated, ignore)
  pachy1_g?: string[];  // PACHY
  pachy2_g?: string[];  // T.O.C (auto-calculated, ignore)
  TOOG?: string[];      // T.O
  VAG?: string[];       // GONIO (actual gonioscopy)
  commentaire_G?: string[]; // Notes
  LAF_G?: string[];     // L.A.F
  FO_G?: string[];      // F.O
  
  // Right Eye (OD)
  SCOD?: string[];      // SV
  AVOD?: string[];      // AV
  p1?: string[];        // SPHÈRE
  p2?: string[];        // CYLINDRE
  p4?: string[];        // Alternative VL sphere
  vpppD?: string[];     // VL (auto-generated, ignore)
  AXD?: string[];       // AXE
  K1_D?: string[];      // K1
  K2_D?: string[];      // K2
  R1_d?: string[];      // R1 (auto-calculated, ignore)
  R2_d?: string[];      // R2 (auto-calculated, ignore)
  RAYOND?: string[];    // R0 (auto-calculated, ignore)
  pachy1_D?: string[];  // PACHY
  pachy2_d?: string[];  // T.O.C (auto-calculated, ignore)
  TOOD?: string[];      // T.O
  VAD?: string[];       // GONIO (actual gonioscopy)
  comentaire_D?: string[]; // Notes
  LAF?: string[];       // L.A.F
  FO?: string[];        // F.O
  
  // Common fields
  EP?: string[];        // D.I.P
  cycloplégie?: string[]; // CYCLOPLÉGIE
  CAT?: string[];       // CONDUITE À TENIR
  DIAG?: string[];      // DIAG
  DIIAG?: string[];     // DIAG (alternative spelling)
  ANG?: string[];       // General diagnosis (NOT gonioscopy!)
}

function getXmlValue(value: string[] | undefined): string | null {
  if (!value || !value[0] || value[0].trim() === '' || value[0] === '0') {
    return null;
  }
  return value[0].trim();
}

async function importVisitExaminations() {
  const startTime = Date.now();
  
  try {
    const xmlFilePath = path.join(__dirname, '..', 'ilyest_fixed.xml');
    
    console.log('🚀 Starting visit examinations import...\n');
    console.log('📖 Reading ilyest.xml file...');
    
    if (!fs.existsSync(xmlFilePath)) {
      console.error(`❌ Error: visits.xml file not found at ${xmlFilePath}`);
      process.exit(1);
    }
    
    const xmlData = fs.readFileSync(xmlFilePath, 'utf-8');
    console.log(`✅ XML file loaded (${(xmlData.length / 1024 / 1024).toFixed(2)} MB)`);
    
    console.log('🔍 Parsing XML data...');
    const result = await parseStringPromise(xmlData, {
      explicitArray: true,
      mergeAttrs: true,
    });
    
    const visits = result.WINDEV_TABLE?.Table_Contenu || [];
    console.log(`\n📊 Found ${visits.length.toLocaleString()} visit record(s) in XML\n`);
    
    console.log('💾 Importing visits in database (batch mode)...\n');
    
    let imported = 0;
    let skipped = 0;
    const BATCH_SIZE = 1000;
    const batches: any[] = [];
    let currentBatch: any[] = [];
    
    for (const visit of visits) {
      const data: XmlVisitData = visit;
      
      const patientCode = getXmlValue(data.CDEP);
      const visitDate = getXmlValue(data.DATECLI);
      
      if (!patientCode || !visitDate) {
        skipped++;
        continue;
      }
      
      const visitData = {
        recordNumber: data.N__Enr ? parseInt(data.N__Enr[0]) : null,
        patientCode: parseInt(patientCode),
        visitDate: visitDate,
        medecin: getXmlValue(data.MEDCIN),
        motif: getXmlValue(data.MOTIF),
        
        // Left Eye (OG) - Store raw values, let UI auto-calculate
        svLeft: getXmlValue(data.SCOG),
        avLeft: getXmlValue(data.AVOG),
        sphereLeft: getXmlValue(data.p3),
        cylinderLeft: getXmlValue(data.p5),
        axisLeft: getXmlValue(data.AXG),
        vlLeft: null, // Will be auto-calculated by UI
        k1Left: getXmlValue(data.K1_G),
        k2Left: getXmlValue(data.K2_G),
        r1Left: null, // Will be auto-calculated by UI
        r2Left: null, // Will be auto-calculated by UI
        r0Left: null, // Will be auto-calculated by UI
        pachyLeft: getXmlValue(data.pachy1_g),
        tocLeft: null, // Will be auto-calculated by UI
        toLeft: getXmlValue(data.TOOG),
        gonioLeft: getXmlValue(data.VAG), // CORRECT: VAG for gonioscopy
        notesLeft: getXmlValue(data.commentaire_G),
        lafLeft: getXmlValue(data.LAF_G),
        foLeft: getXmlValue(data.FO_G),
        
        // Right Eye (OD) - Store raw values, let UI auto-calculate
        svRight: getXmlValue(data.SCOD),
        avRight: getXmlValue(data.AVOD),
        sphereRight: getXmlValue(data.p1),
        cylinderRight: getXmlValue(data.p2),
        axisRight: getXmlValue(data.AXD),
        vlRight: null, // Will be auto-calculated by UI
        k1Right: getXmlValue(data.K1_D),
        k2Right: getXmlValue(data.K2_D),
        r1Right: null, // Will be auto-calculated by UI
        r2Right: null, // Will be auto-calculated by UI
        r0Right: null, // Will be auto-calculated by UI
        pachyRight: getXmlValue(data.pachy1_D),
        tocRight: null, // Will be auto-calculated by UI
        toRight: getXmlValue(data.TOOD),
        gonioRight: getXmlValue(data.VAD), // CORRECT: VAD for gonioscopy
        notesRight: getXmlValue(data.comentaire_D),
        lafRight: getXmlValue(data.LAF),
        foRight: getXmlValue(data.FO),
        
        // Common fields
        addition: null, // RIADG has NO data according to user
        dip: getXmlValue(data.EP),
        cycloplegie: getXmlValue(data.cycloplégie),
        conduiteATenir: getXmlValue(data.CAT),
        diagnostic: getXmlValue(data.DIAG) || getXmlValue(data.DIIAG), // DIAG field, NOT ANG!
      };
      
      currentBatch.push(visitData);
      
      // When batch is full, save it
      if (currentBatch.length >= BATCH_SIZE) {
        batches.push([...currentBatch]);
        currentBatch = [];
      }
    }
    
    // Add remaining records
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }
    
    console.log(`📦 Processing ${batches.length.toLocaleString()} batch(es) of ${BATCH_SIZE} records each\n`);
    
    // Import batches
    for (let i = 0; i < batches.length; i++) {
      try {
        const result = await prisma.visitExamination.createMany({
          data: batches[i]
        });
        
        imported += result.count;
        const progress = ((i + 1) / batches.length * 100).toFixed(1);
        process.stdout.write(`\r   Progress: ${progress}% (${imported.toLocaleString()} records imported)`);
      } catch (error) {
        console.error(`\n❌ Error importing batch ${i + 1}:`, error);
      }
    }
    
    console.log('\n');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n✨ Import Summary:');
    console.log(`   - Visits imported: ${imported.toLocaleString()}`);
    if (skipped > 0) {
      console.log(`   - Skipped (missing data): ${skipped.toLocaleString()}`);
    }
    console.log(`⏱️  Total time: ${duration}s`);
    console.log('✅ Import completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Error importing visit examinations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importVisitExaminations()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
