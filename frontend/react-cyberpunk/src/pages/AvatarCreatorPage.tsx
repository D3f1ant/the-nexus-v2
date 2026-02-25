import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AvatarRenderer from '../components/AvatarRenderer'
import {
  AvatarConfig, DEFAULT_AVATAR_CONFIG, SKIN_PALETTE, EYE_COLORS,
  LIP_TYPES, NAIL_TYPES, Species, Gender, HairShape, PupilType, LinerStyle,
  ScarType, ScarPlacement, TalonType, BeakShape, TailType, ScalePattern,
  ClawType, FinType, TailShape, HoofType,
} from '../types/avatar'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// ─── Style constants ──────────────────────────────────────────────────────────

const green = '#00ff88'
const teal = '#00ffd5'
const gold = '#fbbf24'
const dim = '#333'
const dimText = '#555'

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '10px' }
const row: React.CSSProperties = { display: 'flex', gap: '8px', alignItems: 'center' }

const labelStyle: React.CSSProperties = {
  fontSize: '10px', color: dimText, letterSpacing: '2px', marginBottom: '2px',
}

const sectionTitle: React.CSSProperties = {
  fontSize: '11px', color: teal, letterSpacing: '3px', borderBottom: `1px solid ${dim}`,
  paddingBottom: '6px', marginBottom: '4px',
}

// ─── Primitive controls ───────────────────────────────────────────────────────

function Slider({ label, value, min = -1, max = 1, step = 0.01, onChange }: {
  label: string; value: number; min?: number; max?: number; step?: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div style={{ ...row, justifyContent: 'space-between' }}>
        <span style={labelStyle}>{label}</span>
        <span style={{ ...labelStyle, color: green }}>{value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: green, height: '2px', cursor: 'pointer' }}
      />
    </div>
  )
}

function Toggle({ label, value, onChange, accent = green }: {
  label: string; value: boolean; onChange: (v: boolean) => void; accent?: string
}) {
  return (
    <div style={{ ...row, justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => onChange(!value)}>
      <span style={{ ...labelStyle, marginBottom: 0 }}>{label}</span>
      <div style={{
        width: '28px', height: '14px', borderRadius: '7px',
        background: value ? accent : dim, position: 'relative', transition: 'background 0.2s',
      }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%', background: '#fff',
          position: 'absolute', top: '2px', left: value ? '16px' : '2px', transition: 'left 0.2s',
        }} />
      </div>
    </div>
  )
}

function Select<T extends string>({ label, value, options, onChange, accent = green }: {
  label: string; value: T; options: readonly T[] | T[]; onChange: (v: T) => void; accent?: string
}) {
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        style={{
          background: 'transparent', border: `1px solid ${dim}`, color: accent,
          padding: '6px 8px', fontFamily: 'monospace', fontSize: '12px',
          width: '100%', outline: 'none', cursor: 'pointer',
        }}
      >
        {options.map(o => <option key={o} value={o} style={{ background: '#0a0a0a' }}>{o}</option>)}
      </select>
    </div>
  )
}

