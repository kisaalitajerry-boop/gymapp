// Silent Location-Based Diet & Regional Meal Adaptation Engine
// Detects country/region in the background via timezone/locale without intrusive permissions
// to ensure recommended foods are accessible, affordable, and culturally native.

import { localTZ, uid } from './format.js';

export const REGIONS = {
  east_africa: {
    id: 'east_africa',
    name: 'East Africa',
    subtext: 'Tilapia, Sukuma Wiki, Matooke, Rolex, Beans & Plantains',
    countries: ['Uganda', 'Kenya', 'Tanzania', 'Rwanda', 'Burundi', 'Ethiopia'],
    meals: [
      {
        name: 'Grilled Whole Tilapia with Sukuma Wiki & Plantains',
        meal: 'dinner',
        prepTime: '20 mins',
        grams: 380,
        kcal: 420,
        p: 46,
        c: 32,
        f: 8,
        fiber: 5,
        sodiumMg: 180,
        potassiumMg: 750,
        tags: ['Fresh Water Fish', 'Lean Protein', 'Accessible Local'],
        description: 'Fresh grilled lake tilapia seasoned with ginger and garlic, served with sautéed collard greens (sukuma wiki) and roasted plantains.'
      },
      {
        name: 'Lean Beef Stew with Steamed Matooke & Avocado',
        meal: 'lunch',
        prepTime: '25 mins',
        grams: 400,
        kcal: 450,
        p: 42,
        c: 38,
        f: 12,
        fiber: 6,
        sodiumMg: 240,
        potassiumMg: 680,
        tags: ['High Iron', 'Slow Digestion', 'Local Staple'],
        description: 'Tender braised lean beef in tomato-coriander broth over soft mashed green cooking bananas (matooke) with sliced avocado.'
      },
      {
        name: 'Rolex High-Protein Scramble with Cabbage & Tomatoes',
        meal: 'breakfast',
        prepTime: '8 mins',
        grams: 280,
        kcal: 380,
        p: 26,
        c: 36,
        f: 14,
        fiber: 4,
        sodiumMg: 290,
        potassiumMg: 380,
        tags: ['Street Food Classic', 'High Choline', 'Fast Prep'],
        description: '3 farm-fresh eggs whisked with diced red onions, ripe tomatoes, shredded cabbage, rolled in a warm whole-wheat chapati.'
      },
      {
        name: 'Slow-Simmered Red Kidney Beans with Brown Posho / Ugali',
        meal: 'dinner',
        prepTime: '15 mins',
        grams: 360,
        kcal: 390,
        p: 25,
        c: 64,
        f: 4,
        fiber: 12,
        sodiumMg: 190,
        potassiumMg: 720,
        tags: ['High Fiber', 'Complex Energy', 'Plant Protein'],
        description: 'Hearty spiced red beans stewed with cumin and onions, paired with whole grain maize posho/ugali.'
      },
      {
        name: 'Groundnut Sauce with Steamed Sweet Potatoes & Greens',
        meal: 'lunch',
        prepTime: '15 mins',
        grams: 340,
        kcal: 410,
        p: 20,
        c: 52,
        f: 16,
        fiber: 8,
        sodiumMg: 140,
        potassiumMg: 820,
        tags: ['Monounsaturated Fats', 'Vitamin A', 'Natural Protein'],
        description: 'Silky roasted peanut / groundnut sauce poured over steamed orange-fleshed sweet potatoes and wilted greens.'
      }
    ]
  },

  west_africa: {
    id: 'west_africa',
    name: 'West Africa',
    subtext: 'Grilled Chicken, Jollof, Egusi, Moi-Moi & Plantains',
    countries: ['Nigeria', 'Ghana', 'Senegal', 'Ivory Coast', 'Cameroon'],
    meals: [
      {
        name: 'Grilled Suya Chicken Breast with Steamed Brown Jollof',
        meal: 'dinner',
        prepTime: '20 mins',
        grams: 380,
        kcal: 460,
        p: 48,
        c: 44,
        f: 10,
        fiber: 4,
        sodiumMg: 280,
        potassiumMg: 620,
        tags: ['Suya Spice', 'Lean Poultry', 'Antioxidant Tomato'],
        description: 'Peppered suya-spiced chicken breast served with aromatic brown rice jollof simmered in roasted bell pepper purée.'
      },
      {
        name: 'Steamed Moi-Moi (Black-Eyed Pea Pudding) with Boiled Eggs',
        meal: 'lunch',
        prepTime: '15 mins',
        grams: 300,
        kcal: 330,
        p: 28,
        c: 32,
        f: 10,
        fiber: 7,
        sodiumMg: 210,
        potassiumMg: 510,
        tags: ['Pure Plant Protein', 'Traditional', 'Bioavailable'],
        description: 'Pureed black-eyed beans steamed with peppers, crayfish, and hard-boiled omega-3 eggs.'
      },
      {
        name: 'Oven-Roasted Mackerel with Sautéed Spinach & Roasted Plantain',
        meal: 'dinner',
        prepTime: '18 mins',
        grams: 350,
        kcal: 440,
        p: 40,
        c: 34,
        f: 16,
        fiber: 5,
        sodiumMg: 220,
        potassiumMg: 710,
        tags: ['Omega-3 Dense', 'Wild Fish', 'Iron Rich'],
        description: 'Whole spiced Atlantic mackerel roasted crisp with garlic pepper, served with fresh sautéed spinach greens.'
      }
    ]
  },

  south_asia: {
    id: 'south_asia',
    name: 'South Asia (India / Pakistan)',
    subtext: 'Paneer, Dal Tadka, Tandoori Chicken, Chana & Roti',
    countries: ['India', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal'],
    meals: [
      {
        name: 'Tandoori Spiced Chicken Breast with Cucumber Mint Raita',
        meal: 'dinner',
        prepTime: '15 mins',
        grams: 320,
        kcal: 360,
        p: 50,
        c: 8,
        f: 12,
        fiber: 2,
        sodiumMg: 310,
        potassiumMg: 580,
        tags: ['High Protein', 'Turmeric Anti-Inflammatory', 'Low Carb'],
        description: 'Tender chicken breast charred in tandoori spices and curd, served with fresh cooling mint-cucumber raita.'
      },
      {
        name: 'Yellow Dal Tadka with Brown Basmati & Spinach',
        meal: 'lunch',
        prepTime: '15 mins',
        grams: 380,
        kcal: 380,
        p: 22,
        c: 62,
        f: 6,
        fiber: 10,
        sodiumMg: 260,
        potassiumMg: 690,
        tags: ['High Fiber', 'Gut Healthy', 'Vegetarian Staple'],
        description: 'Slow-cooked yellow lentils tempered with cumin, mustard seeds, garlic, and fresh baby spinach.'
      },
      {
        name: 'Paneer & Bell Pepper Tikka with Whole Wheat Roti',
        meal: 'dinner',
        prepTime: '12 mins',
        grams: 300,
        kcal: 420,
        p: 28,
        c: 34,
        f: 18,
        fiber: 6,
        sodiumMg: 240,
        potassiumMg: 420,
        tags: ['Rich Calcium', 'Vegetarian Muscle', 'Slow Casein'],
        description: 'Grilled artisanal paneer cubes skewers with onions and capsicum, paired with warm whole-wheat roti.'
      }
    ]
  },

  mediterranean: {
    id: 'mediterranean',
    name: 'Mediterranean',
    subtext: 'Greek Salad, Olive Oil, Sea Bass, Lentils & Chickpeas',
    countries: ['Greece', 'Italy', 'Spain', 'Turkey', 'Cyprus'],
    meals: [
      {
        name: 'Pan-Seared Sea Bass with Lemon, Oregano & Wild Greens',
        meal: 'dinner',
        prepTime: '15 mins',
        grams: 320,
        kcal: 360,
        p: 42,
        c: 8,
        f: 16,
        fiber: 3,
        sodiumMg: 210,
        potassiumMg: 640,
        tags: ['Heart Healthy', 'Polyphenols', 'Extra Virgin Olive Oil'],
        description: 'Fresh sea bass fillet seared in Greek extra virgin olive oil with lemon zest, wild capers, and boiled dandelion greens (horta).'
      },
      {
        name: 'Classic Shakshuka with Feta & Crusty Sourdough',
        meal: 'breakfast',
        prepTime: '12 mins',
        grams: 340,
        kcal: 390,
        p: 24,
        c: 36,
        f: 16,
        fiber: 5,
        sodiumMg: 340,
        potassiumMg: 510,
        tags: ['Antioxidant Lycopene', 'Pasture Eggs', 'Gut Fermented'],
        description: 'Three pasture-raised eggs poached in spiced tomato, sweet pepper, and cumin sauce with crumbled authentic sheep feta.'
      }
    ]
  },

  latin_america: {
    id: 'latin_america',
    name: 'Latin America',
    subtext: 'Pollo a la Plancha, Black Beans, Avocado, Ceviche & Arepas',
    countries: ['Mexico', 'Colombia', 'Brazil', 'Peru', 'Argentina', 'Chile'],
    meals: [
      {
        name: 'Pollo a la Plancha with Frijoles Negros & Brown Rice',
        meal: 'lunch',
        prepTime: '15 mins',
        grams: 380,
        kcal: 440,
        p: 48,
        c: 46,
        f: 8,
        fiber: 9,
        sodiumMg: 260,
        potassiumMg: 690,
        tags: ['Lean Protein', 'Prebiotic Beans', 'Clean Carbs'],
        description: 'Garlic-lime marinated grilled chicken breast served with slow-cooked Cuban-style black beans and brown rice.'
      },
      {
        name: 'Fresh Coastal Ceviche with Sweet Potato & Roasted Choclo',
        meal: 'lunch',
        prepTime: '10 mins',
        grams: 320,
        kcal: 290,
        p: 38,
        c: 24,
        f: 3,
        fiber: 4,
        sodiumMg: 290,
        potassiumMg: 520,
        tags: ['Zero Added Oil', 'Pure Protein', 'Citrus Raw'],
        description: 'Fresh white fish cured in key lime juice with red onions, cilantro, Peruvian sweet potato, and Andean corn.'
      }
    ]
  },

  north_america_western: {
    id: 'north_america_western',
    name: 'Global / Western',
    subtext: 'Chicken Breast, Salmon, Oatmeal, Sirloin & Greek Yogurt',
    countries: ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France'],
    meals: [
      {
        name: 'Grilled Herb Chicken with Steamed Broccoli & Rice',
        meal: 'dinner',
        prepTime: '15 mins',
        grams: 350,
        kcal: 390,
        p: 48,
        c: 36,
        f: 6,
        fiber: 4,
        sodiumMg: 190,
        potassiumMg: 620,
        tags: ['Bodybuilder Staple', 'Clean Eating', 'Lean Protein'],
        description: 'Tender grilled chicken breast with seasoned broccoli and brown rice.'
      },
      {
        name: 'Wild Atlantic Salmon Fillet with Asparagus & Quinoa',
        meal: 'dinner',
        prepTime: '15 mins',
        grams: 340,
        kcal: 440,
        p: 38,
        c: 26,
        f: 20,
        fiber: 4,
        sodiumMg: 170,
        potassiumMg: 710,
        tags: ['Omega-3 Heavy', 'Clean Fuel', 'Joint Health'],
        description: 'Oven-baked wild salmon fillet with steamed tender asparagus and fluffy tri-color quinoa.'
      }
    ]
  }
};

/**
 * Silently detects the user's geographical region from browser timezone and locale.
 * Runs completely in the background without user prompts.
 */
export function detectUserRegion(tz = null, locale = null) {
  const timeZone = (tz || localTZ() || '').toLowerCase();
  const lang = (locale || (typeof navigator !== 'undefined' ? navigator.language : 'en-US') || '').toLowerCase();

  // 1. East & Central Africa (Uganda, Kenya, Tanzania, Rwanda, Ethiopia, etc.)
  if (
    timeZone.includes('kampala') ||
    timeZone.includes('nairobi') ||
    timeZone.includes('dar_es_salaam') ||
    timeZone.includes('kigali') ||
    timeZone.includes('addis_ababa') ||
    timeZone.includes('bujumbura') ||
    timeZone.includes('eat') || // East Africa Time
    lang.includes('-ug') ||
    lang.includes('-ke') ||
    lang.includes('-tz') ||
    lang.includes('-rw') ||
    lang.includes('-et')
  ) {
    return {
      id: 'east_africa',
      name: REGIONS.east_africa.name,
      country: timeZone.includes('kampala') || lang.includes('-ug') ? 'Uganda' : 'East Africa',
      subtext: REGIONS.east_africa.subtext,
      isAutoDetected: true
    };
  }

  // 2. West Africa (Nigeria, Ghana, etc.)
  if (
    timeZone.includes('lagos') ||
    timeZone.includes('accra') ||
    timeZone.includes('dakar') ||
    timeZone.includes('abidjan') ||
    timeZone.includes('wat') ||
    lang.includes('-ng') ||
    lang.includes('-gh') ||
    lang.includes('-sn')
  ) {
    return {
      id: 'west_africa',
      name: REGIONS.west_africa.name,
      country: timeZone.includes('lagos') || lang.includes('-ng') ? 'Nigeria' : 'West Africa',
      subtext: REGIONS.west_africa.subtext,
      isAutoDetected: true
    };
  }

  // 3. South Asia (India, Pakistan, etc.)
  if (
    timeZone.includes('calcutta') ||
    timeZone.includes('kolkata') ||
    timeZone.includes('delhi') ||
    timeZone.includes('karachi') ||
    timeZone.includes('colombo') ||
    timeZone.includes('dhaka') ||
    lang.includes('-in') ||
    lang.includes('-pk') ||
    lang.includes('hi')
  ) {
    return {
      id: 'south_asia',
      name: REGIONS.south_asia.name,
      country: 'India / South Asia',
      subtext: REGIONS.south_asia.subtext,
      isAutoDetected: true
    };
  }

  // 4. Mediterranean
  if (
    timeZone.includes('athens') ||
    timeZone.includes('rome') ||
    timeZone.includes('madrid') ||
    timeZone.includes('istanbul') ||
    timeZone.includes('nicosia')
  ) {
    return {
      id: 'mediterranean',
      name: REGIONS.mediterranean.name,
      country: 'Mediterranean',
      subtext: REGIONS.mediterranean.subtext,
      isAutoDetected: true
    };
  }

  // 5. Latin America
  if (
    timeZone.includes('sao_paulo') ||
    timeZone.includes('bogota') ||
    timeZone.includes('mexico_city') ||
    timeZone.includes('buenos_aires') ||
    timeZone.includes('lima') ||
    lang.includes('-mx') ||
    lang.includes('-co') ||
    lang.includes('-br')
  ) {
    return {
      id: 'latin_america',
      name: REGIONS.latin_america.name,
      country: 'Latin America',
      subtext: REGIONS.latin_america.subtext,
      isAutoDetected: true
    };
  }

  // Default to Global / Western
  return {
    id: 'north_america_western',
    name: REGIONS.north_america_western.name,
    country: 'Global / Western',
    subtext: REGIONS.north_america_western.subtext,
    isAutoDetected: true
  };
}

/**
 * Returns available recipes for a specific region ID.
 */
export function getRegionalMeals(regionId = 'east_africa') {
  const reg = REGIONS[regionId] || REGIONS.north_america_western;
  return (reg.meals || []).map(m => ({ ...m, id: uid(), regionId: reg.id }));
}
