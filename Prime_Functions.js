const isPrime = num => {
    if (!Number.isInteger(num) || num <= 1) {
        throw new Error(`isPrime: input must be an integer greater than 1. Received: ${num}`);
    }
    if (num === 2) return true;
    if (num % 2 === 0) return false;
    const root = Math.sqrt(num);
    for (let i = 3; i <= root; i += 2) {
        if (num % i === 0) {
            return false;
        }
    }
    return true;
};



const findNthPrime = n => {
    if (!Number.isInteger(n) || n < 1) {
        throw new Error(`findNthPrime: input must be a positive integer. Received ${n}`);
    }
    if (n === 1) return 2;
    let primesCount = 1;
    let currentNumber = 3;
    while (primesCount < n) {
        if (isPrime(currentNumber)) {
            primesCount++;

            if (primesCount === n) {
                return currentNumber;
            }
        }
        currentNumber += 2;
    }
};


const findPrimeDivisors = num => {
    if (!Number.isInteger(num) || num < 1) {
        throw new Error(`findPrimeDivisors: input must be a positive integer. Received ${num}`)
    }
    const divisors = [];
    if (num % 2 === 0) {
        divisors.push(2);

        while (num % 2 === 0) {
            num /= 2;
        }
    }
    for (let i = 3; i * i <= num; i += 2) {
        if (num % i === 0) {
            divisors.push(i);
            while (num % i === 0) {
                num /= i;
            }
        }
    }
    if (num > 1) {
        divisors.push(num);
    }
    return divisors;
};

const firstPrimeLargerThan = num => {
    if (!Number.isInteger(num)){
        throw new Error (`firstPrimeLargerThan: Input must be a integer. Received ${num}`);
    } 
    if (num < 2) return 2; //checking for negative inputs which are still valid inputs, the answer will always be 2
    let candidate = num + 1;
    if (candidate % 2 === 0) candidate ++;
    while(true){
        if (isPrime(candidate)) return candidate;
        candidate += 2;
    }
};