function ColorPalette({ label, value, palette, onChange }: {
  label: string; value: string; palette: string[]; onChange: (v: string) => void
}) {
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
        {palette.map(c => (
          <div
            key={c}
            onClick={() => onChange(c)}
            style={{
              width: '18px', height: '18px', background: c, borderRadius: '2px', cursor: 'pointer',
              border: value === c ? `2px solid ${green}` : '2px solid transparent',
              boxShadow: value === c ? `0 0 6px ${c}` : 'none',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function ColorPicker({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div style={{ ...row, justifyContent: 'space-between' }}>
      <span style={labelStyle}>{label}</span>
      <input
        type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '36px', height: '24px', border: 'none', background: 'none', cursor: 'pointer' }}
      />
    </div>
  )
}

function IntensitySelect({ label, value, onChange, accent = green }: {
  label: string; value: 0 | 1 | 2 | 3; onChange: (v: 0 | 1 | 2 | 3) => void; accent?: string
}) {
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <div style={{ ...row }}>
        {([0, 1, 2, 3] as const).map(i => (
          <button
            key={i}
            onClick={() => onChange(i)}
            style={{
              flex: 1, padding: '4px 0', fontSize: '11px', fontFamily: 'monospace',
              background: 'transparent', border: `1px solid ${value === i ? accent : dim}`,
              color: value === i ? accent : dimText, cursor: 'pointer',
            }}
          >{i === 0 ? 'OFF' : `L${i}`}</button>
        ))}
      </div>
    </div>
  )
}

// ─── Tab panels ───────────────────────────────────────────────────────────────

function TabIdentity({ cfg, set }: { cfg: AvatarConfig; set: (patch: Partial<AvatarConfig>) => void }) {
  const speciesList: Species[] = ['human', 'minotaur', 'phoenixkin', 'kitsune', 'dragonkin',
    'dogpeople', 'catpeople', 'lizardpeople', 'birdpeople', 'fishpeople', 'centaur']
  const genderList: Gender[] = ['masculine', 'feminine', 'androgynous', 'other']

  return (
    <div style={col}>
      <p style={sectionTitle}>SPECIES</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {speciesList.map(s => (
          <button
            key={s}
            onClick={() => set({ species: s })}
            style={{
              padding: '6px 12px', fontSize: '11px', fontFamily: 'monospace',
              background: 'transparent', cursor: 'pointer',
              border: `1px solid ${cfg.species === s ? teal : dim}`,
              color: cfg.species === s ? teal : dimText,
            }}
          >{s.toUpperCase()}</button>
        ))}
      </div>
      <p style={{ ...sectionTitle, marginTop: '12px' }}>GENDER EXPRESSION</p>
      <div style={{ ...row, flexWrap: 'wrap', gap: '6px' }}>
        {genderList.map(g => (
          <button
            key={g}
            onClick={() => set({ gender: g })}
            style={{
              flex: 1, padding: '6px', fontSize: '11px', fontFamily: 'monospace',
              background: 'transparent', cursor: 'pointer',
              border: `1px solid ${cfg.gender === g ? green : dim}`,
              color: cfg.gender === g ? green : dimText,
            }}
          >{g.toUpperCase()}</button>
        ))}
      </div>
    </div>
  )
}

function TabFace({ cfg, set }: { cfg: AvatarConfig; set: (patch: Partial<AvatarConfig>) => void }) {
  const fm = cfg.facialMorphs
  const patch = (k: keyof typeof fm, v: number) => set({ facialMorphs: { ...fm, [k]: v } })

  return (
    <div style={col}>
      <p style={sectionTitle}>BROW</p>
      <Slider label="HEIGHT" value={fm.browHeight} onChange={v => patch('browHeight', v)} />
      <Slider label="WIDTH" value={fm.browWidth} onChange={v => patch('browWidth', v)} />
      <Slider label="ARCH" value={fm.browArch} onChange={v => patch('browArch', v)} />
      <Slider label="INNER ANGLE" value={fm.browInnerAngle} onChange={v => patch('browInnerAngle', v)} />
      <Slider label="OUTER ANGLE" value={fm.browOuterAngle} onChange={v => patch('browOuterAngle', v)} />

      <p style={sectionTitle}>EYES</p>
      <Slider label="SIZE" value={fm.eyeSize} onChange={v => patch('eyeSize', v)} />
      <Slider label="SPACING" value={fm.eyeSpacing} onChange={v => patch('eyeSpacing', v)} />
      <Slider label="TILT" value={fm.eyeTilt} onChange={v => patch('eyeTilt', v)} />
      <Slider label="DEPTH" value={fm.eyeDepth} onChange={v => patch('eyeDepth', v)} />
      <Slider label="UPPER LID CURVE" value={fm.upperEyelidCurve} onChange={v => patch('upperEyelidCurve', v)} />
      <Slider label="LOWER LID CURVE" value={fm.lowerEyelidCurve} onChange={v => patch('lowerEyelidCurve', v)} />
      <Slider label="INFRAORBITAL PUFF" value={fm.infraorbitalPuff} onChange={v => patch('infraorbitalPuff', v)} />
      <Slider label="ORBITAL RIM" value={fm.orbitalRim} onChange={v => patch('orbitalRim', v)} />

      <p style={sectionTitle}>NOSE</p>
      <Slider label="WIDTH" value={fm.noseWidth} onChange={v => patch('noseWidth', v)} />
      <Slider label="LENGTH" value={fm.noseLength} onChange={v => patch('noseLength', v)} />
      <Slider label="BRIDGE" value={fm.noseBridge} onChange={v => patch('noseBridge', v)} />
      <Slider label="TIP PROJECTION" value={fm.nasalTipProjection} onChange={v => patch('nasalTipProjection', v)} />
      <Slider label="ALA WIDTH" value={fm.alaWidth} onChange={v => patch('alaWidth', v)} />

      <p style={sectionTitle}>JAW & CHIN</p>
      <Slider label="JAW WIDTH" value={fm.jawWidth} onChange={v => patch('jawWidth', v)} />
      <Slider label="JAW ROUNDNESS" value={fm.jawRoundness} onChange={v => patch('jawRoundness', v)} />
      <Slider label="MANDIBLE ANGLE" value={fm.mandibleAngle} onChange={v => patch('mandibleAngle', v)} />
      <Slider label="CHIN PROJECTION" value={fm.chinProjection} onChange={v => patch('chinProjection', v)} />
      <Slider label="MENTAL PROJECTION" value={fm.mentalProjection} onChange={v => patch('mentalProjection', v)} />

      <p style={sectionTitle}>CHEEKS & TEMPLES</p>
      <Slider label="CHEEKBONE" value={fm.cheekboneProminence} onChange={v => patch('cheekboneProminence', v)} />
      <Slider label="ZYGOMATIC ARCH" value={fm.zygomaticArch} onChange={v => patch('zygomaticArch', v)} />
      <Slider label="TEMPLE WIDTH" value={fm.templeWidth} onChange={v => patch('templeWidth', v)} />

      <p style={sectionTitle}>LIPS & FOREHEAD</p>
      <Slider label="UPPER LIP FULLNESS" value={fm.lipFullnessUpper} onChange={v => patch('lipFullnessUpper', v)} />
      <Slider label="LOWER LIP FULLNESS" value={fm.lipFullnessLower} onChange={v => patch('lipFullnessLower', v)} />
      <Slider label="FOREHEAD HEIGHT" value={fm.foreheadHeight} onChange={v => patch('foreheadHeight', v)} />
      <Slider label="PHILTRUM LENGTH" value={fm.philtrumLength} onChange={v => patch('philtrumLength', v)} />

      <p style={sectionTitle}>EARS</p>
      <Slider label="EAR SIZE" value={fm.earSize} onChange={v => patch('earSize', v)} />
      <Slider label="EAR POSITION" value={fm.earPosition} onChange={v => patch('earPosition', v)} />

      <p style={sectionTitle}>FACE PROPORTIONS</p>
      <Slider label="WIDTH AT EYES" value={fm.faceWidthAtEyes} onChange={v => patch('faceWidthAtEyes', v)} />
      <Slider label="WIDTH AT CHEEKS" value={fm.faceWidthAtCheeks} onChange={v => patch('faceWidthAtCheeks', v)} />
      <Slider label="WIDTH AT JAW" value={fm.faceWidthAtJaw} onChange={v => patch('faceWidthAtJaw', v)} />
    </div>
  )
}

function TabBody({ cfg, set }: { cfg: AvatarConfig; set: (patch: Partial<AvatarConfig>) => void }) {
  const b = cfg.body
  const patch = (k: keyof typeof b, v: number) => set({ body: { ...b, [k]: v } })

  return (
    <div style={col}>
      <p style={sectionTitle}>PROPORTIONS</p>
      <Slider label="HEIGHT" value={b.height} min={0} max={1} onChange={v => patch('height', v)} />
      <Slider label="WEIGHT" value={b.weight} min={0} max={1} onChange={v => patch('weight', v)} />
      <Slider label="MUSCLE MASS" value={b.muscleMass} onChange={v => patch('muscleMass', v)} />
      <Slider label="SHOULDER WIDTH" value={b.shoulderWidth} onChange={v => patch('shoulderWidth', v)} />

      <p style={sectionTitle}>LOWER BODY</p>
      <Slider label="BUST" value={b.bust} onChange={v => patch('bust', v)} />
      <Slider label="WAIST" value={b.waist} onChange={v => patch('waist', v)} />
      <Slider label="HIPS" value={b.hips} onChange={v => patch('hips', v)} />
      <Slider label="THIGH" value={b.thigh} onChange={v => patch('thigh', v)} />
      <Slider label="BUTT" value={b.butt} onChange={v => patch('butt', v)} />
    </div>
  )
}

function TabSkin({ cfg, set }: { cfg: AvatarConfig; set: (patch: Partial<AvatarConfig>) => void }) {
  return (
    <div style={col}>
      <p style={sectionTitle}>SKIN COLOR</p>
      <ColorPalette label="" value={cfg.skinColor} palette={SKIN_PALETTE} onChange={v => set({ skinColor: v })} />
      <ColorPicker label="CUSTOM" value={cfg.skinColor} onChange={v => set({ skinColor: v })} />
      <Slider label="SKIN SHINE" value={cfg.skinShine} min={0} max={1} onChange={v => set({ skinShine: v })} />
    </div>
  )
}

function TabHair({ cfg, set }: { cfg: AvatarConfig; set: (patch: Partial<AvatarConfig>) => void }) {
  const h = cfg.hair
  const patch = (k: keyof typeof h, v: string | number) => set({ hair: { ...h, [k]: v } })
  const shapes: HairShape[] = ['straight', 'wavy', 'curly', 'coils', 'locs']

  return (
    <div style={col}>
      <p style={sectionTitle}>HAIR</p>
      <Slider label="LENGTH" value={h.length} min={0} max={1} onChange={v => patch('length', v)} />
      <Select label="SHAPE" value={h.shape} options={shapes} onChange={v => patch('shape', v)} />
      <ColorPicker label="COLOR" value={h.color} onChange={v => patch('color', v)} />
      <ColorPicker label="HIGHLIGHT" value={h.highlightColor} onChange={v => patch('highlightColor', v)} />

      <p style={sectionTitle}>BEARD / FACIAL HAIR</p>
      <Slider label="BEARD LENGTH" value={h.beardLength} min={0} max={1} onChange={v => patch('beardLength', v)} />
      <ColorPicker label="BEARD COLOR" value={h.beardColor} onChange={v => patch('beardColor', v)} />
    </div>
  )
}

function TabEyes({ cfg, set }: { cfg: AvatarConfig; set: (patch: Partial<AvatarConfig>) => void }) {
  const e = cfg.eyes
  const pupils: PupilType[] = ['round', 'slit', 'goat', 'compound', 'void']
  const lipTypes = LIP_TYPES as unknown as readonly string[]
  const nailTypes = NAIL_TYPES as unknown as readonly string[]

  return (
    <div style={col}>
      <p style={sectionTitle}>EYES</p>
      <ColorPalette label="EYE COLOR" value={e.color} palette={EYE_COLORS} onChange={v => set({ eyes: { ...e, color: v } })} />
      <ColorPicker label="CUSTOM" value={e.color} onChange={v => set({ eyes: { ...e, color: v } })} />
      <Select label="PUPIL TYPE" value={e.pupilType} options={pupils}
        onChange={v => set({ eyes: { ...e, pupilType: v } })} />

      <p style={sectionTitle}>LIPS</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {lipTypes.map((t, i) => (
          <button key={t} onClick={() => set({ lipType: i })} style={{
            padding: '4px 8px', fontSize: '10px', fontFamily: 'monospace', cursor: 'pointer',
            background: 'transparent', border: `1px solid ${cfg.lipType === i ? gold : dim}`,
            color: cfg.lipType === i ? gold : dimText,
          }}>{t}</button>
        ))}
      </div>

      <p style={sectionTitle}>NAILS</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {nailTypes.map((t, i) => (
          <button key={t} onClick={() => set({ nailType: i })} style={{
            padding: '4px 8px', fontSize: '10px', fontFamily: 'monospace', cursor: 'pointer',
            background: 'transparent', border: `1px solid ${cfg.nailType === i ? gold : dim}`,
            color: cfg.nailType === i ? gold : dimText,
          }}>{t}</button>
        ))}
      </div>
    </div>
  )
}

function TabMakeup({ cfg, set }: { cfg: AvatarConfig; set: (patch: Partial<AvatarConfig>) => void }) {
  const m = cfg.makeup
  const patch = (k: keyof typeof m, v: string | number) => set({ makeup: { ...m, [k]: v } })
  const liners: LinerStyle[] = ['none', 'thin', 'dramatic', 'lower', 'full']

  return (
    <div style={col}>
      <p style={sectionTitle}>EYESHADOW</p>
      <ColorPicker label="COLOR" value={m.eyeshadowColor} onChange={v => patch('eyeshadowColor', v)} />
      <Slider label="DENSITY" value={m.eyeshadowDensity} min={0} max={1} onChange={v => patch('eyeshadowDensity', v)} />

      <p style={sectionTitle}>BLUSH</p>
      <ColorPicker label="COLOR" value={m.blushColor} onChange={v => patch('blushColor', v)} />
      <Slider label="DENSITY" value={m.blushDensity} min={0} max={1} onChange={v => patch('blushDensity', v)} />

      <p style={sectionTitle}>CONTOUR & HIGHLIGHT</p>
      <Slider label="CONTOUR" value={m.contour} min={0} max={1} onChange={v => patch('contour', v)} />
      <Slider label="HIGHLIGHT" value={m.highlight} min={0} max={1} onChange={v => patch('highlight', v)} />

      <p style={sectionTitle}>LINER</p>
      <div style={{ ...row, flexWrap: 'wrap', gap: '6px' }}>
        {liners.map(l => (
          <button key={l} onClick={() => patch('linerStyle', l)} style={{
            flex: 1, padding: '5px', fontSize: '10px', fontFamily: 'monospace', cursor: 'pointer',
            background: 'transparent', border: `1px solid ${m.linerStyle === l ? green : dim}`,
            color: m.linerStyle === l ? green : dimText,
          }}>{l.toUpperCase()}</button>
        ))}
      </div>
    </div>
  )
}

function TabAugments({ cfg, set }: { cfg: AvatarConfig; set: (patch: Partial<AvatarConfig>) => void }) {
  const cy = cfg.cybernetics
  const patch = (k: keyof typeof cy, v: boolean | (0 | 1 | 2 | 3)) =>
    set({ cybernetics: { ...cy, [k]: v } })

  const parts: Array<{ label: string; key: 'arms' | 'eyes' | 'ears' | 'hands' | 'legs' | 'feet' | 'torso' | 'head' }> = [
    { label: 'ARMS', key: 'arms' }, { label: 'EYES', key: 'eyes' },
    { label: 'EARS', key: 'ears' }, { label: 'HANDS', key: 'hands' },
    { label: 'LEGS', key: 'legs' }, { label: 'FEET', key: 'feet' },
    { label: 'TORSO', key: 'torso' }, { label: 'HEAD', key: 'head' },
  ]

  return (
    <div style={col}>
      <p style={sectionTitle}>CYBERNETICS / ROBOTICS</p>
      {parts.map(({ label, key }) => {
        const intensityKey = `${key}Intensity` as keyof typeof cy
        return (
          <div key={key} style={{ padding: '8px', border: `1px solid ${cy[key] ? teal + '40' : dim}`, marginBottom: '2px' }}>
            <Toggle label={label} value={cy[key] as boolean} onChange={v => patch(key, v)} accent={teal} />
            {cy[key] && (
              <div style={{ marginTop: '8px' }}>
                <IntensitySelect
                  label="INTENSITY"
                  value={cy[intensityKey] as 0 | 1 | 2 | 3}
                  onChange={v => patch(intensityKey, v)}
                  accent={teal}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TabMarks({ cfg, set }: { cfg: AvatarConfig; set: (patch: Partial<AvatarConfig>) => void }) {
  const tt = cfg.tattoos
  const pp = cfg.piercings
  const scarTypes: ScarType[] = ['slash', 'burn', 'ritual']
  const scarPlacements: ScarPlacement[] = [
    'left_cheek', 'right_cheek', 'forehead', 'chin', 'neck',
    'chest', 'left_arm', 'right_arm', 'abdomen', 'back',
  ]

  const addScar = (type: ScarType, placement: ScarPlacement) =>
    set({ scars: [...cfg.scars, { type, placement }] })
  const removeScar = (i: number) =>
    set({ scars: cfg.scars.filter((_, idx) => idx !== i) })

  return (
    <div style={col}>
      <p style={sectionTitle}>TATTOOS</p>
      <Toggle label="FACE TATTOO" value={tt.face} onChange={v => set({ tattoos: { ...tt, face: v } })} />
      {tt.face && (
        <input
          value={tt.faceStyle} placeholder="style description..."
          onChange={e => set({ tattoos: { ...tt, faceStyle: e.target.value } })}
          style={{ background: 'transparent', border: `1px solid ${dim}`, color: green, padding: '6px', fontFamily: 'monospace', fontSize: '12px', outline: 'none' }}
        />
      )}
      <Toggle label="BODY TATTOO" value={tt.body} onChange={v => set({ tattoos: { ...tt, body: v } })} />
      {tt.body && (
        <input
          value={tt.bodyStyle} placeholder="style description..."
          onChange={e => set({ tattoos: { ...tt, bodyStyle: e.target.value } })}
          style={{ background: 'transparent', border: `1px solid ${dim}`, color: green, padding: '6px', fontFamily: 'monospace', fontSize: '12px', outline: 'none' }}
        />
      )}
      <Toggle label="GANG MARKING" value={tt.gangMarking} onChange={v => set({ tattoos: { ...tt, gangMarking: v } })} />
      {tt.gangMarking && (
        <input
          value={tt.gangMarkingStyle} placeholder="gang/faction..."
          onChange={e => set({ tattoos: { ...tt, gangMarkingStyle: e.target.value } })}
          style={{ background: 'transparent', border: `1px solid ${dim}`, color: gold, padding: '6px', fontFamily: 'monospace', fontSize: '12px', outline: 'none' }}
        />
      )}

      <p style={{ ...sectionTitle, marginTop: '12px' }}>PIERCINGS</p>
      <Toggle label="EARS" value={pp.ears} onChange={v => set({ piercings: { ...pp, ears: v } })} />
      <Toggle label="NOSE" value={pp.nose} onChange={v => set({ piercings: { ...pp, nose: v } })} />
      <Toggle label="LIP" value={pp.lip} onChange={v => set({ piercings: { ...pp, lip: v } })} />
      <Toggle label="BROW" value={pp.brow} onChange={v => set({ piercings: { ...pp, brow: v } })} />

      <p style={{ ...sectionTitle, marginTop: '12px' }}>SCARS</p>
      {cfg.scars.map((sc, i) => (
        <div key={i} style={{ ...row, justifyContent: 'space-between', padding: '6px', border: `1px solid ${dim}` }}>
          <span style={{ fontSize: '11px', color: '#cc8888' }}>{sc.type} / {sc.placement}</span>
          <button onClick={() => removeScar(i)} style={{
            background: 'transparent', border: `1px solid #cc3333`, color: '#cc3333',
            padding: '2px 8px', fontSize: '10px', cursor: 'pointer', fontFamily: 'monospace',
          }}>REMOVE</button>
        </div>
      ))}
      <div style={{ ...row, gap: '6px', flexWrap: 'wrap' }}>
        <Select label="TYPE" value={cfg.scars[0]?.type ?? 'slash'} options={scarTypes}
          onChange={() => {}} />
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {scarTypes.map(t => (
          <button key={t} onClick={() => addScar(t, scarPlacements[0])} style={{
            flex: 1, padding: '5px', fontSize: '10px', fontFamily: 'monospace', cursor: 'pointer',
            background: 'transparent', border: `1px solid #cc6666`, color: '#cc6666',
          }}>+ {t.toUpperCase()}</button>
        ))}
      </div>
    </div>
  )
}

function TabSpecies({ cfg, set }: { cfg: AvatarConfig; set: (patch: Partial<AvatarConfig>) => void }) {
  const sf = cfg.speciesFeatures
  const { species } = cfg

  const avian = sf.avian ?? {
    wingSize: 0.5, wingspan: 0.5, tailFeathers: 0.5, crest: 0.5,
    talonType: 'sharp' as TalonType, beakShape: 'hooked' as BeakShape,
    cyberWings: false, cyberTalons: false, cyberBeak: false,
  }
  const felidCanid = sf.felidCanid ?? {
    furDensity: 0.5, furColor: '#888800', whiskers: true,
    clawLength: 0.5, tailType: 'long' as TailType, tailLength: 0.5,
    earPosition: 0, cyberClaws: false, cyberTail: false,
  }
  const reptilian = sf.reptilian ?? {
    scalePattern: 'smooth' as ScalePattern, scaleColor: '#008800',
    clawType: 'sharp' as ClawType, tailLength: 0.5,
    crest: false, frills: false,
    cyberScales: false, cyberClaws: false, cyberTail: false, cyberCrest: false,
  }
  const aquatic = sf.aquatic ?? {
    scalePattern: 'smooth' as ScalePattern, scaleColor: '#0088aa',
    finType: 'both' as FinType, tailShape: 'fan' as TailShape,
    gillVisibility: 0.5, dorsalFin: true,
    cyberFins: false, cyberTail: false, cyberGills: false, cyberDorsal: false,
  }
  const minotaur = sf.minotaur ?? {
    hornSize: 0.5, hornCurve: 0, maneLength: 0.5, maneColor: '#440000',
    hoofType: 'cloven' as HoofType, furDensity: 0.5, furColor: '#442200',
    tail: true, fangSize: 0.3, snoutProminence: 0.5,
    cyberHorns: false, cyberHooves: false,
  }
  const centaur = sf.centaur ?? {
    horseBodyColor: '#884422', maneLength: 0.5, maneColor: '#442200',
    hoofType: 'solid' as HoofType, withers: 0.5, crest: 0.5, tailLength: 0.5,
    cyberHooves: false, cyberWithers: false,
  }

  const isAvian = species === 'phoenixkin' || species === 'birdpeople'
  const isFelidCanid = species === 'catpeople' || species === 'dogpeople' || species === 'kitsune'
  const isReptilian = species === 'dragonkin' || species === 'lizardpeople'
  const isAquatic = species === 'fishpeople'
  const isMinotaur = species === 'minotaur'
  const isCentaur = species === 'centaur'

  if (!isAvian && !isFelidCanid && !isReptilian && !isAquatic && !isMinotaur && !isCentaur) {
    return (
      <div style={col}>
        <p style={{ color: dimText, fontSize: '12px', lineHeight: '1.8' }}>
          HUMAN species has no species-specific features.<br />
          Change species in IDENTITY to unlock this panel.
        </p>
      </div>
    )
  }

  const patchAvian = (k: keyof typeof avian, v: unknown) =>
    set({ speciesFeatures: { ...sf, avian: { ...avian, [k]: v } } })
  const patchFelidCanid = (k: keyof typeof felidCanid, v: unknown) =>
    set({ speciesFeatures: { ...sf, felidCanid: { ...felidCanid, [k]: v } } })
  const patchReptilian = (k: keyof typeof reptilian, v: unknown) =>
    set({ speciesFeatures: { ...sf, reptilian: { ...reptilian, [k]: v } } })
  const patchAquatic = (k: keyof typeof aquatic, v: unknown) =>
    set({ speciesFeatures: { ...sf, aquatic: { ...aquatic, [k]: v } } })
  const patchMinotaur = (k: keyof typeof minotaur, v: unknown) =>
    set({ speciesFeatures: { ...sf, minotaur: { ...minotaur, [k]: v } } })
  const patchCentaur = (k: keyof typeof centaur, v: unknown) =>
    set({ speciesFeatures: { ...sf, centaur: { ...centaur, [k]: v } } })

  return (
    <div style={col}>
      {isAvian && <>
        <p style={sectionTitle}>AVIAN FEATURES</p>
        <Slider label="WING SIZE" value={avian.wingSize} min={0} max={1} onChange={v => patchAvian('wingSize', v)} />
        <Slider label="WINGSPAN" value={avian.wingspan} min={0} max={1} onChange={v => patchAvian('wingspan', v)} />
        <Slider label="TAIL FEATHERS" value={avian.tailFeathers} min={0} max={1} onChange={v => patchAvian('tailFeathers', v)} />
        <Slider label="CREST" value={avian.crest} min={0} max={1} onChange={v => patchAvian('crest', v)} />
        <Select label="TALON TYPE" value={avian.talonType} options={['sharp', 'curved', 'blunt'] as TalonType[]}
          onChange={v => patchAvian('talonType', v)} />
        <Select label="BEAK SHAPE" value={avian.beakShape} options={['hooked', 'straight', 'wide'] as BeakShape[]}
          onChange={v => patchAvian('beakShape', v)} />
        <p style={{ ...sectionTitle, marginTop: '8px' }}>AVIAN CYBERNETICS</p>
        <Toggle label="CYBER WINGS" value={avian.cyberWings} onChange={v => patchAvian('cyberWings', v)} accent={teal} />
        <Toggle label="CYBER TALONS" value={avian.cyberTalons} onChange={v => patchAvian('cyberTalons', v)} accent={teal} />
        <Toggle label="CYBER BEAK" value={avian.cyberBeak} onChange={v => patchAvian('cyberBeak', v)} accent={teal} />
      </>}

      {isFelidCanid && <>
        <p style={sectionTitle}>FELID / CANID FEATURES</p>
        <Slider label="FUR DENSITY" value={felidCanid.furDensity} min={0} max={1} onChange={v => patchFelidCanid('furDensity', v)} />
        <ColorPicker label="FUR COLOR" value={felidCanid.furColor} onChange={v => patchFelidCanid('furColor', v)} />
        <Toggle label="WHISKERS" value={felidCanid.whiskers} onChange={v => patchFelidCanid('whiskers', v)} />
        <Slider label="CLAW LENGTH" value={felidCanid.clawLength} min={0} max={1} onChange={v => patchFelidCanid('clawLength', v)} />
        <Select label="TAIL TYPE" value={felidCanid.tailType} options={['long', 'bushy', 'stub', 'ringed'] as TailType[]}
          onChange={v => patchFelidCanid('tailType', v)} />
        <Slider label="TAIL LENGTH" value={felidCanid.tailLength} min={0} max={1} onChange={v => patchFelidCanid('tailLength', v)} />
        <Slider label="EAR POSITION" value={felidCanid.earPosition} onChange={v => patchFelidCanid('earPosition', v)} />
        <p style={{ ...sectionTitle, marginTop: '8px' }}>CYBERNETICS</p>
        <Toggle label="CYBER CLAWS" value={felidCanid.cyberClaws} onChange={v => patchFelidCanid('cyberClaws', v)} accent={teal} />
        <Toggle label="CYBER TAIL" value={felidCanid.cyberTail} onChange={v => patchFelidCanid('cyberTail', v)} accent={teal} />
      </>}

      {isReptilian && <>
        <p style={sectionTitle}>REPTILIAN FEATURES</p>
        <Select label="SCALE PATTERN" value={reptilian.scalePattern}
          options={['smooth', 'keeled', 'plated', 'diamond', 'iridescent', 'spotted', 'striped'] as ScalePattern[]}
          onChange={v => patchReptilian('scalePattern', v)} />
        <ColorPicker label="SCALE COLOR" value={reptilian.scaleColor} onChange={v => patchReptilian('scaleColor', v)} />
        <Select label="CLAW TYPE" value={reptilian.clawType} options={['sharp', 'blunt', 'retractile'] as ClawType[]}
          onChange={v => patchReptilian('clawType', v)} />
        <Slider label="TAIL LENGTH" value={reptilian.tailLength} min={0} max={1} onChange={v => patchReptilian('tailLength', v)} />
        <Toggle label="CREST" value={reptilian.crest} onChange={v => patchReptilian('crest', v)} />
        <Toggle label="FRILLS" value={reptilian.frills} onChange={v => patchReptilian('frills', v)} />
        <p style={{ ...sectionTitle, marginTop: '8px' }}>CYBERNETICS</p>
        <Toggle label="CYBER SCALES" value={reptilian.cyberScales} onChange={v => patchReptilian('cyberScales', v)} accent={teal} />
        <Toggle label="CYBER CLAWS" value={reptilian.cyberClaws} onChange={v => patchReptilian('cyberClaws', v)} accent={teal} />
        <Toggle label="CYBER TAIL" value={reptilian.cyberTail} onChange={v => patchReptilian('cyberTail', v)} accent={teal} />
        <Toggle label="CYBER CREST" value={reptilian.cyberCrest} onChange={v => patchReptilian('cyberCrest', v)} accent={teal} />
      </>}

      {isAquatic && <>
        <p style={sectionTitle}>AQUATIC FEATURES</p>
        <Select label="SCALE PATTERN" value={aquatic.scalePattern}
          options={['smooth', 'keeled', 'plated', 'diamond', 'iridescent', 'spotted', 'striped'] as ScalePattern[]}
          onChange={v => patchAquatic('scalePattern', v)} />
        <ColorPicker label="SCALE COLOR" value={aquatic.scaleColor} onChange={v => patchAquatic('scaleColor', v)} />
        <Select label="FIN TYPE" value={aquatic.finType} options={['pectoral', 'caudal', 'both'] as FinType[]}
          onChange={v => patchAquatic('finType', v)} />
        <Select label="TAIL SHAPE" value={aquatic.tailShape} options={['fan', 'forked', 'pointed'] as TailShape[]}
          onChange={v => patchAquatic('tailShape', v)} />
        <Slider label="GILL VISIBILITY" value={aquatic.gillVisibility} min={0} max={1} onChange={v => patchAquatic('gillVisibility', v)} />
        <Toggle label="DORSAL FIN" value={aquatic.dorsalFin} onChange={v => patchAquatic('dorsalFin', v)} />
        <p style={{ ...sectionTitle, marginTop: '8px' }}>CYBERNETICS</p>
        <Toggle label="CYBER FINS" value={aquatic.cyberFins} onChange={v => patchAquatic('cyberFins', v)} accent={teal} />
        <Toggle label="CYBER TAIL" value={aquatic.cyberTail} onChange={v => patchAquatic('cyberTail', v)} accent={teal} />
        <Toggle label="CYBER GILLS" value={aquatic.cyberGills} onChange={v => patchAquatic('cyberGills', v)} accent={teal} />
        <Toggle label="CYBER DORSAL" value={aquatic.cyberDorsal} onChange={v => patchAquatic('cyberDorsal', v)} accent={teal} />
      </>}

      {isMinotaur && <>
        <p style={sectionTitle}>MINOTAUR FEATURES</p>
        <Slider label="HORN SIZE" value={minotaur.hornSize} min={0} max={1} onChange={v => patchMinotaur('hornSize', v)} />
        <Slider label="HORN CURVE" value={minotaur.hornCurve} onChange={v => patchMinotaur('hornCurve', v)} />
        <Slider label="MANE LENGTH" value={minotaur.maneLength} min={0} max={1} onChange={v => patchMinotaur('maneLength', v)} />
        <ColorPicker label="MANE COLOR" value={minotaur.maneColor} onChange={v => patchMinotaur('maneColor', v)} />
        <Select label="HOOF TYPE" value={minotaur.hoofType} options={['cloven', 'solid', 'feathered'] as HoofType[]}
          onChange={v => patchMinotaur('hoofType', v)} />
        <Slider label="FUR DENSITY" value={minotaur.furDensity} min={0} max={1} onChange={v => patchMinotaur('furDensity', v)} />
        <ColorPicker label="FUR COLOR" value={minotaur.furColor} onChange={v => patchMinotaur('furColor', v)} />
        <Toggle label="TAIL" value={minotaur.tail} onChange={v => patchMinotaur('tail', v)} />
        <Slider label="FANG SIZE" value={minotaur.fangSize} min={0} max={1} onChange={v => patchMinotaur('fangSize', v)} />
        <Slider label="SNOUT PROMINENCE" value={minotaur.snoutProminence} min={0} max={1} onChange={v => patchMinotaur('snoutProminence', v)} />
        <p style={{ ...sectionTitle, marginTop: '8px' }}>CYBERNETICS</p>
        <Toggle label="CYBER HORNS" value={minotaur.cyberHorns} onChange={v => patchMinotaur('cyberHorns', v)} accent={teal} />
        <Toggle label="CYBER HOOVES" value={minotaur.cyberHooves} onChange={v => patchMinotaur('cyberHooves', v)} accent={teal} />
      </>}

      {isCentaur && <>
        <p style={sectionTitle}>CENTAUR FEATURES</p>
        <ColorPicker label="HORSE BODY COLOR" value={centaur.horseBodyColor} onChange={v => patchCentaur('horseBodyColor', v)} />
        <Slider label="MANE LENGTH" value={centaur.maneLength} min={0} max={1} onChange={v => patchCentaur('maneLength', v)} />
        <ColorPicker label="MANE COLOR" value={centaur.maneColor} onChange={v => patchCentaur('maneColor', v)} />
        <Select label="HOOF TYPE" value={centaur.hoofType} options={['cloven', 'solid', 'feathered'] as HoofType[]}
          onChange={v => patchCentaur('hoofType', v)} />
        <Slider label="WITHERS" value={centaur.withers} min={0} max={1} onChange={v => patchCentaur('withers', v)} />
        <Slider label="CREST" value={centaur.crest} min={0} max={1} onChange={v => patchCentaur('crest', v)} />
        <Slider label="TAIL LENGTH" value={centaur.tailLength} min={0} max={1} onChange={v => patchCentaur('tailLength', v)} />
        <p style={{ ...sectionTitle, marginTop: '8px' }}>CYBERNETICS</p>
        <Toggle label="CYBER HOOVES" value={centaur.cyberHooves} onChange={v => patchCentaur('cyberHooves', v)} accent={teal} />
        <Toggle label="CYBER WITHERS" value={centaur.cyberWithers} onChange={v => patchCentaur('cyberWithers', v)} accent={teal} />
      </>}
    </div>
  )
}

function TabAccessories({ cfg, set }: { cfg: AvatarConfig; set: (patch: Partial<AvatarConfig>) => void }) {
  const acc = cfg.accessories
  const slots = [
    { key: 'head' as const, label: 'HEAD', hint: 'hat / helmet / crown' },
    { key: 'face' as const, label: 'FACE', hint: 'mask / glasses / visor' },
    { key: 'neck' as const, label: 'NECK', hint: 'collar / necklace / choker' },
    { key: 'torso' as const, label: 'TORSO', hint: 'shirt / jacket / armour' },
    { key: 'waist' as const, label: 'WAIST', hint: 'belt / sash / skirt' },
    { key: 'legs' as const, label: 'LEGS', hint: 'pants / shorts / leggings' },
    { key: 'feet' as const, label: 'FEET', hint: 'boots / sandals / greaves' },
    { key: 'leftHand' as const, label: 'LEFT HAND', hint: 'glove / gauntlet / ring' },
    { key: 'rightHand' as const, label: 'RIGHT HAND', hint: 'glove / gauntlet / ring' },
    { key: 'back' as const, label: 'BACK', hint: 'cape / backpack / wings overlay' },
  ]

  return (
    <div style={col}>
      <p style={sectionTitle}>OUTFIT & ACCESSORIES</p>
      {slots.map(({ key, label, hint }) => {
        const item = acc[key]
        return (
          <div key={key} style={{ padding: '8px', border: `1px solid ${item.enabled ? green + '40' : dim}`, marginBottom: '2px' }}>
            <Toggle label={`${label} — ${hint}`} value={item.enabled}
              onChange={v => set({ accessories: { ...acc, [key]: { ...item, enabled: v } } })} />
            {item.enabled && (
              <div style={{ marginTop: '8px', ...col }}>
                <input
                  placeholder="style description..."
                  value={item.style}
                  onChange={e => set({ accessories: { ...acc, [key]: { ...item, style: e.target.value } } })}
                  style={{ background: 'transparent', border: `1px solid ${dim}`, color: green, padding: '6px', fontFamily: 'monospace', fontSize: '11px', outline: 'none' }}
                />
                <ColorPicker label="COLOR" value={item.color}
                  onChange={v => set({ accessories: { ...acc, [key]: { ...item, color: v } } })} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'identity' | 'face' | 'body' | 'skin' | 'hair' | 'eyes' | 'features' | 'makeup' | 'augments' | 'marks' | 'accessories'

const TABS: { id: Tab; label: string }[] = [
  { id: 'identity', label: 'IDENTITY' },
  { id: 'face', label: 'FACE' },
  { id: 'body', label: 'BODY' },
  { id: 'skin', label: 'SKIN' },
  { id: 'hair', label: 'HAIR' },
  { id: 'eyes', label: 'EYES' },
  { id: 'features', label: 'SPECIES+' },
  { id: 'makeup', label: 'MAKEUP' },
  { id: 'augments', label: 'AUGMENTS' },
  { id: 'marks', label: 'MARKS' },
  { id: 'accessories', label: 'OUTFIT' },
]

export default function AvatarCreatorPage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [cfg, setCfg] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG)
  const [activeTab, setActiveTab] = useState<Tab>('identity')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const isOwner = user?.username === username
  const viewOnly = !isOwner

  // Load existing avatar config
  useEffect(() => {
    if (!username) return
    setLoading(true)
    fetch(`${API}/api/v1/users/${username}`)
      .then(r => r.json())
      .then(data => {
        if (data.avatar_config) setCfg(data.avatar_config)
      })
      .catch(() => {/* use default */})
      .finally(() => setLoading(false))
  }, [username])

  // Redirect if viewing someone else's avatar in edit mode
  useEffect(() => {
    if (!isOwner && user) {
      // View-only is allowed — no redirect, just show read-only state
    }
  }, [isOwner, user, navigate, username])

  const set = useCallback((patch: Partial<AvatarConfig>) => {
    if (viewOnly) return
    setCfg(prev => ({ ...prev, ...patch }))
  }, [viewOnly])

  const handleSave = async () => {
    if (!user || !isOwner) return
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch(`${API}/api/v1/users/${username}/avatar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({ avatar_config: cfg }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.detail ?? 'Save failed.')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const tabProps = { cfg, set }

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', fontFamily: 'monospace',
      color: green, padding: '20px', gap: '24px', boxSizing: 'border-box',
    }}>
      {/* ── Left: Preview ── */}
      <div style={{ position: 'sticky', top: '20px', alignSelf: 'flex-start', ...col, gap: '12px' }}>
        <p style={{ fontSize: '10px', color: dimText, letterSpacing: '3px', textAlign: 'center' }}>
          // AVATAR PREVIEW
        </p>
        {loading ? (
          <div style={{ width: 400, height: 400, border: `1px solid ${dim}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: dimText, fontSize: '12px' }}>LOADING...</span>
          </div>
        ) : (
          <AvatarRenderer config={cfg} size={400} />
        )}
        <p style={{ fontSize: '10px', color: dimText, textAlign: 'center' }}>
          {cfg.species.toUpperCase()} · {cfg.gender.toUpperCase()}
        </p>

        {viewOnly && (
          <div style={{ padding: '10px', border: `1px solid ${gold}40`, background: `${gold}08` }}>
            <p style={{ fontSize: '11px', color: gold, textAlign: 'center', letterSpacing: '2px' }}>
              VIEW ONLY — NOT YOUR AVATAR
            </p>
          </div>
        )}

        {isOwner && (
          <div style={col}>
            {error && <p style={{ color: '#ff4444', fontSize: '11px', textAlign: 'center' }}>{error}</p>}
            {saved && <p style={{ color: green, fontSize: '11px', textAlign: 'center', letterSpacing: '2px' }}>// AVATAR SEALED TO NEXUS</p>}
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: 'transparent', border: `1px solid ${green}`,
                color: saving ? dimText : green, padding: '12px', fontSize: '13px',
                fontFamily: 'monospace', cursor: saving ? 'not-allowed' : 'pointer',
                letterSpacing: '3px',
              }}
            >
              {saving ? 'SEALING...' : 'SEAL AVATAR'}
            </button>
            <button
              onClick={() => navigate(`/profile/${username}`)}
              style={{
                background: 'transparent', border: `1px solid ${dim}`,
                color: dimText, padding: '8px', fontSize: '11px',
                fontFamily: 'monospace', cursor: 'pointer', letterSpacing: '2px',
              }}
            >
              BACK TO PROFILE
            </button>
          </div>
        )}
      </div>

      {/* ── Right: Controls ── */}
      <div style={{ flex: 1, minWidth: 0, ...col, gap: '0' }}>
        {/* Tab bar */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '2px',
          borderBottom: `1px solid ${dim}`, paddingBottom: '8px', marginBottom: '16px',
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                background: 'transparent', cursor: 'pointer', fontFamily: 'monospace',
                fontSize: '10px', letterSpacing: '1px', padding: '5px 10px',
                border: `1px solid ${activeTab === t.id ? (t.id === 'features' ? teal : t.id === 'augments' ? teal : green) : dim}`,
                color: activeTab === t.id ? (t.id === 'features' || t.id === 'augments' ? teal : green) : dimText,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ overflowY: 'auto', paddingRight: '8px' }}>
          {activeTab === 'identity' && <TabIdentity {...tabProps} />}
          {activeTab === 'face' && <TabFace {...tabProps} />}
          {activeTab === 'body' && <TabBody {...tabProps} />}
          {activeTab === 'skin' && <TabSkin {...tabProps} />}
          {activeTab === 'hair' && <TabHair {...tabProps} />}
          {activeTab === 'eyes' && <TabEyes {...tabProps} />}
          {activeTab === 'features' && <TabSpecies {...tabProps} />}
          {activeTab === 'makeup' && <TabMakeup {...tabProps} />}
          {activeTab === 'augments' && <TabAugments {...tabProps} />}
          {activeTab === 'marks' && <TabMarks {...tabProps} />}
          {activeTab === 'accessories' && <TabAccessories {...tabProps} />}
        </div>
      </div>
    </div>
  )
}
