# Fresh Database Import Guide

## Overview
This guide explains how to create a **fresh database** with new data from XML files.

## ⚠️ IMPORTANT WARNING
**This will DELETE all existing data in your database!**
Make sure you have backups if needed.

## What Gets Imported

### 1. **patients.xml** → `patients` table
- Patient demographic information
- Names, addresses, phone numbers
- Medical history

### 2. **visits.xml** → `visit_examinations` table
- Patient visit history
- Examination results
- Refraction data (OD/OG)
- Diagnostic information

### 3. **payments.xml** → `honoraires` table
- Payment records
- Medical acts performed
- Fees collected

### 4. **ordononce.xml** → `ordonnances` table
Contains 3 types of data:
- 📝 **Prescriptions Médicales** (ORDONNANCE)
- 🧪 **Bilan** (BILAN, CERTIFICAT)
- 📄 **Comptes Rendus** (COMPTE RENDU)

**Note:** This does NOT import medicines or templates - only patient-specific prescription data.

## How to Use

### Option 1: Complete Fresh Import (RECOMMENDED)
Imports all 4 XML files in one command:

```bash
npm run db:fresh-import
```

This will:
1. ✅ Clear ALL existing data
2. ✅ Import patients from `patients.xml`
3. ✅ Import visits from `visits.xml`
4. ✅ Import payments from `payments.xml`
5. ✅ Import ordonnances from `ordononce.xml`
6. ✅ Show summary statistics

### Option 2: Individual Imports
If you want to import one XML file at a time:

```bash
# Import only patients
npm run db:import-patients

# Import only visits
npm run db:import-visits-xml

# Import only payments
npm run db:import-payments-xml

# Import only ordonnances
npm run db:import-ordonnances-xml
```

## Expected XML Files
Make sure these XML files exist in your project root:
- ✅ `patients.xml`
- ✅ `visits.xml`
- ✅ `payments.xml`
- ✅ `ordononce.xml`

## After Import

### 1. Verify the Data
The script will show you import statistics:
```
📊 Summary:
   - Patients: 1,234
   - Visits: 5,678
   - Payments: 2,345
   - Ordonnances: 3,456
```

### 2. Copy Database to Admin PC
After successful import, copy the database file:

**Location:** `/Applications/allah/prisma/dev.db`

**To:**
- Admin PC: `C:\Users\[Username]\AppData\Roaming\Thaziri\prisma\dev.db`
- Or Mac: `~/Library/Application Support/Thaziri/prisma/dev.db`

### 3. Restart Application
Restart Thaziri application on Admin PC to use the new database.

## What Doesn't Get Imported

The following are NOT imported (they remain unchanged):
- ❌ Medicines list (`medicines` table)
- ❌ Quantities (`quantities` table)
- ❌ Comptes Rendus templates (`comptes_rendus` table)
- ❌ Users and authentication
- ❌ Message templates
- ❌ Application settings

These tables are managed separately and don't need to be reimported.

## Troubleshooting

### "XML file not found"
Make sure all 4 XML files are in the project root folder:
```
/Applications/allah/
  ├── patients.xml
  ├── visits.xml
  ├── payments.xml
  └── ordononce.xml
```

### "Import failed"
- Check that XML files are valid WINDEV format
- Make sure database is not locked (close application)
- Check console for specific error messages

### "No records imported"
- Verify XML files contain data
- Check XML structure matches expected format
- Look for skipped records in the console output

## Technical Details

### Database Tables Modified
- `patients` (cleared and reimported)
- `visit_examinations` (cleared and reimported)
- `honoraires` (cleared and reimported)
- `ordonnances` (cleared and reimported)

### Tables NOT Modified
- `medicines`
- `quantities`
- `comptes_rendus`
- `users`
- `message_templates`
- `user_messages`
- All other tables remain unchanged

### Import Performance
- Patients: ~50-100 per second
- Visits: ~50-100 per second
- Payments: ~50-100 per second
- Ordonnances: ~50-100 per second

**Typical import time for 10,000 records: ~2-5 minutes**

## Support

If you encounter issues:
1. Check console output for error messages
2. Verify XML file format
3. Ensure database permissions
4. Check available disk space

---

**Last Updated:** November 29, 2024
**Version:** 1.0
