//ex 1 Write a JavaScript program to get the current date (mm-dd-yyyy, mm/dd/yyyy)
const getDateOfToday = (separator) => {
    if (separator !== '-' && separator !== '/') {
        throw new Error (`invalid separator, expected '-' or '/', received ${separator}`);
    }
    const today = new Date();
    const day =  String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = String(today.getFullYear());
    return month + separator + day + separator + year;
}

//ex 2 Write a JavaScript program to rotate the string 'w3resource' in right direction by
//periodically removing one letter from the end of the string and attaching it to the front.
const rotateRight = (str) => {
    console.log(str)
    for (let i = 0; i < str.length; i++){
        const last = str.slice(-1); //str slice(-1) gets the last character
        const allButLast = str.slice(0, -1); // gets al but last character
        str = last + allButLast;
        console.log(str);
    }
}


//ex3 Write a JavaScript program to convert temperatures to and from Celsius, Fahrenheit. c/5 = (f-32)/9 

const tempConverter = (temp, targetSystem) => {
    const validSystemInputs = ['C', 'c', 'F', 'f'];
    if (!validSystemInputs.includes(targetSystem)) {
        throw new Error (`invalid target system, expected 'C', 'c', 'F', 'f' | received ${targetSystem}`);
    } 
    if (typeof temp !== 'number' || !Number.isFinite(temp)) {
        throw new Error (`only integer input is valid as temperature`)
    }
    const system = targetSystem.toUpperCase();
    if (system === 'F') {
        const result = 9/5 * temp + 32;
        return (`${temp}°C is ${result}°${system}`);
    }
    else if (system === 'C') {
        const result = (5*((temp-32)/9));
        return (`${temp}°F is ${result}°${system}`);
    }
}

//ex4 Write a JavaScript program that accept two integers and display the larger
const largerNum = (num1, num2) => {
    if (!Number.isInteger(num1) || !Number.isInteger(num2)) {
        throw new Error ('Only numbers allowed as input');
    }
    if (num1 > num2) return num1;
    if (num1 < num2) return num2;
    return num1;
    
}



//ex 10 write a JS function to clone an array
const cloneArr = (arr) => {
    if (!Array.isArray(arr)) {
        throw new Error('only arrays are valid inputs');
    }
    const clonedArr = [...arr];
    return cloneArr
}


//ex 14  Write a JavaScript function to merge two arrays and removes all duplicates elements
const mergeArrays = (arr1, arr2) => {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)){
        throw new Error ('both inputs must be arrays')
    }
    return [...new Set(arr1.concat(arr2))];
}


//ex 12 find duplicate values in an array and print them all
const findDuplicates = (arr) => {
    if (!Array.isArray(arr)) {
        throw new Error ('only array input is valid')
    }
    let duplicates = new Set ()
    let seen = new Set()
    for (let i = 0; i < arr.length; i++) {
        if (seen.has(arr[i])) {
            console.log(`${arr[i]} is a duplicate value at index ${i}`)
            duplicates.add(arr[i])
        }
        else {
            seen.add(arr[i])
        }
    }
    return [...duplicates]
}


//ex13 Write a JavaScript function to sort the following array of objects by title value
const sortArrayObjects = (arr) => {
    if (!Array.isArray(arr)) {
        throw new Error ('only arrays are valid inputs');
    }
    const cloned = [...arr];
    cloned.sort((a,b) => a.title.localeCompare(b.title));
    return cloned;
}


const isValidJSON = (value) => {
    if (typeof value !== 'string') {
        return false;
    }
    try {
        JSON.parse(value)
        return true;
    }
    catch (error) {
        return false;
    }
}

console.log(isValidJSON('{"name":"Zuko"}')); // true
console.log(isValidJSON('{name:"Zuko"}'));   // false
console.log(isValidJSON('[1,2,3]'));         // true
console.log(isValidJSON('hello'));           // false
console.log(isValidJSON('"hello"'));         // true
console.log(isValidJSON('true'));            // true
console.log(isValidJSON('null'));            // true