import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore.js';
import { useUI } from '../store/useUI.js';
import { calculateTDEE } from '../lib/tdee.js';
import { loadStarterPlan } from '../sheets.jsx';
import {
  signInWithGoogle,
  signInWithApple,
  authenticateWithEmailPassword,
  isGoogleGsiAvailable,
  renderGoogleSignInButton,
  GOOGLE_OAUTH_SERVER
} from '../lib/google-auth.js';
import { purchasePackage } from '../lib/purchases.js';
import { TIERS } from '../lib/entitlements.js';
import Icon from '../components/Icon.jsx';
import { t } from '../lib/i18n.js';

const TOTAL_SURVEY_STEPS = 7;
const STEP_AUTH = 8;
const STEP_BILLING = 9;
const TOTAL_FLOW_STEPS = 9;

export default function Onboarding({ onBack, onComplete }) {
  const { S, update, setUser, setGuest } = useStore();
  const { toast } = useUI();

  const [step, setStep] = useState(1);

  // Survey State
  const [goal, setGoal] = useState('build_muscle');
  const [experience, setExperience] = useState('intermediate');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [gender, setGender] = useState('male');
  const [weight, setWeight] = useState(75);
  const [targetWeight, setTargetWeight] = useState(78);
  const [height, setHeight] = useState(178);
  const [age, setAge] = useState(26);
  const [equipment, setEquipment] = useState('commercial_gym');
  const [limitations, setLimitations] = useState('none');
  const [diet, setDiet] = useState('high_protein');
  const [coachingTone, setCoachingTone] = useState('scientist');

  // Auth State (Step 8)
  const [pendingUser, setPendingUser] = useState(null);
  const [authMode, setAuthMode] = useState('register'); // 'register' | 'login'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Billing State (Step 9)
  const [selectedPlan, setSelectedPlan] = useState('annual'); // 'annual' ($59.99/yr) | 'monthly' ($9.99/mo)
  const [billingLoading, setBillingLoading] = useState(false);

  // Dynamic Theme & Silhouette shift on Gender Selection
  const selectGender = g => {
    setGender(g);
    document.documentElement.dataset.gender = g;
    useStore.setState(state => ({
      S: {
        ...state.S,
        gender: g,
        body: g
      }
    }));
  };

  // Compile full survey profile
  const getCompiledSurvey = () => ({
    goal: goal === 'build_muscle' ? 'Build Muscle & Hypertrophy'
      : goal === 'lose_fat' ? 'Fat Loss & Definition'
      : goal === 'get_stronger' ? 'Maximal Strength (1RM Focus)'
      : goal === 'athletic' ? 'Athletic Performance & Conditioning'
      : 'Health & Longevity',
    rawGoal: goal,
    experience: experience === 'beginner' ? 'Beginner (<1 year)'
      : experience === 'intermediate' ? 'Intermediate (1–3 years)'
      : experience === 'advanced' ? 'Advanced (3–5 years)'
      : 'Elite (5+ years)',
    daysPerWeek,
    gender,
    weight,
    targetWeight,
    height,
    age,
    equipment: equipment === 'commercial_gym' ? 'Full Commercial Gym'
      : equipment === 'home_barbell' ? 'Home Gym (Barbell, Plates, Rack & Bench)'
      : equipment === 'dumbbells' ? 'Dumbbells & Adjustable Bench Only'
      : 'Calisthenics / Bodyweight Only',
    limitations: limitations === 'none' ? 'None (100% Healthy & Pain-Free)'
      : limitations === 'lower_back' ? 'Lower Back Sensitivity'
      : limitations === 'shoulders' ? 'Shoulders / Rotator Cuff Sensitivity'
      : limitations === 'knees' ? 'Knee / Patella Sensitivity'
      : 'Wrists & Elbows',
    diet: diet === 'high_protein' ? 'High Protein Omnivore'
      : diet === 'clean' ? 'Clean Balanced Whole Foods'
      : diet === 'keto' ? 'Ketogenic / Low Carb'
      : diet === 'vegetarian' ? 'Vegetarian'
      : diet === 'vegan' ? 'Vegan / Plant-Based'
      : 'Intermittent Fasting (16:8)',
    coachingTone: coachingTone === 'scientist' ? 'Hypertrophy Scientist (Biomechanics, RPE & volume progression)'
      : coachingTone === 'drill_sergeant' ? 'Drill Sergeant (High discipline, zero excuses)'
      : coachingTone === 'mentor' ? 'Encouraging Mentor (Positive reinforcement, sustainable habits)'
      : 'Concise Minimalist (Direct, data-driven bullet points)'
  });

  // Save survey data into store
  const saveSurveyToStore = () => {
    const compiled = getCompiledSurvey();
    const tdeeResult = calculateTDEE({
      weightKg: weight,
      heightCm: height,
      ageYears: age,
      gender,
      activityLevel: daysPerWeek >= 5 ? 'heavy' : daysPerWeek >= 3 ? 'moderate' : 'light',
      goal: goal === 'lose_fat' ? 'cut' : goal === 'build_muscle' ? 'bulk' : 'maintain'
    });

    useStore.setState(state => ({
      S: {
        ...state.S,
        userGoal: goal,
        gender,
        body: gender,
        survey: compiled,
        coachProfile: {
          limitations: compiled.limitations !== 'None (100% Healthy & Pain-Free)' ? compiled.limitations : '',
          goal: compiled.goal,
          trainingDays: daysPerWeek,
          experience: compiled.experience,
          coachingStyle: compiled.coachingTone
        },
        nutrition: tdeeResult,
        nutritionTargets: {
          calories: tdeeResult.targetCalories,
          protein: tdeeResult.proteinGrams,
          carbs: tdeeResult.carbsGrams,
          fat: tdeeResult.fatGrams,
          waterMl: tdeeResult.waterTargetMl
        },
        bodyweight: [{ d: new Date().toISOString().slice(0, 10), w: weight, t: Date.now() }]
      }
    }));
  };

  // Next step handler
  const handleNext = () => {
    if (step < TOTAL_SURVEY_STEPS) {
      setStep(s => s + 1);
    } else if (step === TOTAL_SURVEY_STEPS) {
      saveSurveyToStore();
      setStep(STEP_AUTH);
    }
  };

  // Auth Handlers
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      const u = await signInWithGoogle({
        name: authName || 'Google Lifter',
        email: authEmail || 'athlete@gmail.com'
      });
      setPendingUser(u);
      saveSurveyToStore();
      toast(t('Signed in with Google OAuth 2.0 (accounts.google.com)! Select your plan.'));
      setStep(STEP_BILLING);
    } catch (err) {
      toast(err.message || t('Google sign-in failed. Please try again.'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAuthLoading(true);
    try {
      const u = await signInWithApple();
      setPendingUser(u);
      saveSurveyToStore();
      toast(t('Signed in with Apple! Select your plan to continue.'));
      setStep(STEP_BILLING);
    } catch (err) {
      toast(err.message || t('Apple sign-in failed'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleManualEmailAuth = async e => {
    if (e) e.preventDefault();
    setAuthLoading(true);
    try {
      const u = await authenticateWithEmailPassword(authEmail, authPassword, authMode === 'register', authName);
      setPendingUser(u);
      saveSurveyToStore();
      toast(authMode === 'register' ? t('Account created! Select your plan to continue.') : t('Welcome back! Select your plan to continue.'));
      setStep(STEP_BILLING);
    } catch (err) {
      toast(err.message || t('Authentication failed'));
    } finally {
      setAuthLoading(false);
    }
  };

  // Billing Completion Handler
  const handleFinalizeSubscription = async () => {
    setBillingLoading(true);
    try {
      const pkgId = selectedPlan === 'annual' ? '$rc_annual' : '$rc_monthly';
      await purchasePackage(pkgId);

      const activeUser = pendingUser || {
        id: `u_${Date.now().toString(36)}`,
        name: 'Pro Lifter',
        email: authEmail || 'athlete@muscletrack.app',
        provider: 'google'
      };
      setUser(activeUser);

      // Unlock Pro entitlement
      useStore.setState(state => ({
        S: {
          ...state.S,
          entitlement: 'pro',
          onboardingComplete: true
        }
      }));

      // Initialize starter routine if empty
      if (!S.routines?.length) {
        loadStarterPlan();
      }

      toast(t('Welcome to MuscleTrack Pro! Your personalized plan is ready.'));
      if (onComplete) onComplete();
    } catch (err) {
      toast(err.message || t('Subscription failed'));
    } finally {
      setBillingLoading(false);
    }
  };

  return (
    <div className="narrow" style={{ minHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '12px 16px 24px' }}>
      {/* Top progress indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 20 }}>
        <button
          className="iconbtn"
          style={{ width: 36, height: 36 }}
          onClick={step === 1 ? onBack : () => setStep(s => s - 1)}
          aria-label="Back"
        >
          <Icon name="chevronLeft" />
        </button>
        <div style={{ flex: 1, height: 5, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${(step / TOTAL_FLOW_STEPS) * 100}%`,
              background: 'var(--acc)',
              borderRadius: 999,
              transition: 'width 0.3s ease'
            }}
          />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--label-2)', minWidth: 32, textAlign: 'right' }}>
          {step}/{TOTAL_FLOW_STEPS}
        </span>
      </div>

      {/* ======================================================================
          STEP 1: PRIMARY FITNESS GOAL
          ====================================================================== */}
      {step === 1 && (
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--acc)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            {t('Personalized AI Survey · Step 1')}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 6px', color: '#ffffff' }}>
            {t("What is your primary training goal?")}
          </h1>
          <p style={{ color: 'var(--label-2)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
            {t('Your answer directly configures the progressive overload logic and calorie formulas.')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { id: 'build_muscle', icon: 'dumbbell', label: 'Build Muscle & Hypertrophy', desc: 'Maximize muscular size with science-backed volume & mechanical tension' },
              { id: 'lose_fat', icon: 'flame', label: 'Fat Loss & Lean Definition', desc: 'Caloric deficit, high protein retention, and accelerated metabolic burn' },
              { id: 'get_stronger', icon: 'bolt', label: 'Maximal Strength & Power', desc: 'Increase 1-Rep Max in compound lifts with neural adaptation' },
              { id: 'athletic', icon: 'figureRun', label: 'Athletic Conditioning & Agility', desc: 'Functional power, mobility, sprint recovery, and high stamina' },
              { id: 'longevity', icon: 'heart', label: 'Health, Posture & Longevity', desc: 'Joint mobility, core stabilization, and lifelong cardiovascular health' }
            ].map(g => {
              const selected = goal === g.id;
              return (
                <div
                  key={g.id}
                  className={'goal-card' + (selected ? ' selected' : '')}
                  onClick={() => setGoal(g.id)}
                >
                  <div className="goal-left">
                    <span style={{ color: selected ? 'var(--acc)' : 'var(--label-2)', fontSize: 22 }}>
                      <Icon name={g.icon} />
                    </span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: selected ? 'var(--acc)' : '#ffffff' }}>{t(g.label)}</div>
                      <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--label-2)', marginTop: 2 }}>{t(g.desc)}</div>
                    </div>
                  </div>
                  <div className="goal-check">{selected && <Icon name="check" />}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================================
          STEP 2: TRAINING EXPERIENCE & WEEKLY FREQUENCY
          ====================================================================== */}
      {step === 2 && (
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--acc)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            {t('Personalized AI Survey · Step 2')}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 6px', color: '#ffffff' }}>
            {t('Experience & Schedule')}
          </h1>
          <p style={{ color: 'var(--label-2)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
            {t('Calibrates volume tolerance, RPE targets, and weekly routine splits.')}
          </p>

          <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginBottom: 10 }}>
            {t('Lifting Experience Level')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            {[
              { id: 'beginner', label: 'Beginner', sub: '< 1 year' },
              { id: 'intermediate', label: 'Intermediate', sub: '1 – 3 years' },
              { id: 'advanced', label: 'Advanced', sub: '3 – 5 years' },
              { id: 'elite', label: 'Elite', sub: '5+ years' }
            ].map(item => (
              <div
                key={item.id}
                onClick={() => setExperience(item.id)}
                style={{
                  background: experience === item.id ? 'color-mix(in srgb, var(--acc) 14%, transparent)' : 'var(--surface-2)',
                  border: experience === item.id ? '2px solid var(--acc)' : '1px solid var(--sep-op)',
                  borderRadius: 'var(--r-card)',
                  padding: '14px 12px',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 15, color: experience === item.id ? 'var(--acc)' : '#fff' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--label-3)', marginTop: 2 }}>{item.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginBottom: 10 }}>
            {t('How many days per week will you train?')}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            {[2, 3, 4, 5, 6].map(d => (
              <button
                key={d}
                onClick={() => setDaysPerWeek(d)}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: daysPerWeek === d ? '2px solid var(--acc)' : '1px solid var(--sep-op)',
                  background: daysPerWeek === d ? 'var(--acc)' : 'var(--surface-2)',
                  color: daysPerWeek === d ? '#000000' : 'var(--label)'
                }}
              >
                {d}d
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--label-3)', marginTop: 8, textAlign: 'center' }}>
            {daysPerWeek === 2 ? t('Recommended: 2x Full Body Split')
              : daysPerWeek === 3 ? t('Recommended: 3x Full Body or Push/Pull/Legs')
              : daysPerWeek === 4 ? t('Recommended: 4x Upper / Lower Split')
              : daysPerWeek === 5 ? t('Recommended: 5x Push / Pull / Legs + Upper / Lower')
              : t('Recommended: 6x Push / Pull / Legs Arnold Split')}
          </div>
        </div>
      )}

      {/* ======================================================================
          STEP 3: BIOLOGICAL SEX & PHYSICAL METRICS
          ====================================================================== */}
      {step === 3 && (
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--acc)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            {t('Personalized AI Survey · Step 3')}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 6px', color: '#ffffff' }}>
            {t('Body Metrics & Sex')}
          </h1>
          <p style={{ color: 'var(--label-2)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
            {t('Drives the 3D anatomical contours, theme colors, and Mifflin-St Jeor TDEE targets.')}
          </p>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 18 }}>
            <div className="row between">
              <span style={{ fontWeight: 600, color: 'var(--label)' }}>{t('Biological Sex')}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={'chip' + (gender === 'male' ? ' on' : '')}
                  onClick={() => selectGender('male')}
                  style={{ padding: '6px 14px', fontWeight: 700 }}
                >
                  ♂ {t('Male')}
                </button>
                <button
                  className={'chip' + (gender === 'female' ? ' on' : '')}
                  onClick={() => selectGender('female')}
                  style={{ padding: '6px 14px', fontWeight: 700 }}
                >
                  ♀ {t('Female')}
                </button>
              </div>
            </div>

            <div className="row between">
              <span style={{ fontWeight: 600, color: 'var(--label)' }}>{t('Current Weight (kg)')}</span>
              <input
                className="input"
                type="number"
                value={weight}
                onChange={e => setWeight(Number(e.target.value) || 70)}
                style={{ width: 110, textAlign: 'right', fontWeight: 700 }}
              />
            </div>

            <div className="row between">
              <span style={{ fontWeight: 600, color: 'var(--label)' }}>{t('Target Weight (kg)')}</span>
              <input
                className="input"
                type="number"
                value={targetWeight}
                onChange={e => setTargetWeight(Number(e.target.value) || 70)}
                style={{ width: 110, textAlign: 'right', fontWeight: 700 }}
              />
            </div>

            <div className="row between">
              <span style={{ fontWeight: 600, color: 'var(--label)' }}>{t('Height (cm)')}</span>
              <input
                className="input"
                type="number"
                value={height}
                onChange={e => setHeight(Number(e.target.value) || 175)}
                style={{ width: 110, textAlign: 'right', fontWeight: 700 }}
              />
            </div>

            <div className="row between">
              <span style={{ fontWeight: 600, color: 'var(--label)' }}>{t('Age')}</span>
              <input
                className="input"
                type="number"
                value={age}
                onChange={e => setAge(Number(e.target.value) || 25)}
                style={{ width: 110, textAlign: 'right', fontWeight: 700 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          STEP 4: EQUIPMENT ENVIRONMENT
          ====================================================================== */}
      {step === 4 && (
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--acc)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            {t('Personalized AI Survey · Step 4')}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 6px', color: '#ffffff' }}>
            {t('Available Equipment')}
          </h1>
          <p style={{ color: 'var(--label-2)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
            {t('The AI Coach and substitution engine will only prescribe exercises matching this equipment.')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { id: 'commercial_gym', label: 'Full Commercial Gym', desc: 'Barbells, dumbbells, cable stations, leg press & leverage machines' },
              { id: 'home_barbell', label: 'Home Gym (Barbell & Rack)', desc: 'Olympic barbell, squat rack, bench press & weight plates' },
              { id: 'dumbbells', label: 'Dumbbells & Adjustable Bench', desc: 'Adjustable dumbbells, flat/incline bench, resistance bands' },
              { id: 'calisthenics', label: 'Bodyweight & Calisthenics', desc: 'Pull-up bar, dip bars, rings & bodyweight progressions' }
            ].map(eq => {
              const selected = equipment === eq.id;
              return (
                <div
                  key={eq.id}
                  className={'goal-card' + (selected ? ' selected' : '')}
                  onClick={() => setEquipment(eq.id)}
                >
                  <div className="goal-left">
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: selected ? 'var(--acc)' : '#ffffff' }}>{eq.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--label-2)', marginTop: 2 }}>{eq.desc}</div>
                    </div>
                  </div>
                  <div className="goal-check">{selected && <Icon name="check" />}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================================
          STEP 5: PHYSICAL LIMITATIONS & INJURY PREVENTION
          ====================================================================== */}
      {step === 5 && (
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--acc)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            {t('Personalized AI Survey · Step 5')}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 6px', color: '#ffffff' }}>
            {t('Joint Limitations & Injuries')}
          </h1>
          <p style={{ color: 'var(--label-2)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
            {t('Crucial safety directive: the AI Coach will automatically avoid dangerous axial loads on sensitive areas.')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { id: 'none', label: '🛡️ None (100% Healthy & Pain-Free)', desc: 'No joint or spinal restrictions — full range of motion' },
              { id: 'lower_back', label: '⚠️ Lower Back Sensitivity', desc: 'Avoid heavy spinal compression / unsupported bent rows; favor chest-supported' },
              { id: 'shoulders', label: '⚠️ Shoulders / Rotator Cuff', desc: 'Avoid extreme internal rotation & behind-the-neck presses; favor neutral grips' },
              { id: 'knees', label: '⚠️ Knees / Patella Sensitivity', desc: 'Avoid excessive forward knee shear; prioritize hip hinges and box squats' },
              { id: 'wrists_elbows', label: '⚠️ Wrists & Elbow Tendonitis', desc: 'Avoid fixed barbell straight curls; favor EZ-curl and neutral dumbbells' }
            ].map(lim => {
              const selected = limitations === lim.id;
              return (
                <div
                  key={lim.id}
                  className={'goal-card' + (selected ? ' selected' : '')}
                  onClick={() => setLimitations(lim.id)}
                >
                  <div className="goal-left">
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: selected ? 'var(--acc)' : '#ffffff' }}>{lim.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--label-2)', marginTop: 2 }}>{lim.desc}</div>
                    </div>
                  </div>
                  <div className="goal-check">{selected && <Icon name="check" />}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================================
          STEP 6: DIETARY APPROACH & NUTRITION STYLE
          ====================================================================== */}
      {step === 6 && (
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--acc)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            {t('Personalized AI Survey · Step 6')}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 6px', color: '#ffffff' }}>
            {t('Nutrition & Diet Style')}
          </h1>
          <p style={{ color: 'var(--label-2)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
            {t('Dictates the AI Vision plate scanner and smart recipe recommendations.')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { id: 'high_protein', label: '🥩 High Protein Omnivore', desc: 'Poultry, steak, fish, eggs, dairy, rice, and oats for maximum muscle growth' },
              { id: 'clean', label: '🥗 Clean Balanced Whole Foods', desc: 'Flexible macronutrients with unrefined grains and healthy fats' },
              { id: 'keto', label: '🥑 Ketogenic / Low Carb', desc: 'High healthy fats, moderate protein, under 30g net carbs' },
              { id: 'vegetarian', label: '🥦 Vegetarian', desc: 'Eggs, Greek yogurt, whey protein, tofu, and legumes' },
              { id: 'vegan', label: '🌱 100% Vegan (Plant-Based)', desc: 'Soy, seitan, lentils, nutritional yeast, and plant protein powders' },
              { id: 'fasting', label: '⏳ Intermittent Fasting (16:8)', desc: '16 hours fasting window, 8 hours nutrient feeding window' }
            ].map(d => {
              const selected = diet === d.id;
              return (
                <div
                  key={d.id}
                  className={'goal-card' + (selected ? ' selected' : '')}
                  onClick={() => setDiet(d.id)}
                >
                  <div className="goal-left">
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: selected ? 'var(--acc)' : '#ffffff' }}>{d.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--label-2)', marginTop: 2 }}>{d.desc}</div>
                    </div>
                  </div>
                  <div className="goal-check">{selected && <Icon name="check" />}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================================
          STEP 7: AI COACHING PERSONA
          ====================================================================== */}
      {step === 7 && (
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--acc)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            {t('Personalized AI Survey · Step 7')}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 6px', color: '#ffffff' }}>
            {t('AI Coaching Voice & Persona')}
          </h1>
          <p style={{ color: 'var(--label-2)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
            {t('Controls how your Gemini AI Coach communicates and delivers feedback.')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { id: 'scientist', label: '🧪 Hypertrophy Scientist', desc: 'Evidence-based biomechanics, RPE & volume progression, deep exercise physiology' },
              { id: 'drill_sergeant', label: '⚡ Drill Sergeant', desc: 'High discipline, zero excuses, direct pushing, and rigorous accountability' },
              { id: 'mentor', label: '🌟 Encouraging Mentor', desc: 'Positive reinforcement, sustainable habit building, and compassionate support' },
              { id: 'minimalist', label: '🎯 Concise Minimalist', desc: 'Ultra-direct bullet points, raw numbers, and zero fluff' }
            ].map(c => {
              const selected = coachingTone === c.id;
              return (
                <div
                  key={c.id}
                  className={'goal-card' + (selected ? ' selected' : '')}
                  onClick={() => setCoachingTone(c.id)}
                >
                  <div className="goal-left">
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: selected ? 'var(--acc)' : '#ffffff' }}>{c.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--label-2)', marginTop: 2 }}>{c.desc}</div>
                    </div>
                  </div>
                  <div className="goal-check">{selected && <Icon name="check" />}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================================
          STEP 8: ACCOUNT CREATION (POWERED BY GOOGLE AUTHENTICATION)
          ====================================================================== */}
      {step === STEP_AUTH && (
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--acc)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            {t('Save Profile · Step 8')}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 6px', color: '#ffffff' }}>
            {t('Create Your Account')}
          </h1>
          <p style={{ color: 'var(--label-2)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
            {t('Save your personalized AI profile and access your workouts seamlessly on any mobile or desktop device.')}
          </p>

          {/* Google OAuth 2.0 Server Status Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: 'rgba(66, 133, 244, 0.1)',
            border: '1px solid rgba(66, 133, 244, 0.28)',
            borderRadius: 20,
            marginBottom: 16
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34A853', boxShadow: '0 0 8px #34A853' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#8ab4f8', letterSpacing: '0.02em' }}>
              {t('Google OAuth 2.0 Server Active (accounts.google.com)')}
            </span>
          </div>

          {/* Social Auth Providers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {/* Google Authentication Button (Powered by Google OAuth 2.0 Server) */}
            <button
              id="btn-google-oauth-signup"
              className="btn"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              style={{
                width: '100%',
                height: 52,
                fontSize: 15,
                fontWeight: 700,
                background: '#ffffff',
                color: '#1f1f1f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                borderRadius: 14,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{authLoading ? t('Connecting to Google OAuth 2.0...') : t('Continue with Google (OAuth 2.0)')}</span>
            </button>

            {/* Apple Sign-In Button */}
            <button
              className="btn"
              onClick={handleAppleSignIn}
              disabled={authLoading}
              style={{
                width: '100%',
                height: 50,
                fontSize: 15,
                fontWeight: 700,
                background: '#000000',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                borderRadius: 14
              }}
            >
              <span style={{ fontSize: 20 }}></span>
              <span>{t('Continue with Apple')}</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--sep)' }} />
            <span style={{ fontSize: 12, color: 'var(--label-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('Or with email & password')}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--sep)' }} />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleManualEmailAuth} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18 }}>
            {authMode === 'register' && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-2)', marginBottom: 4, display: 'block' }}>
                  {t('Your Name')}
                </label>
                <input
                  className="input"
                  placeholder="e.g. Alex"
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-2)', marginBottom: 4, display: 'block' }}>
                {t('Email Address')}
              </label>
              <input
                className="input"
                type="email"
                required
                placeholder="athlete@example.com"
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--label-2)', marginBottom: 4, display: 'block' }}>
                {t('Password (min 6 characters)')}
              </label>
              <input
                className="input"
                type="password"
                required
                placeholder="••••••••"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <button
              type="submit"
              className="btn primary pill"
              disabled={authLoading}
              style={{ width: '100%', height: 46, fontSize: 15, fontWeight: 700, marginTop: 4 }}
            >
              {authLoading ? t('Authenticating...') : authMode === 'register' ? t('Create Account & Continue') : t('Sign In & Continue')}
            </button>

            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setAuthMode(m => (m === 'register' ? 'login' : 'register'))}
                style={{ background: 'none', border: 'none', color: 'var(--acc)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                {authMode === 'register' ? t('Already have an account? Sign in') : t('Need an account? Register')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================================
          STEP 9: BILLING & PRO SUBSCRIPTION ($9.99/mo or $59.99/yr)
          ====================================================================== */}
      {step === STEP_BILLING && (
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ color: 'var(--acc)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            {t('Membership · Final Step')}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 6px', color: '#ffffff' }}>
            {t('Activate MuscleTrack Pro')}
          </h1>
          <p style={{ color: 'var(--label-2)', fontSize: 14, margin: '0 0 18px', lineHeight: 1.5 }}>
            {t('Unlock your personalized Gemini AI Coach, Plate Scanner, and 1.5x 3D Muscle Map.')}
          </p>

          {/* Value Highlights */}
          <div className="card" style={{ textAlign: 'left', padding: '16px 18px', marginBottom: 20 }}>
            {[
              { title: t('Personalized Gemini AI Strength Coach'), desc: t('Engineered strictly around your {0} goal & {1} limitations', goal, limitations) },
              { title: t('AI Plate Vision Macro Scanner'), desc: t('Photo scanner calibrated for your {0} nutrition protocol', diet) },
              { title: t('1.5x Interactive 3D Muscle Recovery Map'), desc: t('Calibrated to your {0} biological recovery timeline', gender) },
              { title: t('Smart Macro-Matching Meal Recommender'), desc: t('Instant high-protein meals tailored to your remaining calorie deficit') }
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i === 3 ? 0 : 12 }}>
                <div style={{ color: 'var(--acc)', marginTop: 2 }}>
                  <Icon name="checkCircle" size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--label-2)', marginTop: 1 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {/* Annual Option ($59.99/yr) */}
            <div
              onClick={() => setSelectedPlan('annual')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 18px',
                borderRadius: 'var(--r-card)',
                cursor: 'pointer',
                border: selectedPlan === 'annual' ? '2px solid var(--acc)' : '1px solid var(--border)',
                background: selectedPlan === 'annual' ? 'color-mix(in srgb, var(--acc) 12%, transparent)' : 'var(--surface)',
                position: 'relative'
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 17, fontWeight: 800, color: '#ffffff' }}>{t('Annual Plan')}</span>
                  <span
                    style={{
                      background: 'var(--acc)',
                      color: '#000000',
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 10
                    }}
                  >
                    {t('BEST VALUE · SAVE 50%')}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--label-2)', marginTop: 3 }}>
                  {t('7 days free trial, then $59.99 USD / year ($4.99/mo)')}
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--acc)' }}>
                $59.99 <span style={{ fontSize: 12, fontWeight: 500 }}>/yr</span>
              </div>
            </div>

            {/* Monthly Option ($9.99/mo) */}
            <div
              onClick={() => setSelectedPlan('monthly')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 18px',
                borderRadius: 'var(--r-card)',
                cursor: 'pointer',
                border: selectedPlan === 'monthly' ? '2px solid var(--acc)' : '1px solid var(--border)',
                background: selectedPlan === 'monthly' ? 'color-mix(in srgb, var(--acc) 12%, transparent)' : 'var(--surface)'
              }}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#ffffff' }}>{t('Monthly Plan')}</div>
                <div style={{ fontSize: 12, color: 'var(--label-2)', marginTop: 3 }}>
                  {t('Billed monthly, cancel anytime in 1 tap')}
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#ffffff' }}>
                $9.99 <span style={{ fontSize: 12, fontWeight: 500 }}>/mo</span>
              </div>
            </div>
          </div>

          <button
            className="btn primary pill"
            disabled={billingLoading}
            onClick={handleFinalizeSubscription}
            style={{ width: '100%', height: 52, fontSize: 17, fontWeight: 800 }}
          >
            {billingLoading ? t('Activating Pro...') : selectedPlan === 'annual' ? t('Start 7-Day Free Trial ($59.99/yr)') : t('Activate Monthly ($9.99/mo)')}
          </button>
          <div style={{ fontSize: 11, color: 'var(--label-3)', marginTop: 8 }}>
            {t('Zero risk · Cancel anytime in Settings · Powered by RevenueCat')}
          </div>
        </div>
      )}

      {/* Navigation bottom bar for survey steps 1 to 7 */}
      {step <= TOTAL_SURVEY_STEPS && (
        <div style={{ display: 'flex', gap: 12, marginTop: 'auto', paddingTop: 20 }}>
          <button
            className="btn plain"
            style={{ flex: 1, borderRadius: 999 }}
            onClick={step === 1 ? onBack : () => setStep(s => s - 1)}
          >
            {t('< Back')}
          </button>
          <button
            className="btn primary pill"
            style={{ flex: 2, height: 48, fontSize: 16 }}
            onClick={handleNext}
          >
            {step === TOTAL_SURVEY_STEPS ? t('Continue to Account') : t('Next')}
          </button>
        </div>
      )}
    </div>
  );
}
