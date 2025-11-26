import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parseStringPromise } from 'xml2js'

const prisma = new PrismaClient()

interface CompteRenduXML {
  N__Enr?: string[]
  IDCOMPTES?: string[]
  CODE_COMPTE?: string[]
  CONTENU?: string[]
  TITRE_ECHODP?: string[]
}

async function importComptesRendus() {
  try {
    console.log('📄 Starting Comptes Rendus import from hi.xml...')

    // Read the XML file
    const xmlPath = path.join(process.cwd(), 'hi.xml')
    const xmlData = fs.readFileSync(xmlPath, 'utf-8')

    // Parse XML
    const result = await parseStringPromise(xmlData)
    const comptesRendus = result.WINDEV_TABLE?.Table_Contenu || []

    console.log(`Found ${comptesRendus.length} comptes rendus templates`)

    // Import each template
    for (const item of comptesRendus) {
      const compteRendu: CompteRenduXML = item
      
      const id = parseInt(compteRendu.IDCOMPTES?.[0] || '0')
      const codeCompte = compteRendu.CODE_COMPTE?.[0] || ''
      const contenu = compteRendu.CONTENU?.[0] || ''
      const titreEchodp = compteRendu.TITRE_ECHODP?.[0] || ''

      if (!id || !codeCompte) {
        console.warn(`Skipping invalid entry: ${JSON.stringify(compteRendu)}`)
        continue
      }

      // Upsert (insert or update)
      await prisma.compteRendu.upsert({
        where: { id },
        update: {
          codeCompte,
          contenu,
          titreEchodp
        },
        create: {
          id,
          codeCompte,
          contenu,
          titreEchodp
        }
      })

      console.log(`✅ Imported: ${codeCompte}`)
    }

    console.log('✅ Comptes Rendus import completed successfully!')
  } catch (error) {
    console.error('❌ Error importing comptes rendus:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the import
importComptesRendus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
