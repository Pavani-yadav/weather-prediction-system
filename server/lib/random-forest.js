/**
 * server/lib/random-forest.js
 * Real JavaScript Random Forest Classifier.
 * - DecisionTree: CART, Gini impurity, max depth, min samples split, feature bagging
 * - RandomForest: n_estimators trees, bootstrap aggregation, majority vote,
 *   soft probability via class vote share, feature importance via permutation.
 *
 * Used at runtime by /api/ml/predict. The Python scikit-learn version
 * (scripts/train_random_forest.py) is the canonical training source.
 */
'use strict';

const FEATURE_NAMES = ['temperature', 'humidity', 'windSpeed', 'pressure', 'cloudCover', 'visibility'];
const CLASS_NAMES = ['Sunny', 'Cloudy', 'Rainy', 'Stormy', 'Foggy', 'Snowy'];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function classDistribution(labels) {
  const out = {};
  for (const l of labels) out[l] = (out[l] || 0) + 1;
  return out;
}

function giniImpurity(labels) {
  if (labels.length === 0) return 0;
  const dist = classDistribution(labels);
  let sum = 0;
  for (const k of Object.keys(dist)) {
    const p = dist[k] / labels.length;
    sum += p * p;
  }
  return 1 - sum;
}

function majorityLabel(labels) {
  const dist = classDistribution(labels);
  let best = 'Sunny';
  let bestCount = -1;
  for (const k of Object.keys(dist)) {
    if (dist[k] > bestCount) { bestCount = dist[k]; best = k; }
  }
  return best;
}

function distributionToProba(dist) {
  const total = Object.values(dist).reduce((s, v) => s + v, 0) || 1;
  const out = { Sunny: 0, Cloudy: 0, Rainy: 0, Stormy: 0, Foggy: 0, Snowy: 0 };
  for (const k of Object.keys(dist)) out[k] = +(dist[k] / total).toFixed(4);
  return out;
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function bootstrapSample(items, rng) {
  const n = items.length;
  const out = [];
  for (let i = 0; i < n; i++) out.push(items[Math.floor(rng() * n)]);
  return out;
}

class DecisionTree {
  constructor(maxDepth = 8, minSamplesSplit = 2, rng = Math.random, nFeatures) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.rng = rng;
    this.nFeaturesToConsider = nFeatures ?? Math.max(2, Math.floor(Math.sqrt(FEATURE_NAMES.length)));
    this.root = null;
  }

  fit(samples) { this.root = this.build(samples, 0); }

  build(samples, depth) {
    const labels = samples.map((s) => s.label);
    const distribution = classDistribution(labels);
    const majority = majorityLabel(labels);
    if (depth >= this.maxDepth || samples.length < this.minSamplesSplit || Object.keys(distribution).length === 1) {
      return { leaf: true, label: majority, probabilities: distributionToProba(distribution) };
    }
    const split = this.findBestSplit(samples);
    if (!split) return { leaf: true, label: majority, probabilities: distributionToProba(distribution) };
    const left = samples.filter((s) => s.features[split.feature] <= split.threshold);
    const right = samples.filter((s) => s.features[split.feature] > split.threshold);
    if (left.length === 0 || right.length === 0) {
      return { leaf: true, label: majority, probabilities: distributionToProba(distribution) };
    }
    return {
      leaf: false, feature: split.feature, threshold: split.threshold,
      left: this.build(left, depth + 1), right: this.build(right, depth + 1),
    };
  }

  findBestSplit(samples) {
    let bestGini = Infinity;
    let best = null;
    const featureIdx = FEATURE_NAMES.map((_, i) => i);
    shuffle(featureIdx, this.rng);
    const featuresToTry = featureIdx.slice(0, this.nFeaturesToConsider);
    for (const f of featuresToTry) {
      const values = samples.map((s) => s.features[f]).sort((a, b) => a - b);
      const step = Math.max(1, Math.floor(values.length / 20));
      for (let i = step; i < values.length; i += step) {
        if (values[i] === values[i - 1]) continue;
        const threshold = (values[i] + values[i - 1]) / 2;
        const left = samples.filter((s) => s.features[f] <= threshold);
        const right = samples.filter((s) => s.features[f] > threshold);
        if (left.length === 0 || right.length === 0) continue;
        const gini = (left.length / samples.length) * giniImpurity(left.map((s) => s.label)) +
                     (right.length / samples.length) * giniImpurity(right.map((s) => s.label));
        if (gini < bestGini) { bestGini = gini; best = { feature: f, threshold }; }
      }
    }
    return best;
  }

  predict(features) { return this.predictNode(features, this.root).label; }
  predictProba(features) { return this.predictNode(features, this.root).probabilities; }
  predictNode(features, node) {
    if (node.leaf) return node;
    if (features[node.feature] <= node.threshold) return this.predictNode(features, node.left);
    return this.predictNode(features, node.right);
  }
}

class RandomForest {
  constructor(nEstimators = 100, maxDepth = 8, minSamplesSplit = 2, seed = 42) {
    this.nEstimators = nEstimators;
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.seed = seed;
    this.trees = [];
  }

  fit(samples) {
    const rng = mulberry32(this.seed);
    this.trees = [];
    for (let i = 0; i < this.nEstimators; i++) {
      const bootstrap = bootstrapSample(samples, rng);
      const tree = new DecisionTree(this.maxDepth, this.minSamplesSplit, rng);
      tree.fit(bootstrap);
      this.trees.push(tree);
    }
  }

  predict(features) {
    const votes = {};
    for (const tree of this.trees) {
      const v = tree.predict(features);
      votes[v] = (votes[v] || 0) + 1;
    }
    let best = 'Sunny'; let bestCount = -1;
    for (const k of Object.keys(votes)) {
      if (votes[k] > bestCount) { bestCount = votes[k]; best = k; }
    }
    return best;
  }

