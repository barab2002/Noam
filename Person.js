export class Person {
    constructor(id, firstName, lastName, age, role, description, address, callIds) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.age = age;
        this.role = role;
        this.description = description;
        this.address = address;
        this.callIds = [];
    }

    getFullName() {
        if (!this.lastName) {
            return this.firstName;
        }
        return `${this.firstName} ${this.lastName}`;
    }

    getProfile() {
        const addressText = this.address ? this.address.getFullAddress() : "No address available";
        return `${this.getFullName()} is ${this.age} years old, Role: ${this.role}. Description: ${this.description}, Address: ${addressText}`;
    }
}
