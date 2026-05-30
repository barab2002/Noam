//all number inputs in this excersize are natural numbers (positive integers!)
//changed to arrow functions

// ex 1 in functions 1
const getLastDigit = number => number % 10;
//console.log(getLastDigit(1235))


// ex 2 in functions 1
const getAllButLastDigit = number => {
    const strNum = String(number);
    if (strNum.length === 1){
        return null;
    }
    return parseInt(strNum.slice(0,-1), 10);
}
//console.log(getAllButLastDigit(1))
//console.log(getAllButLastDigit(1235))


// ex 3 in functions 1
const getAmountOfDigits = number => String(number).length;
//console.log(getAmountOfDigits(1235))


//ex 4 in functions 1
const getDigitInIndex = (number, i) => {
    const strNum = String(number)
    if(i >= strNum.length){
        return 0;
    }
    return parseInt(strNum[strNum.length - 1 - i], 10);
}
//console.log(getDigitInIndex(1235,0))

const testNumbers = [1, 7, 12, 1235, 1000, 90001];

testNumbers.forEach(num => {
    console.log("Number:", num);
    console.log("Last digit:", getLastDigit(num));
    console.log("All but last digit:", getAllButLastDigit(num));
    console.log("Amount of digits:", getAmountOfDigits(num));
    console.log("Digit index 0:", getDigitInIndex(num, 0));
    console.log("Digit index 1:", getDigitInIndex(num, 1));
    console.log("-----");
});