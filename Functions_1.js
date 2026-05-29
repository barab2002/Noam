// ex 1 in functions 1
function GetLastDigit(number){
    return Math.abs(number % 10);
}
//console.log(GetLastDigit(1235))


// ex 2 in functions 1
function GetAllButLastDigit(number) {
    const str_num = String(number);
    if (str_num.length === 1){
        return null
    };
    return parseInt(str_num.slice(0,-1), 10);
}
//console.log(GetAllButLastDigit(1))
//console.log(GetAllButLastDigit(1235))


// ex 3 in functions 1
function GetAmountOfDigits(number){
    return String(number).length;
}
//console.log(GetAmountOfDigits(1235))


//ex 4 in functions 1
function GetDigitInIndex(number, i){
    const str_num_rev = String(number).split("").reverse().join("");
    if (i >= 0 && i < str_num_rev.length){
        return parseInt(str_num_rev[i], 10)  
    };
    return 0;
}

//console.log(GetDigitInIndex(1235,17))