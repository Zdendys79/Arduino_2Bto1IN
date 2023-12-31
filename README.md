# Arduino_2Bto1IN
Arduino - two buttons on one input

             +---T1--+---T2--+
             |       |       |
Ucc ---> R0 -+-> R1 -.-> R2 -+- GND
             |               |
            Uout            GND
         (Arduino IN)

With setup 1% => 919 simple/serial/parralel resistor combinations is result:
Number of calculated resistor combinations: 909
Number of iterations: 7.51089429e+8
Best resistor combination:
         R0: 1K2 + 15K (series),
         R1: 1K5 + 470R (series),
         R2: 150R + 6K8 (series),
         Tension RO: {
             rest state: 7.74V,
             T1 pressed: 8.40V,
             T2 pressed: 10.70V,
             both buttons pressed: 12.00V
         },
         Power losses: {
             R0: 8.9mW,
             R1: 0.9mW,
             R2: 1.9mW
         }
