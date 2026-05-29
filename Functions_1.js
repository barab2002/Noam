// ex 1 in functions 1
function getLastDigit(number){
    return Math.abs(number % 10);
}
//console.log(getLastDigit(1235))


// ex 2 in functions 1
function getAllButLastDigit(number) {
    const strNum = String(number);
    if (strNum.length === 1){
        return null
    };
    return parseInt(strNum.slice(0,-1), 10);
}
//console.log(getAllButLastDigit(1))
//console.log(getAllButLastDigit(1235))


// ex 3 in functions 1
function getAmountOfDigits(number){
    return String(number).length;
}
//console.log(getAmountOfDigits(1235))


//ex 4 in functions 1
function getDigitInIndex(number, i){
    const strNumRev = String(number).split("").reverse().join("");
    if (i < strNumRev.length){
        return parseInt(strNumRev[i], 10)  
    };
    return 0;
}

//console.log(getDigitInIndex(1235,3))

