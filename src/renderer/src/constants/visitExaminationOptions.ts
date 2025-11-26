/**
 * Visit Examination Dropdown Options
 * Centralized configuration for all dropdown options used in NewVisitPage
 */

export const MOTIF_OPTIONS = [
  'Certificat',
  'BAV loin',
  'Bav loin',
  'FO',
  'RAS',
  'Bav de près',
  'Douleurs oculaires',
  'Calcul',
  'OR',
  'Contrôle',
  'Calcul OD',
  'Allergie',
  'Calcul OG',
  'Céphalées',
  'CalculOD',
  'Strabisme',
  'Larmoiement',
  'Picotement',
  'CalculOG',
  'Myodesopsie',
  'Céphalée',
  'BAV loin OD',
  'ORD',
  'BAV loin OG',
  'Pentacam',
  'CHZ',
  'Myodesopsie OD',
  'BAV de près',
  'Blepharospasme',
  'BAV',
  'Myodesopsie OG',
  'Flou visuel',
  'Larmoiement OD',
  'BAV loin ODG',
  'Controle',
  'Larmoiement OG',
  'OCT',
  'OR OG',
  'Douleurs oculaires OD',
  'Cataracte',
  'Phosphène',
  'Photophobie',
  'Sd sec',
  'BAV près',
  'Douleurs oculaires OG',
  'Sécrétions',
  'BAV loin OD',
  'Allergie',
  'Larmoiement',
  'Notion de strabisme'
]

export const CYCLOPLEGIE_OPTIONS = [
  'Aucune',
  'Atropine 0.3',
  'Atropine 0.5',
  'Atropine 1%',
  'Mydriaticum',
  'Skiacol',
  'Melange (M + N)'
]

export const SV_RIGHT_OPTIONS = [
  '01/10',
  '02/10',
  '03/10',
  '04/10',
  '05/10',
  '06/10',
  '07/10',
  '08/10',
  '09/10',
  '10/10',
  'CLD',
  'VBDB',
  'MDM',
  'PL+',
  'PL-',
  'Suit la lumière',
  'Ne suit pas la lumière',
  'Strabisme',
  'Micro-strabisme',
  'Nystagmus',
  'Amblyopie',
  'Ésotropie',
  'Exotropie',
  'Hypertropisie'
]

export const AV_RIGHT_OPTIONS = [
  '01/10',
  '02/10',
  '03/10',
  '04/10',
  '05/10',
  '06/10',
  '07/10',
  '08/10',
  '09/10',
  '10/10',
  'CLD',
  'MDM',
  'PL+',
  'PL-',
  'Amélioration',
  'Stable',
  'Dégradation',
  'Amblyopie résiduelle',
  'Vision corrigée'
]

export const SV_LEFT_OPTIONS = [
  '01/10',
  '02/10',
  '03/10',
  '04/10',
  '05/10',
  '06/10',
  '07/10',
  '08/10',
  '09/10',
  '10/10',
  'CLD',
  'MDM',
  'PL+',
  'PL-',
  'Suit la lumière',
  'Ne suit pas la lumière',
  'Strabisme',
  'Micro-strabisme',
  'Nystagmus',
  'Amblyopie',
  'Ésotropie',
  'Exotropie'
]

export const AV_LEFT_OPTIONS = [
  '01/10',
  '02/10',
  '03/10',
  '04/10',
  '05/10',
  '06/10',
  '07/10',
  '08/10',
  '09/10',
  '10/10',
  'CLD',
  'MDM',
  'PL+',
  'PL-',
  'Amélioration',
  'Stable',
  'Dégradation',
  'Amblyopie résiduelle',
  'Vision corrigée',
  'Hypertropisie',
  'Hypotropie',
  'Cyclotropie'
]

// Generate SPHÈRE options: -20.00 to +17.00 by 0.25
export const SPHERE_OPTIONS: string[] = []
for (let i = -20; i <= 17; i += 0.25) {
  const value = i.toFixed(2)
  SPHERE_OPTIONS.push(i >= 0 ? `+${value}` : value)
}

// Generate CYLINDRE options: -20.00 to +17.00 by 0.25
export const CYLINDRE_OPTIONS: string[] = []
for (let i = -20; i <= 17; i += 0.25) {
  const value = i.toFixed(2)
  CYLINDRE_OPTIONS.push(i >= 0 ? `+${value}` : value)
}

// Generate AXE options: 0° to 180° by 5°
export const AXE_OPTIONS: string[] = []
for (let i = 0; i <= 180; i += 5) {
  AXE_OPTIONS.push(`${i}`)
}

// GONIO options for Right Eye (VAD)
export const GONIO_RIGHT_OPTIONS = [
  'AIC normal',
  'AIC stade 3',
  'ouvert 3-4',
  'recession angulaire large',
  'recession angulaire minime',
  'no'
]

