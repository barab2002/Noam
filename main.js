import { Address } from './Address.js';
import { Person } from './Person.js';
import { PhoneCall } from './PhoneCall.js';
import { CallSystem } from './CallSystem.js';


const azulaAddress = new Address(
    'Fire Nation',
    'Royal Caldera City',
    'Royal Quarters',
    '1'
);

const azula = new Person(
    '56789',
    'Azula',
    '',
    17,
    'Princess of the Fire Nation',
    'Ruthless princess enforcing the rule of her father',
    azulaAddress
);

const callLocation = new Address(
    'Fire Nation',
    'Royal Caldera City',
    'Main Cell Tower Area',
    'N/A'
);

const call = new PhoneCall(
    'call-001',
    'Samsung',
    '0501234567',
    '123456789012345',
    'PSTN-001',
    '987654321',
    callLocation,
    '3 minutes'
);

const system = new CallSystem();

system.addPerson(azula);
system.addCall(call);
system.attachCallToPerson('56789', 'call-001');

console.log('--- All People ---');
console.log(system.getAllPeople());

console.log('--- All Calls ---');
console.log(system.getAllCalls());

console.log('--- Calls By Person ---');
console.log(system.getCallsByPerson('56789'));

console.log('--- Calls By Phone Number ---');
console.log(system.getCallsByPhoneNumber('0501234567'));