  predictProba(features) {
    const sums = { Sunny: 0, Cloudy: 0, Rainy: 0, Stormy: 0, Foggy: 0, Snowy: 0 };
    for (const tree of this.trees) {
      const p = tree.predictProba(features);
      for (const c of CLASS_NAMES) sums[c] += p[c];
    }
    const total = this.trees.length || 1;
    const out = {};
    for (const c of CLASS_NAMES) out[c] = +(sums[c] / total).toFixed(4);
    return out;
  }

  confidence(features) {
    const p = this.predictProba(features);
    return Math.max(...CLASS_NAMES.map((c) => p[c]));
  }

  computeFeatureImportance(testSamples) {
    const baseline = this.evaluate(testSamples).accuracy;
    const importances = FEATURE_NAMES.map((name, idx) => {
      const permuted = testSamples.map((s) => {
        const copy = [...s.features];
        copy[idx] = testSamples[Math.floor(Math.random() * testSamples.length)].features[idx];
        return { features: copy, label: s.label };
      });
      const dropped = this.evaluate(permuted).accuracy;
      return { feature: name, importance: +(Math.max(0, baseline - dropped)).toFixed(4) };
    });
    const sum = importances.reduce((s, x) => s + x.importance, 0) || 1;
    return importances.map((x) => ({ ...x, importance: +(x.importance / sum).toFixed(4) }));
  }

  evaluate(testSamples) {
    const matrix = CLASS_NAMES.map(() => CLASS_NAMES.map(() => 0));
    for (const s of testSamples) {
      const pred = this.predict(s.features);
      const ai = CLASS_NAMES.indexOf(s.label);
      const pi = CLASS_NAMES.indexOf(pred);
      matrix[ai][pi]++;
    }
    let correct = 0;
    for (let i = 0; i < CLASS_NAMES.length; i++) correct += matrix[i][i];
    const accuracy = +(correct / (testSamples.length || 1)).toFixed(4);
    const perClass = {};
    for (let i = 0; i < CLASS_NAMES.length; i++) {
      const c = CLASS_NAMES[i];
      const tp = matrix[i][i];
      const fp = matrix.reduce((s, row, ri) => (ri === i ? s : s + row[i]), 0);
      const fn = matrix[i].reduce((s, v, ci) => (ci === i ? s : s + v), 0);
      const support = matrix[i].reduce((s, v) => s + v, 0);
      const precision = tp + fp === 0 ? 0 : +(tp / (tp + fp)).toFixed(4);
      const recall = tp + fn === 0 ? 0 : +(tp / (tp + fn)).toFixed(4);
      const f1 = precision + recall === 0 ? 0 : +((2 * precision * recall) / (precision + recall)).toFixed(4);
      perClass[c] = { precision, recall, f1, support };
    }
    return { accuracy, confusionMatrix: matrix, perClass };
  }
}

/**
 * Generate synthetic training data with realistic feature→label rules.
 * Mirrors the rules in scripts/train_random_forest.py.
 */
function generateTrainingData(n = 2000, seed = 42) {
  const rng = mulberry32(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const temp = +(rng() * 45 - 5).toFixed(1);
    const humidity = Math.round(rng() * 100);
    const windSpeed = +(rng() * 50 + 1).toFixed(1);
    const pressure = +(990 + rng() * 40).toFixed(1);
    const cloudCover = Math.round(rng() * 100);
    const visibility = +(rng() * 20 + 0.5).toFixed(1);
    let label;
    // Clear, non-overlapping rules (checked in priority order)
    if (temp < 2 && humidity > 70) label = 'Snowy';
    else if (visibility < 3) label = 'Foggy';
    else if (pressure < 1000 && windSpeed > 25) label = 'Stormy';
    else if (humidity > 80 && cloudCover > 70) label = 'Rainy';
    else if (cloudCover > 60 && humidity <= 80) label = 'Cloudy';  // humidity guard prevents Rainy overlap
    else if (cloudCover > 60 && humidity > 80 && cloudCover <= 70) label = 'Cloudy';  // edge case
    else if (cloudCover >= 30 && cloudCover <= 60) label = 'Cloudy';
    else label = 'Sunny';
    out.push({ features: [temp, humidity, windSpeed, pressure, cloudCover, visibility], label });
  }
  return out;
}

function trainAndEvaluate(opts = {}) {
  const nEstimators = opts.nEstimators ?? 100;
  const maxDepth = opts.maxDepth ?? 8;
  const samples = opts.samples ?? 2000;
  const seed = opts.seed ?? 42;
  const data = generateTrainingData(samples, seed);
  const split = Math.floor(data.length * 0.8);
  const train = data.slice(0, split);
  const test = data.slice(split);
  const model = new RandomForest(nEstimators, maxDepth, 2, seed);
  model.fit(train);
  const evalResult = model.evaluate(test);
  const featureImportance = model.computeFeatureImportance(test);
  const metrics = {
    ...evalResult, featureImportance,
    trainingSamples: train.length, testSamples: test.length,
    nEstimators, maxDepth, trainedAt: new Date().toISOString(),
  };
  return { model, metrics };
}

let cachedModel = null;
let cachedMetrics = null;

function getModel() {
  if (cachedModel && cachedMetrics) return { model: cachedModel, metrics: cachedMetrics };
  const { model, metrics } = trainAndEvaluate();
  cachedModel = model;
  cachedMetrics = metrics;
  return { model, metrics };
}

function resetModel() {
  cachedModel = null;
  cachedMetrics = null;
}

module.exports = {
  FEATURE_NAMES, CLASS_NAMES, DecisionTree, RandomForest,
  generateTrainingData, trainAndEvaluate, getModel, resetModel,
};
