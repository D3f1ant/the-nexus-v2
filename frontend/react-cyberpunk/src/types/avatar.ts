// ─── Enums / Union Types ──────────────────────────────────────────────────────

export type Species =
  | 'human' | 'minotaur' | 'phoenixkin' | 'kitsune' | 'dragonkin'
  | 'dogpeople' | 'catpeople' | 'lizardpeople' | 'birdpeople'
  | 'fishpeople' | 'centaur'

export type Gender = 'masculine' | 'feminine' | 'androgynous' | 'other'

export type HairShape = 'straight' | 'wavy' | 'curly' | 'coils' | 'locs'

export type PupilType = 'round' | 'slit' | 'goat' | 'compound' | 'void'

export type LinerStyle = 'none' | 'thin' | 'dramatic' | 'lower' | 'full'

export type ScarType = 'slash' | 'burn' | 'ritual'

export type ScarPlacement =
  | 'left_cheek' | 'right_cheek' | 'forehead' | 'chin' | 'neck'
  | 'chest' | 'left_arm' | 'right_arm' | 'abdomen' | 'back'

export type TalonType = 'sharp' | 'curved' | 'blunt'
export type BeakShape = 'hooked' | 'straight' | 'wide'
export type TailType = 'long' | 'bushy' | 'stub' | 'ringed'
export type ScalePattern = 'smooth' | 'keeled' | 'plated' | 'diamond' | 'iridescent' | 'spotted' | 'striped'
export type ClawType = 'sharp' | 'blunt' | 'retractile'
export type FinType = 'pectoral' | 'caudal' | 'both'
export type TailShape = 'fan' | 'forked' | 'pointed'
export type HoofType = 'cloven' | 'solid' | 'feathered'
export type CybernетicIntensity = 0 | 1 | 2 | 3

// ─── Facial Morphs (35 sliders, all -1.0 to 1.0) ─────────────────────────────

export interface FacialMorphs {
  // Brow
  browHeight: number
  browWidth: number
  browArch: number
  browInnerAngle: number
  browOuterAngle: number
  // Eyes
  eyeSize: number
  eyeSpacing: number
  eyeTilt: number
  eyeDepth: number
  upperEyelidCurve: number
  lowerEyelidCurve: number
  infraorbitalPuff: number
  orbitalRim: number
  // Nose
  noseWidth: number
  noseLength: number
  noseBridge: number
  nasalTipProjection: number
  alaWidth: number
  // Jaw & chin
  jawWidth: number
  jawRoundness: number
  mandibleAngle: number
  chinProjection: number
  mentalProjection: number
  // Cheeks & temples
  cheekboneProminence: number
  zygomaticArch: number
  templeWidth: number
  // Lips
  lipFullnessUpper: number
  lipFullnessLower: number
  // Forehead
  foreheadHeight: number
  philtrumLength: number
  // Ears
  earSize: number
  earPosition: number
  // Face proportions
  faceWidthAtEyes: number
  faceWidthAtCheeks: number
  faceWidthAtJaw: number
}

// ─── Body Morphs (0.0 to 1.0 unless noted) ───────────────────────────────────

export interface BodyMorphs {
  height: number       // 0–1
  weight: number       // 0–1
  muscleMass: number   // -1–1
  bust: number         // -1–1
  waist: number        // -1–1 (negative = narrower)
  hips: number         // -1–1
  shoulderWidth: number
  thigh: number
  butt: number
}

// ─── Hair ─────────────────────────────────────────────────────────────────────

export interface HairConfig {
  length: number          // 0–1
  shape: HairShape
  color: string           // hex
  highlightColor: string  // hex
  beardLength: number     // 0–1 (0 = none)
  beardColor: string      // hex
}

// ─── Eyes ─────────────────────────────────────────────────────────────────────

export interface EyeConfig {
  color: string           // hex (32 preset options)
  pupilType: PupilType
}

// ─── Makeup ───────────────────────────────────────────────────────────────────

