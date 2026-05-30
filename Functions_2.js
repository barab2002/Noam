// we assume all inputs are valid, so theres no need to check for edge cases.
//ex 1 functions 2
// this function will work for both numbers and numbers in string format 
const isPalindrome = number => {
    const strNum = String(number);
    const rev = strNum.split("").reverse().join("");
    return strNum === rev;
}
//console.log(isPalindrome(12321))

//ex 2 functions 2
//we will use the mathemtical method (perfect square) to check if the number is in the fibo series.
const isFromFibonacci = number => {
    const one = Math.sqrt(5 * number * number + 4);
    const two = Math.sqrt(5 * number * number - 4);
    return Number.isInteger(one) || Number.isInteger(two);
}

//console.log(isFromFibonacci(13))

//ex 3 functions 3
// i hate recursive functions, always did.
// x and y and natural numbers
const recursivePower = (x, y) => {
    if (y === 0) {
        return 1;
    }

    return x * recursivePower(x, y - 1);
};
//console.log(recursivePower(2,5))
