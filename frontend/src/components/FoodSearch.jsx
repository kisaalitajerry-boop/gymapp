import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore.js';
import { useUI } from '../store/useUI.js';
import { t } from '../lib/i18n.js';
import { todayISO } from '../lib/format.js';
import { searchFoods, calculatePortion, addRecentFood, createCustomFood } from '../lib/foods.js';
import { addFood } from '../lib/nutrition.js';
import Icon from './Icon.jsx';

export default function FoodSearch({ initialMeal = 'lunch', close }) {
  const S = useStore(s => s.S);
  const update = useStore(s => s.update);
  const toast = useUI(s => s.toast);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [grams, setGrams] = useState(100);
  const [mealCategory, setMealCategory] = useState(initialMeal);
  const [showCustomModal, setShowCustomModal] = useState(false);

  // Custom Food Form
  const [customName, setCustomName] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [customKcal, setCustomKcal] = useState('');
  const [customP, setCustomP] = useState('');
  const [customC, setCustomC] = useState('');
  const [customF, setCustomF] = useState('');
  const [customServing, setCustomServing] = useState('100');

  const customFoods = S.customFoods || [];
  const recentFoods = S.recentFoods || [];

  // Debounced Search
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const hits = await searchFoods(query, { customFoods, recentFoods });
        if (active) setResults(hits);
      } finally {
        if (active) setLoading(false);
      }
    }, query ? 250 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, customFoods.length, recentFoods.length]);

  const portion = selectedFood ? calculatePortion(selectedFood, grams) : null;

  const handleSelectFood = food => {
    setSelectedFood(food);
    setGrams(food.servingGrams || 100);
  };

  const handleCommitFood = () => {
    if (!selectedFood || !portion) return;
    const today = todayISO();
    const itemToLog = {
      name: selectedFood.brand ? `${selectedFood.name} (${selectedFood.brand})` : selectedFood.name,
      meal: mealCategory,
      grams: portion.grams,
      kcal: portion.kcal,
      p: portion.p,
      c: portion.c,
      f: portion.f,
      tags: selectedFood.source === 'custom' ? ['Custom'] : ['Open Food Facts']
    };

    update(s => {
      s.foodLog = addFood(s.foodLog, itemToLog, today);
      s.recentFoods = addRecentFood(s.recentFoods, selectedFood);
    });

    toast(t('Logged {0} ({1} kcal)', itemToLog.name, itemToLog.kcal));
    close();
  };

  const handleSaveCustomFood = e => {
    e.preventDefault();
    if (!customName.trim()) {
      toast(t('Please enter a food name'));
      return;
    }
    const newFood = createCustomFood({
      name: customName,
      brand: customBrand,
      kcal: Number(customKcal) || 0,
      p: Number(customP) || 0,
      c: Number(customC) || 0,
      f: Number(customF) || 0,
      servingGrams: Number(customServing) || 100
    });

    update(s => {
      s.customFoods = [newFood, ...(s.customFoods || [])];
      s.recentFoods = addRecentFood(s.recentFoods, newFood);
    });

    toast(t('Custom food {0} created!', newFood.name));
    setShowCustomModal(false);
    setSelectedFood(newFood);
    setGrams(newFood.servingGrams);
  };

  return (
    <div style={{ maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <div className="row between" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>
          {selectedFood ? t('Log Portion') : showCustomModal ? t('New Custom Food') : t('Search Food')}
        </h3>
        <button className="iconbtn" onClick={close} aria-label="Close">
          <Icon name="xmark" />
        </button>
      </div>

      {showCustomModal ? (
        /* Create Custom Food View */
        <form onSubmit={handleSaveCustomFood} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label className="dim small">{t('Food Name *')}</label>
            <input
              className="input"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="e.g. Grandma's Protein Muffin"
              required
            />
          </div>
          <div>
            <label className="dim small">{t('Brand / Source (Optional)')}</label>
            <input
              className="input"
              value={customBrand}
              onChange={e => setCustomBrand(e.target.value)}
              placeholder="e.g. Homemade"
            />
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="dim small">{t('Serving (g)')}</label>
              <input
                type="number"
                className="input"
                value={customServing}
                onChange={e => setCustomServing(e.target.value)}
                placeholder="100"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="dim small">{t('Calories (kcal)')}</label>
              <input
                type="number"
                className="input"
                value={customKcal}
                onChange={e => setCustomKcal(e.target.value)}
                placeholder="250"
                required
              />
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="dim small">{t('Protein (g)')}</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={customP}
                onChange={e => setCustomP(e.target.value)}
                placeholder="20"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="dim small">{t('Carbs (g)')}</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={customC}
                onChange={e => setCustomC(e.target.value)}
                placeholder="30"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="dim small">{t('Fat (g)')}</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={customF}
                onChange={e => setCustomF(e.target.value)}
                placeholder="5"
              />
            </div>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setShowCustomModal(false)}>
              {t('Back')}
            </button>
            <button type="submit" className="btn primary" style={{ flex: 1 }}>
              {t('Save & Select')}
            </button>
          </div>
        </form>
      ) : selectedFood ? (
        /* Portion Sizing and Meal Assignment View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: '16px 14px', background: 'var(--surface-2)', margin: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{selectedFood.name}</div>
            {selectedFood.brand && <div className="dim small">{selectedFood.brand}</div>}

            <div style={{ display: 'flex', justifyContent: 'space-around', margin: '14px 0 8px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--acc)' }}>{portion.kcal}</div>
                <div className="dim small">{t('Calories')}</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#38bdf8' }}>{portion.p}g</div>
                <div className="dim small">{t('Protein')}</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24' }}>{portion.c}g</div>
                <div className="dim small">{t('Carbs')}</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f43f5e' }}>{portion.f}g</div>
                <div className="dim small">{t('Fat')}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="row between" style={{ marginBottom: 6 }}>
              <label className="dim small">{t('Weight / Portion (grams)')}</label>
              <span className="dim small">{t('Reference: 100g')}</span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <input
                type="number"
                className="input"
                style={{ fontSize: 18, fontWeight: 700 }}
                value={grams}
                onChange={e => setGrams(Math.max(1, Number(e.target.value) || 0))}
              />
              <button className="btn" onClick={() => setGrams(selectedFood.servingGrams || 100)}>
                {selectedFood.servingGrams}g ({t('Serving')})
              </button>
            </div>
          </div>

          <div>
            <label className="dim small" style={{ marginBottom: 6, display: 'block' }}>
              {t('Log to Meal')}
            </label>
            <div className="seg">
              {['breakfast', 'lunch', 'dinner', 'snacks'].map(m => (
                <button
                  key={m}
                  className={mealCategory === m ? 'on' : ''}
                  onClick={() => setMealCategory(m)}
                  style={{ textTransform: 'capitalize', fontSize: 12 }}
                >
                  {t(m)}
                </button>
              ))}
            </div>
          </div>

          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <button className="btn" style={{ flex: 1 }} onClick={() => setSelectedFood(null)}>
              {t('Back to Search')}
            </button>
            <button className="btn primary pill" style={{ flex: 1 }} onClick={handleCommitFood}>
              {t('Log Food')}
            </button>
          </div>
        </div>
      ) : (
        /* Search Query & Results List View */
        <>
          <div className="row" style={{ gap: 8, marginBottom: 12 }}>
            <div className="search" style={{ flex: 1, margin: 0 }}>
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
              <input
                className="input"
                placeholder={t('Search food, brand, or ingredients…')}
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
              {query && (
                <button className="iconbtn" onClick={() => setQuery('')}>
                  <Icon name="xmark" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Create Custom Food Link */}
          <div className="row between" style={{ padding: '0 4px', marginBottom: 8 }}>
            <span className="dim small">
              {query ? t('Search results') : t('Recent & saved foods')}
            </span>
            <button
              className="btn plain"
              style={{ fontSize: 12, color: 'var(--acc)', padding: 0 }}
              onClick={() => setShowCustomModal(true)}
            >
              + {t('Create Custom Food')}
            </button>
          </div>

          {/* Results List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 240 }}>
            {loading && <div className="muted small" style={{ textAlign: 'center', padding: 16 }}>{t('Searching food databases…')}</div>}

            {!loading && results.map(f => (
              <div
                key={f.id}
                className="card"
                style={{ padding: '10px 12px', margin: 0, cursor: 'pointer', transition: 'background 0.2s ease' }}
                onClick={() => handleSelectFood(f)}
              >
                <div className="row between">
                  <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, textTransform: 'capitalize' }}>
                      {f.name}
                    </div>
                    <div className="dim small">
                      {f.brand ? `${f.brand} · ` : ''}{f.servingGrams}g reference
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--acc)', fontSize: 15 }}>
                      {f.per100g?.kcal || 0} kcal
                    </div>
                    <div className="dim small" style={{ fontSize: 11 }}>
                      {f.per100g?.p || 0}P · {f.per100g?.c || 0}C · {f.per100g?.f || 0}F
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {!loading && results.length === 0 && (
              <div className="empty" style={{ padding: 24 }}>
                <Icon name="magnifier" size={28} />
                <div style={{ marginTop: 8 }}>{t('No food found.')}</div>
                <button
                  className="btn pill-sm pill-outline"
                  style={{ marginTop: 12 }}
                  onClick={() => setShowCustomModal(true)}
                >
                  + {t('Create Custom Food')}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