export interface MakeupConfig {
  eyeshadowColor: string
  eyeshadowDensity: number    // 0–1
  blushColor: string
  blushDensity: number        // 0–1
  contour: number             // 0–1
  highlight: number           // 0–1
  linerStyle: LinerStyle
}

// ─── Tattoos ──────────────────────────────────────────────────────────────────

export interface TattooConfig {
  face: boolean
  faceStyle: string
  body: boolean
  bodyStyle: string
  gangMarking: boolean
  gangMarkingStyle: string
}

// ─── Scars ────────────────────────────────────────────────────────────────────

export interface ScarConfig {
  type: ScarType
  placement: ScarPlacement
}

// ─── Piercings ────────────────────────────────────────────────────────────────

export interface PiercingConfig {
  ears: boolean
  nose: boolean
  lip: boolean
  brow: boolean
}

// ─── Cybernetics ──────────────────────────────────────────────────────────────

export interface CyberneticsConfig {
  arms: boolean;    armsIntensity: CybernетicIntensity
  eyes: boolean;    eyesIntensity: CybernетicIntensity
  ears: boolean;    earsIntensity: CybernетicIntensity
  hands: boolean;   handsIntensity: CybernетicIntensity
  legs: boolean;    legsIntensity: CybernетicIntensity
  feet: boolean;    feetIntensity: CybernетicIntensity
  torso: boolean;   torsoIntensity: CybernетicIntensity
  head: boolean;    headIntensity: CybernетicIntensity
}

// ─── Species-Specific Features ───────────────────────────────────────────────

export interface AvianFeatures {
  wingSize: number        // 0–1
  wingspan: number        // 0–1
  tailFeathers: number    // 0–1
  crest: number           // 0–1
  talonType: TalonType
  beakShape: BeakShape
  // cybernetic add-ons
  cyberWings: boolean
  cyberTalons: boolean
  cyberBeak: boolean
}

export interface FelidCanidFeatures {
  furDensity: number      // 0–1
  furColor: string        // hex
  whiskers: boolean
  clawLength: number      // 0–1
  tailType: TailType
  tailLength: number      // 0–1
  earPosition: number     // -1 to 1 (forward to flat)
  // cybernetic
  cyberClaws: boolean
  cyberTail: boolean
}

export interface ReptilianFeatures {
  scalePattern: ScalePattern
  scaleColor: string      // hex
  clawType: ClawType
  tailLength: number      // 0–1
  crest: boolean
  frills: boolean
  // cybernetic
  cyberScales: boolean
  cyberClaws: boolean
  cyberTail: boolean
  cyberCrest: boolean
}

export interface AquaticFeatures {
  scalePattern: ScalePattern
  scaleColor: string      // hex
  finType: FinType
  tailShape: TailShape
  gillVisibility: number  // 0–1
  dorsalFin: boolean
  // cybernetic
  cyberFins: boolean
  cyberTail: boolean
  cyberGills: boolean
  cyberDorsal: boolean
}

export interface MinotaurFeatures {
  hornSize: number        // 0–1
  hornCurve: number       // -1 to 1
  maneLength: number      // 0–1
  maneColor: string       // hex
  hoofType: HoofType
  furDensity: number      // 0–1
  furColor: string        // hex
  tail: boolean
  fangSize: number        // 0–1
  snoutProminence: number // 0–1
  // cybernetic
  cyberHorns: boolean
  cyberHooves: boolean
}

export interface CentaurFeatures {
  horseBodyColor: string  // hex
  maneLength: number      // 0–1
  maneColor: string       // hex
  hoofType: HoofType
  withers: number         // 0–1 (prominence)
  crest: number           // 0–1
  tailLength: number      // 0–1
  // cybernetic
  cyberHooves: boolean
  cyberWithers: boolean
}

export interface SpeciesFeatures {
  avian?: AvianFeatures
  felidCanid?: FelidCanidFeatures
  reptilian?: ReptilianFeatures
  aquatic?: AquaticFeatures
  minotaur?: MinotaurFeatures
  centaur?: CentaurFeatures
}

// ─── Accessories ──────────────────────────────────────────────────────────────

