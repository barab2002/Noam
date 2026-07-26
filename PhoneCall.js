export class PhoneCall {
    constructor (callId, manufacturer, phoneNumber, imei, pstn, imsi, location, duration) {
        this.callId = callId;
        this.manufacturer = manufacturer;
        this.phoneNumber = phoneNumber;
        this.imei = imei;
        this.pstn = pstn;
        this.imsi = imsi;
        this.location = location;
        this.duration = duration;
    }
    getCallSummary() {
        const locationText = this.location && this.location.city ? this.location.city: "not available";
        return `the call was made from a ${this.manufacturer} phone in number ${this.phoneNumber}, with imei ${this.imei} and imsi ${this.imsi}.
            the location of the caller was ${locationText} and the call's duration was ${this.duration}`;
    }
}