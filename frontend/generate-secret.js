#!/usr/bin/env node

/**
 * Generate a random secret for NEXTAUTH_SECRET
 * Run: node generate-secret.js
 */

const crypto = require('crypto');

const secret = crypto.randomBytes(32).toString('base64');

console.log('\n🔐 Generated NEXTAUTH_SECRET:\n');
console.log(secret);
console.log('\n📋 Copy this value to Vercel Environment Variables\n');
