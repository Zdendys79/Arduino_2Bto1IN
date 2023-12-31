// resistors2.js
const E12_series = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
const targetVoltages = [7.1, 8.4, 10.7, 12]; // klidový stav, stisknuto T1, stisknuto T2, stisknuta obě tlačítka
const maxPowerLoss = 20; // mW
const combinationTolerance = 0.01; // ingore <10% serial/parralel combination values
// 0.01 => 1% => 919 simple/serial/parralel resistor combinations => number of iterations ~7.5e+8
// 0.02 => 2% => 540 simple/serial/parralel resistor combinations => number of iterations ~1.5e+8
// 0.05 => 5% => 214 simple/serial/parralel resistor combinations => number of iterations ~9.8e+6
// 0.10 => 10% => 98 simple/serial/parralel resistor combinations => number of iterations ~9.4e+5
// 0.20 => 20% => 60 only simple resistors (no serial/parralel variants added) => number of iterations ~2.2e+5
const Ucc = 12; // Volts

function generateResistors(E12_series) {
    const resistors = new Set();
    E12_series.forEach(value => {
        for (let exp = 0; exp <= 5; exp++) {
            addResistorIfUnique(resistors, { value: value * 10 ** exp, description: `${formatResistorValue(value * 10 ** exp)}` });
        }
    });

    // Kombinace dvou odporů zapojených sériově nebo paralelně
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

    console.log('Počet vypočtených kombinací rezistorů: ' + resistors.size);
    return Array.from(resistors);
}

function addResistorIfUnique(resistors, newResistor) {
    for (let resistor of resistors) {
        let diff = Math.abs(resistor.value - newResistor.value) / resistor.value;
        if (diff < combinationTolerance) {
            return; // Ignoruj, pokud je nová hodnota příliš blízko některé již existující
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
        // Hodnoty menší než 1kΩ
        return value % 1 === 0 ? value + 'R' : value.toString().replace('.', 'R');
    } else if (value < 1e6) {
        // Hodnoty od 1kΩ do 1MΩ
        let formattedValue = value / 1e3;
        return formattedValue % 1 === 0 ? formattedValue + 'K' : formattedValue.toString().replace('.', 'K');
    } else {
        // Hodnoty 1MΩ a vyšší
        let formattedValue = value / 1e6;
        return formattedValue % 1 === 0 ? formattedValue + 'M' : formattedValue.toString().replace('.', 'M');
    }
}

function calculateVoltagesAndPowerLoss(R0, R1, R2, Ucc) {
    const U_R0_quiet = Ucc * (R0 / (R0 + R1 + R2));
    const U_R0_T1 = Ucc * (R0 / (R0 + R2));
    const U_R0_T2 = Ucc * (R0 / (R0 + R1));
    const U_R0_both = Ucc; // Při stisknutí obou tlačítek

    const U_R1_T2 = Ucc - U_R0_T2; // Napětí na R1 při stisku T2
    const U_R2_T1 = Ucc - U_R0_T1; // Napětí na R2 při stisku T1

    // Výpočet výkonových ztrát
    const powerLoss = {
        R0: Math.max(U_R0_quiet ** 2 / R0, U_R0_T1 ** 2 / R0, U_R0_T2 ** 2 / R0, U_R0_both ** 2 / R0) * 1000, // v mW
        R1: (U_R1_T2 ** 2 / R1) * 1000,
        R2: (U_R2_T1 ** 2 / R2) * 1000
    };

    return {
        voltages: {
            quiet: U_R0_quiet,
            T1: U_R0_T1,
            T2: U_R0_T2,
            both: U_R0_both
        },
        powerLoss: {
            R0: powerLoss.R0,
            R1: powerLoss.R1,
            R2: powerLoss.R2
        }
    };
}

function findBestCombination(resistors, Ucc, targetVoltages, maxPowerLoss) {
    let bestDifference = Infinity;
    let bestCombination = null;

    // Výpočet počtu iterací
    const numIterations = Math.pow(resistors.length, 3);
    console.log('Počet iterací: ' + numIterations.toExponential());

    resistors.forEach(R0 => {
        resistors.forEach(R1 => {
            resistors.forEach(R2 => {
                const { voltages, powerLoss } = calculateVoltagesAndPowerLoss(R0.value, R1.value, R2.value, Ucc);
                const difference = Object.values(voltages).reduce((acc, voltage, index) => {
                    return acc + Math.abs(voltage - targetVoltages[index]);
                }, 0);

                const exceedsPowerLoss = Object.values(powerLoss).some(p => p > maxPowerLoss);

                if (!exceedsPowerLoss && difference < bestDifference) {
                    bestDifference = difference;
                    bestCombination = {
                        R0: R0,
                        R1: R1,
                        R2: R2,
                        voltages,
                        powerLoss
                    };
                }
            });
        });
    });

    if (bestCombination) {
        console.log(`Nejlepší kombinace: 
        R0: ${bestCombination.R0.description}, 
        R1: ${bestCombination.R1.description}, 
        R2: ${bestCombination.R2.description},
        Napětí: {
            Klidový stav: ${bestCombination.voltages.quiet.toFixed(2)}V,
            T1: ${bestCombination.voltages.T1.toFixed(2)}V,
            T2: ${bestCombination.voltages.T2.toFixed(2)}V,
            Obě tlačítka: ${bestCombination.voltages.both.toFixed(2)}V
        },
        Výkonové ztráty: {
            R0: ${bestCombination.powerLoss.R0.toFixed(1)}mW,
            R1: ${bestCombination.powerLoss.R1.toFixed(1)}mW,
            R2: ${bestCombination.powerLoss.R2.toFixed(1)}mW
        }`);
    } else {
        console.log('Nenalezena žádná kombinace splňující požadavky.');
    }
}

// Použití funkce generateResistors
const resistors = generateResistors(E12_series);

// nalezení nejlepší kombinace
const bestCombination = findBestCombination(resistors, Ucc, targetVoltages, maxPowerLoss);
//console.log(bestCombination);