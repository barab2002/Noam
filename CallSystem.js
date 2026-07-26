import { Person } from './Person.js';
import { PhoneCall } from './PhoneCall.js';

export class CallSystem {
    constructor() {
        this.people = [];
        this.calls = [];
    }
    addPerson(person) {
        if (!(person instanceof Person)) {
            throw new Error ('Only person that is from the Person class is allowed as input'); // checks that the input is an instance of the built class - Person.
        }
        const exists = this.people.some(existingPerson => existingPerson.id === person.id); // searches the array if the person already exists within the array, via the unique identfier ID.
        if (exists) {
            throw new Error ('Person already exists');
        }
        this.people.push(person);
    }

    addCall(call){
        if (!(call instanceof PhoneCall)) {
            throw new Error ('input must be an instance of PhoneCall');
        }
        const exists = this.calls.some(existingCall => existingCall.callId === call.callId); // searches the array if the call already exits via the unique identfier ID.
        if (exists) {
            throw new Error (`call with ${call.callId} already exists`)
        }
        this.calls.push(call);
    }

    removePerson(id) {
        const idExists = this.people.some(existingPerson => existingPerson.id === id);
        if (!idExists) {
            throw new Error ('Person is not inside people array, so it cant be removed');
        }
        this.people = this.people.filter(person => person.id !== id);
        return [...this.people]
    }

    removeCall(callId) {
        const callExists = this.calls.some(existingCall => existingCall.callId === callId);
        if (!callExists) {
            throw new Error ('Call is not inside call array, so it cant be removed');
        }
        this.calls = this.calls.filter (call => call.callId !== callId);
        // remove the call from the person's call id's
        this.people.forEach((person) => {
            person.callIds = person.callIds.filter(personCallId => personCallId !== callId)
        })
        return [...this.calls]
    }

    attachCallToPerson(personId, callId) {
        const person = this.people.find(person => person.id === personId);
        if (person === undefined){
            throw new Error ('Person not found')
        }
        const call = this.calls.find(call => call.callId === callId);
        if (call === undefined) {
            throw new Error ('Call not found')
        }
        if (person.callIds.includes(callId)) {
            throw new Error ('Call already attached to person');
        }

        person.callIds.push(callId);
    }

    getCallsByPerson(personId) {
        const person = this.people.find(person => person.id === personId);
        if (person === undefined) {
            throw new Error ('Person not found');
        }
        const personCalls = this.calls.filter(call => person.callIds.includes(call.callId));
        return [...personCalls];

    }

    getCallsByPhoneNumber(phoneNumber) {
        if (typeof phoneNumber !== 'string') {
            throw new Error ('phoneNumber must be a string');
        }
        const callsByNum = this.calls.filter(call => call.phoneNumber === phoneNumber);
        return [...callsByNum];

    }

    getAllPeople() {
        return [...this.people];
    }

    getAllCalls() {
        return [...this.calls];
    }
}