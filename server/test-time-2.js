const now = Date.now();
const expiry = new Date(now + 24 * 60 * 60 * 1000);

console.log('Now:', now);
console.log('Expiry:', expiry.getTime());
console.log('Is Expiry < Now?', expiry < now);
console.log('Is Expiry.getTime() < Now?', expiry.getTime() < now);

const past = new Date(now - 1000);
console.log('Past:', past.getTime());
console.log('Is Past < Now?', past < now);
console.log('Is Past.getTime() < Now?', past.getTime() < now);
