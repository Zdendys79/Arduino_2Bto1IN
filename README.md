# Arduino_2Bto1IN
Arduino - two buttons on one input

                  +---T1--+---T2--+
                  |       |       |
     Ucc ---> R0 -+-> R1 -.-> R2 -+- GND
                  |               |
                 Uout            GND
             (Arduino IN)

The Arduino input needs to be protected with a 10k resistor and a zener diode (5.1V to GND) with a small parallel 100nF capacitor.

Script results:
Number of calculated resistor combinations: 214 with tolerance: 5%.
    Number of calculation iterations: 9.80e+6
    Best resistor combination:
      R0: 560K + 820K (series),
      R1: 68K,
      R2: 100K + 39K (series),
    Voltages with deviations:
      4.70V (2.2%),
      3.29V (2.9%),
      1.69V (5.7%),
      0V
    Power losses:
      R0: 0.9mW,
      R1: 0.0mW,
      R2: 0.1mW
