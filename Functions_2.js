//ex 1 functions 2
// this function will check if the number is a palindrome or not, assuming integers only and without casting the integer into a string.
const isPalindrome = number => {
    if (number < 0 || ( number % 10 === 0 && number!== 0)){
        return false;
    }
    let revHalf = 0;
    while (number > revHalf) {
        revHalf = (revHalf * 10) + (number % 10);
        number = Math.floor(number / 10);
    }
    return number === revHalf || number === Math.floor(revHalf / 10);
}
//console.log(isPalindrome(123217))

//ex 2 functions 2
//we will use the mathematical method (perfect square) to check if the number is in the fibo series.
const isFromFibonacci = number => {
    const sqrtPlus = Math.sqrt(5 * number * number + 4);
    const sqrtMinus = Math.sqrt(5 * number * number - 4);
    return Number.isInteger(sqrtPlus) || Number.isInteger(sqrtMinus);
}

//console.log(isFromFibonacci(13))

//ex 3 functions 3
// base and exponent and natural numbers
const recursivePower = (base, exponent) => {
    if (exponent === 0) {
        return 1;
    }

    if (exponent === 1) {
        return base;
    }

    const halfPower = recursivePower(base, Math.floor(exponent / 2));

    if (exponent % 2 === 0) {
        return halfPower * halfPower;
    }

    return base * halfPower * halfPower;
};
//console.log(recursivePower(2,5));
