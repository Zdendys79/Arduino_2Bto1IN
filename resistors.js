// resistors.js
/* This program searches for the best combination of resistor values (R0, R1 and R2)
   so that the voltage values between R0 and R1 are as close as possible to the specified {target voltages}.
   Voltage states are created for one Arduino input (0 - 5V) using two buttons and 3 resistors in series.

   The target voltages are the values of a total of 4 voltage states created by pressing a combination of two buttons.
   Each of them is connected in parallel with the corresponding resistor (T1 => R1, T2 => R2)
   and when pressed causes its resistivity to zero - "shorts the resistor".
   - idle state => 4.8V,
   - pressed T1 => 3.2V,
   - pressed T2 => 1.6V,
   - both buttons pressed => 0V

   The Arduino input needs to be protected with a 10k resistor and a zener diode (5.1V to GND)
   with a small parallel 100nF capacitor (against contact wobbles).

Author: Zdendys79
Created on 12/31/2023 with the generous help of ChatGPT v4.
*/

const E12_series = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
const targetVoltages = [4.8, 3.2, 1.6, 0]; // 
const maxPowerLoss = 20; // mW
const combinationTolerance = 0.05; // ingore <5% serial/parralel combination values
// 0.01 => 1% => 919 simple/serial/parralel resistor combinations => number of iterations ~7.5e+8
// 0.02 => 2% => 540 simple/serial/parralel resistor combinations => number of iterations ~1.5e+8
// 0.05 => 5% => 214 simple/serial/parralel resistor combinations => number of iterations ~9.8e+6
// 0.10 => 10% => 98 simple/serial/parralel resistor combinations => number of iterations ~9.4e+5
// 0.20 => 20% => 60 only simple resistors (no serial/parralel variants added) => number of iterations ~2.2e+5
const Ucc = 36; // Volts

function generateResistors(E12_series) {
    const resistors = new Set();
    E12_series.forEach(value => {
        for (let exp = 0; exp <= 5; exp++) {
            addResistorIfUnique(resistors, { value: value * 10 ** exp, description: `${formatResistorValue(value * 10 ** exp)}` });
        }
    });

    // A combination of two resistors connected in series or parallel
    E12_series.forEach(R1 => {
        E12_series.forEach(R2 => {
            for (let exp1 = 0; exp1 <= 5; exp1++) {
                for (let exp2 = 0; exp2 <= 5; exp2++) {
                    const valueR1 = R1 * 10 ** exp1;
                    const valueR2 = R2 * 10 ** exp2;
                    const seriesValue = seriesResistor(valueR1, valueR2);
                    const parallelValue = parallelResistor(valueR1, valueR2);
                    addResistorIfUnique(resistors, { value: seriesValue, description: `${formatResistorValue(valueR1)} + ${formatResistorValue(valueR2)} (series)` });
                    addResistorIfUnique(resistors, { value: parallelValue, description: `${formatResistorValue(valueR1)} || ${formatResistorValue(valueR2)} (parallel)` });
                }
            }
        });
    });

    console.log('Number of calculated resistor combinations: ' + resistors.size);
    console.log('with tolerance: ' + (combinationTolerance*100) + '%.');
    return Array.from(resistors);
}

function addResistorIfUnique(resistors, newResistor) {
    for (let resistor of resistors) {
        let diff = Math.abs(resistor.value - newResistor.value) / resistor.value;
        if (diff < combinationTolerance) {
            return; // Ignore if the new value is too close to an existing one
        }
    }
    resistors.add({ value: newResistor.value, description: newResistor.description });
}

function seriesResistor(R1, R2) {
    return R1 + R2;
}

function parallelResistor(R1, R2) {
    return 1 / (1 / R1 + 1 / R2);
}

