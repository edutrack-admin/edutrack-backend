import bcrypt from 'bcryptjs';

const password = '3duTr4ck3r266!';

console.log('Generating bcrypt hash...');
console.log('');

const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash(password, salt);

console.log('═══════════════════════════════════════════════════════════');
console.log('Password:', password);
console.log('═══════════════════════════════════════════════════════════');
console.log('Hash:', hash);
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('✅ Copy the hash above and use it in MongoDB Compass');
console.log('');
console.log('Steps:');
console.log('1. Open MongoDB Compass');
console.log('2. Find the admin user document');
console.log('3. Edit the "password" field');
console.log('4. Replace with the hash above');
console.log('5. Save');
console.log('');
console.log('Then login with:');
console.log('Email: admin@edutrack.com');
console.log('Password:', password);
console.log('');

// Test the hash
const isValid = await bcrypt.compare(password, hash);
console.log('✓ Hash verification test:', isValid ? 'PASSED ✅' : 'FAILED ❌');