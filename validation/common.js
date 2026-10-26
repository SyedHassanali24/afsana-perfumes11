const { z } = require('zod');
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const num = (schema) => z.preprocess((v) => (v === undefined || v === '' ? undefined : Number(v)), schema);
const bool = z.preprocess((v) => (v === 'true' || v === '1' || v === true ? true : v === undefined ? undefined : false), z.boolean().optional());
const paging = { page: num(z.number().int().min(1).default(1)), limit: num(z.number().int().min(1).max(100).default(20)) };
const confirmPassword = z.string().max(200).optional();
module.exports = { z, objectId, num, bool, paging, confirmPassword };