// GONIO options for Left Eye (VAG)
export const GONIO_LEFT_OPTIONS = [
  'AIC normal',
  'AIC fermé sur 360',
  'AIC fermé sur 270 degré',
  'AIC fermé sur 3/4',
  'ouvert 3-4'
]

// L.A.F options for Right Eye
export const LAF_RIGHT_OPTIONS = [
  'RAS',
  'Cat N ++',
  'Cat evo',
  'Pseudo simple',
  'Cat N +',
  'Conj allergique',
  'Cat N +++',
  'ET',
  'Conj all',
  'Cat II',
  'Cat ss cap ++',
  'Cat ss cap +',
  'Cat N dense',
  'KPS',
  'ICP',
  'sd sec',
  'XT',
  'Cat N ss cap',
  'cat evo',
  'Cat corticale',
  'Cat ss cap',
  'KPS+',
  'Cat corticale +',
  'Blepharite',
  'NORMAL',
  'ICP +',
  'Cat Post',
  'Cat mixte',
  'Chalazion',
  'Cat I'
]

// L.A.F options for Left Eye
export const LAF_LEFT_OPTIONS = [
  'RAS',
  'Cat N ++',
  'Cat evo',
  'Pseudo simple',
  'Cat N +',
  'Conj allergique',
  'Cat N +++',
  'ET',
  'Conj all',
  'Cat II',
  'Cat ss cap ++',
  'Cat ss cap +',
  'Cat N dense',
  'KPS',
  'ICP',
  'sd sec',
  'XT',
  'Cat N ss cap',
  'cat evo',
  'Cat corticale',
  'Cat ss cap',
  'KPS+',
  'Cat corticale +',
  'Blepharite',
  'NORMAL',
  'ICP +',
  'Cat Post',
  'Cat mixte',
  'Chalazion',
  'Cat I'
]

// F.O options for Right Eye
export const FO_RIGHT_OPTIONS = [
  'NORMAL',
  'RD -',
  'pas de rétinopathie diabétique',
  'Myopique',
  'RDNP modérée',
  'RDNP minime',
  'RAS',
  'C/D 0.8',
  'barrage d\' une lésion rétinienne',
  'C/D 0.9',
  'C/D 0.7',
  'pas de signe de rétinopathie...',
  'C/D 1',
  'RDPP',
  'C/D 0.6',
  'idem',
  'C/D 0.4',
  'RD non proliférante minime',
  'C/D 0.5',
  'C/D 0.3',
  'RAP',
  'HTA',
  'C/D 0.2',
  'atrophie',
  'DMLA',
  'Normal',
  'RD + barrage',
  'C/D 1.0'
]

// F.O options for Left Eye (same as right)
export const FO_LEFT_OPTIONS = FO_RIGHT_OPTIONS

// DIAG (Diagnosis) options
export const DIAG_OPTIONS = [
  'Conj allergiq',
  'Sd sec',
  'Conj allerg',
  'Rhinoconj allergiq',
  'Conj viral',
  'Conj ADV',
  'A',
  'V3m pas LPDR',
  'Conj bact',
  'Conj aller',
  'Conj all',
  'Conj',
  'Blepharite',
  'An',
  'Xt predomine OG',
  'Xt intermitente alternante',
  'Xt alternante predominant OG',
  'V3m pas LPDR diminution de phosphene',
  'Uveite ant',
  'Strabsisme convergent alternat',
  'Strabismùe convergent alternant',
  'Strabisme convergent predominant OG',
  'Strabisme convergent bilaterale predomin OG',
  'Strabisme convergent',
  'Strabisme alternant',
  'Stenose de VLN bilaterale',
  'Sd sec / blepharite'
]

// CONDUITE À TENIR shortcuts
export const CONDUITE_SHORTCUTS = [
  { code: 'OCT', label: 'Optical Coherence Tomography' },
  { code: 'CO', label: 'Correction Optique' },
  { code: 'TM', label: 'Traitement Médical' },
  { code: 'ET', label: 'Équilibre Tensionnel' },
  { code: 'EM', label: 'Équilibre Métabolique' },
  { code: 'FO', label: "Fond d'Œil" },
  { code: 'PIO', label: 'Pression Intra-Oculaire' },
  { code: 'TC OD', label: 'Traitement Chirurgical OD' },
  { code: 'TC OG', label: 'Traitement Chirurgical OG' },
  { code: 'TC ODG', label: 'Traitement Chirurgical ODG' },
  { code: 'Pentacam', label: 'Pentacam' },
  { code: 'PPR', label: 'PPR' },
  { code: 'PKE', label: 'PKE' },
  { code: 'YAG', label: 'YAG' }
]