export interface AccessoryItem {
  id: string
  color: string           // hex
  style: string           // style variant name
  enabled: boolean
}

export interface AccessoriesConfig {
  head: AccessoryItem     // hat/helmet/crown
  face: AccessoryItem     // mask/glasses/visor
  neck: AccessoryItem     // collar/necklace/choker
  torso: AccessoryItem    // shirt/jacket/armour
  waist: AccessoryItem    // belt/sash/skirt
  legs: AccessoryItem     // pants/shorts/leggings
  feet: AccessoryItem     // boots/sandals/greaves
  leftHand: AccessoryItem // glove/gauntlet/ring
  rightHand: AccessoryItem
  back: AccessoryItem     // cape/wings overlay/backpack
}

// ─── Root Avatar Config ───────────────────────────────────────────────────────

export interface AvatarConfig {
  version: 2
  species: Species
  gender: Gender
  facialMorphs: FacialMorphs
  body: BodyMorphs
  skinColor: string       // hex (80 preset options)
  skinShine: number       // 0–1
  hair: HairConfig
  eyes: EyeConfig
  lipType: number         // 0–17 index
  nailType: number        // 0–17 index
  makeup: MakeupConfig
  tattoos: TattooConfig
  scars: ScarConfig[]
  piercings: PiercingConfig
  cybernetics: CyberneticsConfig
  speciesFeatures: SpeciesFeatures
  accessories: AccessoriesConfig
}

// ─── Crest Config (auto-generated, not user-editable) ────────────────────────

export type ShieldShape = 'heater' | 'kite' | 'oval' | 'baroque' | 'cartouche'
export type BorderStyle = 'double' | 'thorned' | 'circuit' | 'plain'

export interface CrestConfig {
  shieldShape: ShieldShape
  primaryColor: string
  secondaryColor: string
  sigilAngles: number[]   // 8 angles in radians
  speciesSymbol: Species
  borderStyle: BorderStyle
}

// ─── Skin Palette (80 colors) ────────────────────────────────────────────────

export const SKIN_PALETTE: string[] = [
  // Fair
  '#fde8d8','#fddcca','#fccfba','#fbc3ab','#fab79c','#f9ab8d',
  '#f89f7e','#f7936f','#f68760','#f57b51',
  // Medium
  '#e8b89a','#d9a687','#ca9474','#bb8261','#ac704e','#9d5e3b',
  '#8e4c28','#7f3a15','#a0724f','#b0855e',
  // Deep
  '#8b5e3c','#7a4f2f','#694022','#583115','#472208','#6b3f2a',
  '#5c3020','#4d2110','#3e1200','#2f0300',
  // Golden / olive
  '#e8c99a','#d4b480','#c09f66','#ac8a4c','#987532','#846018',
  '#704b00','#c8a87a','#b49060','#a07846',
  // Reddish
  '#c87860','#b46848','#a05830','#8c4818','#783800','#d48070',
  '#c07060','#ac6050','#985040','#844030',
  // Fantasy — ethereal blues/purples
  '#a0b8d8','#8898b8','#707898','#585878','#404058','#8080c0',
  '#6060a0','#404080','#202060','#000040',
  // Fantasy — greens
  '#90c890','#70a870','#508850','#306830','#104810','#a0d8a0',
  '#80b880','#609860','#407840','#205820',
  // Fantasy — golds/metallics
  '#ffd700','#e8c000','#d0a900','#b89200','#a07b00','#c8b060',
  '#b09040','#987020','#805000','#683000',
]

// ─── Eye Colors (32) ─────────────────────────────────────────────────────────

export const EYE_COLORS: string[] = [
  '#4a7c59','#2d5a27','#6b8e23','#3d6b21',
  '#3b5998','#1e3a8a','#60a5fa','#93c5fd',
  '#8b4513','#6b3a2a','#a0522d','#d2691e',
  '#808080','#a9a9a9','#d3d3d3','#f5f5f5',
  '#8b0000','#dc143c','#ff4500','#ff6347',
  '#9400d3','#8b008b','#da70d6','#ee82ee',
  '#ffd700','#ffa500','#ff8c00','#daa520',
  '#00ced1','#00bfff','#1e90ff','#000000',
]

