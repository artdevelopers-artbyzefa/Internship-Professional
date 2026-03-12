console.log('Current Date.now():', Date.now());
console.log('Current Date():', new Date().toString());
console.log('24h from now:', new Date(Date.now() + 24 * 60 * 60 * 1000).toString());

const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
const now = Date.now();

console.log('expiry (Date object) < now (Number):', expiry < now);
console.log('expiry.getTime() < now:', expiry.getTime() < now);

const pastExpiry = new Date(Date.now() - 1000);
console.log('pastExpiry (Date object) < now (Number):', pastExpiry < now);