function formatResistorValue(value) {
    if (value < 1e3) {
        // Values less than 1kΩ
        return value.toFixed(1).replace('.0', 'R').replace('.', 'R');
    } else if (value < 1e6) {
        // Values from 1kΩ to 1MΩ
        let formattedValue = (value / 1e3).toFixed(1);
        return formattedValue.toString().replace('.0', 'K').replace('.', 'K');
    } else {
        // Values 1MΩ and higher
        let formattedValue = (value / 1e6).toFixed(1);
        return formattedValue.toString().replace('.0', 'M').replace('.', 'M');
    }
}

function calculateVoltagesAndPowerLoss(R0, R1, R2, Ucc) {
    const U_quiet = Ucc - Ucc * (R0 / (R0 + R1 + R2));
    const U_T1 = Ucc - Ucc * (R0 / (R0 + R2));
    const U_T2 = Ucc - Ucc * (R0 / (R0 + R1));

    // Calculation of power losses [mW]
    const powerLoss = {
        R0: (Ucc ** 2 / R0) * 1000,
        R1: (U_T2 ** 2 / R1) * 1000,
        R2: (U_T1 ** 2 / R2) * 1000
    };

    return {
        voltages: {
            quiet: U_quiet,
            T1: U_T1,
            T2: U_T2,
        },
        powerLoss: {
            R0: powerLoss.R0,
            R1: powerLoss.R1,
            R2: powerLoss.R2
        }
    };
}

function calculateDifferenceAndDeviation(voltages, targetVoltages) {
    let totalDifference = 0;
    let deviations = [];

    voltages.forEach((voltage, index) => {
        const difference = Math.abs(voltage - targetVoltages[index]);
        totalDifference += difference * difference; // d*d => striving for the lowest possible average values

        const deviation = ((difference / targetVoltages[index]) * 100).toFixed(1);
        deviations.push(`${voltage.toFixed(2)}V (${deviation}%)`);
    });

    return { totalDifference, deviations };
}


function findBestCombination(resistors, Ucc, targetVoltages, maxPowerLoss) {
    let bestDifference = Infinity;
    let bestCombination = null;

    // The number of calculation iterations to search for more accurate values
    const numIterations = Math.pow(resistors.length, 3);
    console.log('Number of calculation iterations: ' + numIterations.toExponential(2));

    resistors.forEach(R0 => {
        resistors.forEach(R1 => {
            resistors.forEach(R2 => {
                const { voltages, powerLoss } = calculateVoltagesAndPowerLoss(R0.value, R1.value, R2.value, Ucc);
                const exceedsPowerLoss = Object.values(powerLoss).some(p => p > maxPowerLoss);
                const { totalDifference, deviations } = calculateDifferenceAndDeviation(Object.values(voltages), targetVoltages);
                if (!exceedsPowerLoss && totalDifference < bestDifference) {
                    bestDifference = totalDifference;
                    bestCombination = {
                        R0: R0,
                        R1: R1,
                        R2: R2,
                        voltages,
                        deviations,
                        powerLoss
                    };
                }
            });
        });
    });

    if (bestCombination) {
        return (`Best resistor combination:
            R0: ${bestCombination.R0.description}, 
            R1: ${bestCombination.R1.description}, 
            R2: ${bestCombination.R2.description},
            Voltages with deviations:
                ${bestCombination.deviations.join(',\n                ')},
                0V
            Power losses: {
                R0: ${bestCombination.powerLoss.R0.toFixed(1)}mW,
                R1: ${bestCombination.powerLoss.R1.toFixed(1)}mW,
                R2: ${bestCombination.powerLoss.R2.toFixed(1)}mW
            }`);
    } else {
        return 'No matching combination found!';
    }
}

// Calculation of series (simple resistor) and two series/parallel resistors for R0, R1 and R2 values
const resistors = generateResistors(E12_series);

// Finding the best combination of values (R0, R1 and R2).
const bestCombination = findBestCombination(resistors, Ucc, targetVoltages, maxPowerLoss);
console.log(bestCombination);