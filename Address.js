export class Address {
    constructor(country, city, street, houseNumber, floor, apartmentNumber) {
        this.country = country;
        this.city = city;
        this.street = street;
        this.houseNumber = houseNumber;
        this.floor = floor;
        this.apartmentNumber = apartmentNumber;
    }

    getFullAddress() {
        const addressParts = [
            this.country,
            this.city,
            `${this.street} ${this.houseNumber}`
        ];

        if (this.floor) addressParts.push(`floor ${this.floor}`);
        if (this.apartmentNumber) addressParts.push(`apartment ${this.apartmentNumber}`);

        return addressParts.join(', ');
    }
}