// ─── Lip Types (18) ──────────────────────────────────────────────────────────

export const LIP_TYPES = [
  'natural','full','thin','cupids_bow','pouty','wide',
  'downturned','upturned','heart','defined',
  'angular','soft','dramatic','subtle','asymmetric',
  'glossy','matte','sculpted',
] as const

// ─── Nail Types (18) ─────────────────────────────────────────────────────────

export const NAIL_TYPES = [
  'natural','square','oval','almond','stiletto','coffin',
  'ballerina','flare','lipstick','arrowhead',
  'edge','mountain_peak','squoval','round','pointed',
  'short','long','extra_long',
] as const

// ─── Default Config ───────────────────────────────────────────────────────────

const zeroCybernetics: CyberneticsConfig = {
  arms: false, armsIntensity: 0,
  eyes: false, eyesIntensity: 0,
  ears: false, earsIntensity: 0,
  hands: false, handsIntensity: 0,
  legs: false, legsIntensity: 0,
  feet: false, feetIntensity: 0,
  torso: false, torsoIntensity: 0,
  head: false, headIntensity: 0,
}

const defaultAccessoryItem: AccessoryItem = { id: 'none', color: '#888888', style: 'default', enabled: false }

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  version: 2,
  species: 'human',
  gender: 'androgynous',
  facialMorphs: {
    browHeight: 0, browWidth: 0, browArch: 0, browInnerAngle: 0, browOuterAngle: 0,
    eyeSize: 0, eyeSpacing: 0, eyeTilt: 0, eyeDepth: 0,
    upperEyelidCurve: 0, lowerEyelidCurve: 0, infraorbitalPuff: 0, orbitalRim: 0,
    noseWidth: 0, noseLength: 0, noseBridge: 0, nasalTipProjection: 0, alaWidth: 0,
    jawWidth: 0, jawRoundness: 0, mandibleAngle: 0, chinProjection: 0, mentalProjection: 0,
    cheekboneProminence: 0, zygomaticArch: 0, templeWidth: 0,
    lipFullnessUpper: 0, lipFullnessLower: 0,
    foreheadHeight: 0, philtrumLength: 0,
    earSize: 0, earPosition: 0,
    faceWidthAtEyes: 0, faceWidthAtCheeks: 0, faceWidthAtJaw: 0,
  },
  body: {
    height: 0.5, weight: 0.5, muscleMass: 0,
    bust: 0, waist: 0, hips: 0,
    shoulderWidth: 0, thigh: 0, butt: 0,
  },
  skinColor: '#c8a882',
  skinShine: 0.3,
  hair: { length: 0.5, shape: 'straight', color: '#1a1a1a', highlightColor: '#333333', beardLength: 0, beardColor: '#1a1a1a' },
  eyes: { color: '#4a7c59', pupilType: 'round' },
  lipType: 0,
  nailType: 0,
  makeup: {
    eyeshadowColor: '#000000', eyeshadowDensity: 0,
    blushColor: '#ff9999', blushDensity: 0,
    contour: 0, highlight: 0, linerStyle: 'none',
  },
  tattoos: { face: false, faceStyle: '', body: false, bodyStyle: '', gangMarking: false, gangMarkingStyle: '' },
  scars: [],
  piercings: { ears: false, nose: false, lip: false, brow: false },
  cybernetics: zeroCybernetics,
  speciesFeatures: {},
  accessories: {
    head: { ...defaultAccessoryItem },
    face: { ...defaultAccessoryItem },
    neck: { ...defaultAccessoryItem },
    torso: { ...defaultAccessoryItem },
    waist: { ...defaultAccessoryItem },
    legs: { ...defaultAccessoryItem },
    feet: { ...defaultAccessoryItem },
    leftHand: { ...defaultAccessoryItem },
    rightHand: { ...defaultAccessoryItem },
    back: { ...defaultAccessoryItem },
  },
}
