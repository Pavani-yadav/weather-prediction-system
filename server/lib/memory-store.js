/**
 * server/lib/memory-store.js
 * In-memory MongoDB-shaped store (Map-based). Used when MONGODB_URI is unset.
 * Mimics Mongoose collection API so route handlers don't change.
 */
'use strict';

const collections = {
  users: new Map(),
  searchhistory: new Map(),
  favoritelocations: new Map(),
  alerts: new Map(),
  weathersnapshots: new Map(),
};

const uid = () => 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function matches(record, query) {
  for (const key of Object.keys(query || {})) {
    const cond = query[key];
    if (cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date)) {
      const val = record[key];
      if ('$eq' in cond && val !== cond.$eq) return false;
      if ('$ne' in cond && val === cond.$ne) return false;
      if ('$gte' in cond && !(new Date(val) >= new Date(cond.$gte))) return false;
      if ('$lte' in cond && !(new Date(val) <= new Date(cond.$lte))) return false;
      if ('$gt' in cond && !(new Date(val) > new Date(cond.$gt))) return false;
      if ('$lt' in cond && !(new Date(val) < new Date(cond.$lt))) return false;
      if ('$in' in cond && !cond.$in.includes(val)) return false;
    } else {
      if (record[key] !== cond) return false;
    }
  }
  return true;
}

function sortRecords(arr, sort) {
  if (!sort) return arr;
  const [field, dir] = Object.entries(sort)[0];
  const mult = dir === -1 ? -1 : 1;
  return [...arr].sort((a, b) => {
    const av = a[field] instanceof Date ? a[field].getTime() : a[field];
    const bv = b[field] instanceof Date ? b[field].getTime() : b[field];
    if (av < bv) return -1 * mult;
    if (av > bv) return 1 * mult;
    return 0;
  });
}

function makeColl(name) {
  return {
    async create(data) {
      if (Array.isArray(data)) return data.map((d) => doc(name, d));
      return doc(name, data);
    },
    async find(query = {}, opts = {}) {
      const all = Array.from(collections[name].values()).filter((r) => matches(r, query));
      const sorted = sortRecords(all, opts.sort);
      let result = sorted;
      if (opts.skip) result = result.slice(opts.skip);
      if (opts.limit) result = result.slice(0, opts.limit);
      return result;
    },
    async findOne(query = {}) {
      return Array.from(collections[name].values()).find((r) => matches(r, query)) || null;
    },
    async findById(id) {
      return collections[name].get(id) || null;
    },
    async findByIdAndUpdate(id, update) {
      const existing = collections[name].get(id);
      if (!existing) return null;
      const merged = { ...existing, ...(update.$set || update), updatedAt: new Date() };
      collections[name].set(id, merged);
      return merged;
    },
    async findOneAndUpdate(query, update, opts = {}) {
      const existing = await this.findOne(query);
      if (!existing) {
        if (opts.upsert) return doc(name, { ...query, ...(update.$set || update) });
        return null;
      }
      const merged = { ...existing, ...(update.$set || update), updatedAt: new Date() };
      collections[name].set(existing._id, merged);
      return merged;
    },
    async findByIdAndDelete(id) {
      const existing = collections[name].get(id);
      collections[name].delete(id);
      return existing || null;
    },
    async deleteOne(query = {}) {
      for (const [id, record] of collections[name].entries()) {
        if (matches(record, query)) {
          collections[name].delete(id);
          return { deletedCount: 1 };
        }
      }
      return { deletedCount: 0 };
    },
    async deleteMany(query = {}) {
      let count = 0;
      for (const [id, record] of collections[name].entries()) {
        if (matches(record, query)) {
          collections[name].delete(id);
          count++;
        }
      }
      return { deletedCount: count };
    },
    async countDocuments(query = {}) {
      return Array.from(collections[name].values()).filter((r) => matches(r, query)).length;
    },
  };
}

function doc(name, obj) {
  const _id = obj._id || uid();
  const now = new Date();
  const record = { ...obj, _id, createdAt: obj.createdAt || now, updatedAt: now, __v: 0 };
  collections[name].set(_id, record);
  return record;
}

const memoryDb = {
  users: makeColl('users'),
  searchhistory: makeColl('searchhistory'),
  favoritelocations: makeColl('favoritelocations'),
  alerts: makeColl('alerts'),
  weathersnapshots: makeColl('weathersnapshots'),
};

const isUsingMemory = !process.env.MONGODB_URI;

module.exports = { memoryDb, isUsingMemory };
