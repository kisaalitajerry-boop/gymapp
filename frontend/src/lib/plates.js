// Barbell plate calculator logic (Task 12).
// Calculates plates required per side using a greedy fill algorithm with remainder reporting.

export const DEFAULT_PLATES_LB = [45, 35, 25, 10, 5, 2.5];
export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

export const DEFAULT_BAR_WEIGHT = {
  lb: 45,
  kg: 20
};

/**
 * Normalizes plate inventory into sorted array of { weight, count } descending.
 * Count represents pairs of plates available (1 plate per side = 1 pair).
 */
function normalizePlates(plates, unit) {
  const defaults = unit === 'lb' ? DEFAULT_PLATES_LB : DEFAULT_PLATES_KG;
  const list = plates && plates.length > 0 ? plates : defaults;

  return list
    .map(p => {
      if (typeof p === 'number') return { weight: p, pairs: Infinity };
      return { weight: Number(p.weight), pairs: p.pairs ?? (p.count ? Math.floor(p.count / 2) : Infinity) };
    })
    .filter(p => !isNaN(p.weight) && p.weight > 0)
    .sort((a, b) => b.weight - a.weight);
}

/**
 * Calculates plates per side for a given target barbell load.
 *
 * @param {number} target - Total desired weight including the bar
 * @param {number} barWeight - Weight of the unloaded bar
 * @param {Array<number|object>} availablePlates - Inventory of available plate weights
 * @param {'kg'|'lb'} unit - Unit system ('kg' or 'lb')
 * @returns {object} { plates, plateCounts, target, barWeight, totalLoaded, remainder, unit }
 */
export function platesPerSide(target, barWeight, availablePlates, unit = 'kg') {
  const targetWeight = Math.max(0, Number(target) || 0);
  const bar = barWeight !== undefined && barWeight !== null
    ? Math.max(0, Number(barWeight))
    : (DEFAULT_BAR_WEIGHT[unit] || DEFAULT_BAR_WEIGHT.kg);

  const inventory = normalizePlates(availablePlates, unit);

  if (targetWeight <= bar) {
    return {
      plates: [],
      plateCounts: {},
      target: targetWeight,
      barWeight: bar,
      totalLoaded: bar,
      remainder: targetWeight < bar ? Math.round((bar - targetWeight) * 100) / 100 : 0,
      unit
    };
  }

  // Desired plate weight per side
  let neededPerSide = (targetWeight - bar) / 2;
  const selectedPlates = [];
  const plateCounts = {};

  // Epsilon for float comparisons
  const EPSILON = 0.0001;

  for (const item of inventory) {
    let pairsUsed = 0;
    while (item.weight <= neededPerSide + EPSILON && pairsUsed < item.pairs) {
      selectedPlates.push(item.weight);
      plateCounts[item.weight] = (plateCounts[item.weight] || 0) + 1;
      neededPerSide -= item.weight;
      pairsUsed++;
    }
  }

  const loadedPerSide = selectedPlates.reduce((sum, w) => sum + w, 0);
  const totalLoaded = Math.round((bar + 2 * loadedPerSide) * 100) / 100;
  const remainder = Math.round((targetWeight - totalLoaded) * 100) / 100;

  return {
    plates: selectedPlates,
    plateCounts,
    target: targetWeight,
    barWeight: bar,
    totalLoaded,
    remainder,
    unit
  };
}
