const chargeSheet = [
  {
    customerType: "bronze",
    multiplier: "2.5X",
    deliveryPartners: [
      {
        carrierName: "Delhivery",
        serviceType: "Surface",
        zones: [
          { name: 'a', type: 'Within City/Same city' },
          { name: 'b', type: 'upto 500 KM Regional (Single connection)' },
          { name: 'c1', type: 'Metro to Metro (501 KM- 1400 KM)' },
          { name: 'c2', type: 'Metro to Metro (1401KM-2500 KM)' },
          { name: 'd1', type: 'Rest of India (501 KM- 1400 KM)' },
          { name: 'd2', type: 'Rest of India (1401KM-2500 KM)' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'Leh Ladakh, Andaman Nicobar, Manipur, Kashmir' }
        ],
        rateCard: [
          { condition: "DL 0-250 gm", a: 77.5, b: 90, c1: 92.5, c2: 97.5, d1: 100, d2: 102.5, e: 115, f: 130 },
          { condition: "DL 250-500 gm", a: 17.5, b: 22.5, c1: 25, c2: 27.5, d1: 30, d2: 32.5, e: 37.5, f: 42.5 },
          { condition: "DL Additional 500 gm till 5kg", a: 35, b: 45, c1: 52.5, c2: 60, d1: 65, d2: 67.5, e: 85, f: 92.5 },
          { condition: "DL Upto 5kgs", a: 405, b: 507.5, c1: 570, c2: 620, d1: 655, d2: 695, e: 845, f: 915 },
          { condition: "DL Addnl 1 kgs", a: 40, b: 47.5, c1: 60, c2: 67.5, d1: 75, d2: 87.5, e: 97.5, f: 105 },
          { condition: "DL Upto10 kgs", a: 597.5, b: 717.5, c1: 837.5, c2: 912.5, d1: 967.5, d2: 1060, e: 1167.5, f: 1212.5 },
          { condition: "DL Addnl 1 kgs", a: 42.5, b: 52.5, c1: 57.5, c2: 62.5, d1: 65, d2: 72.5, e: 80, f: 87.5 },
          { condition: "RTO", note: "Same as Forward" },
          { condition: "DTO 0-250 gm", a: 125, b: 145, c1: 147.5, c2: 155, d1: 160, d2: 165, e: 185, f: 207.5 },
          { condition: "DTO 250-500 gm", a: 27.5, b: 35, c1: 40, c2: 45, d1: 47.5, d2: 52.5, e: 60, f: 67.5 },
          { condition: "DTO Additional 500 gm till 5kg", a: 55, b: 72.5, c1: 85, c2: 95, d1: 105, d2: 107.5, e: 135, f: 147.5 },
          { condition: "DTO Upto 5kgs", a: 647.5, b: 812.5, c1: 912.5, c2: 992.5, d1: 1047.5, d2: 1112.5, e: 1352.5, f: 1465 },
          { condition: "DTO Addnl 1 kgs", a: 65, b: 75, c1: 95, c2: 107.5, d1: 120, d2: 140, e: 155, f: 167.5 },
          { condition: "DTO Upto10 kgs", a: 955, b: 1147.5, c1: 1340, c2: 1460, d1: 1547.5, d2: 1695, e: 1867.5, f: 1940 },
          { condition: "DTO Addnl 1 kgs", a: 67.5, b: 85, c1: 92.5, c2: 100, d1: 105, d2: 115, e: 127.5, f: 140 }
        ],
        codCharges: "2.25% or Rs. 60/- Whichever is higher",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Delhivery",
        serviceType: "Express",
        zones: [
          { name: 'a', type: 'Within City/Same city' },
          { name: 'b', type: 'upto 500 KM Regional (Single connection)' },
          { name: 'c', type: 'Metro to Metro (501 KM-2500 KM)' },
          { name: 'd', type: 'Rest of India (501 KM-2500 KM)' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'Leh Ladakh, Andaman Nicobar, Manipur, Kashmir' }
        ],
        rateCard: [
          { condition: "0-250 gm", a: 77.5, b: 90, c: 117.5, d: 127.5, e: 155, f: 172.5 },
          { condition: "250-500 gm", a: 17.5, b: 22.5, c: 35, d: 47.5, e: 50, f: 60 },
          { condition: "Additional 500 gm", a: 35, b: 45, c: 105, d: 117.5, e: 127.5, f: 145 },
          { condition: "RTO 0-250 gm", a: 77.5, b: 90, c: 97.5, d: 102.5, e: 115, f: 130 },
          { condition: "RTO 250-500 gm", a: 17.5, b: 22.5, c: 27.5, d: 32.5, e: 37.5, f: 42.5 },
          { condition: "RTO Additional 500 gm", a: 35, b: 45, c: 60, d: 67.5, e: 85, f: 92.5 },
          { condition: "DTO 0-250 gm", a: 125, b: 145, c: 155, d: 165, e: 185, f: 207.5 },
          { condition: "DTO 250-500 gm", a: 27.5, b: 35, c: 45, d: 52.5, e: 60, f: 67.5 },
          { condition: "DTO Additional 500 gm", a: 55, b: 72.5, c: 95, d: 107.5, e: 135, f: 147.5 }
        ],
        codCharges: "2.25% or Rs. 60/- Whichever is higher",
        fuelSurcharge: "0%"
      }
    ]
  },
  {
    customerType: "silver",
    multiplier: "2.3X",
    deliveryPartners: [
      {
        carrierName: "Delhivery",
        serviceType: "Surface",
        zones: [
          { name: 'a', type: 'Within City/Same city' },
          { name: 'b', type: 'upto 500 KM Regional (Single connection)' },
          { name: 'c1', type: 'Metro to Metro (501 KM- 1400 KM)' },
          { name: 'c2', type: 'Metro to Metro (1401KM-2500 KM)' },
          { name: 'd1', type: 'Rest of India (501 KM- 1400 KM)' },
          { name: 'd2', type: 'Rest of India (1401KM-2500 KM)' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'Leh Ladakh, Andaman Nicobar, Manipur, Kashmir' }
        ],
        rateCard: [
          { condition: "DL 0-250 gm", a: 71.3, b: 82.8, c1: 85.1, c2: 89.7, d1: 92, d2: 94.3, e: 105.8, f: 119.6 },
          { condition: "DL 250-500 gm", a: 16.1, b: 20.7, c1: 23, c2: 25.3, d1: 27.6, d2: 29.9, e: 34.5, f: 39.1 },
          { condition: "DL Additional 500 gm till 5kg", a: 32.2, b: 41.4, c1: 48.3, c2: 55.2, d1: 59.8, d2: 62.1, e: 78.2, f: 85.1 },
          { condition: "DL Upto 5kgs", a: 372.6, b: 466.9, c1: 524.4, c2: 570.4, d1: 602.6, d2: 639.4, e: 777.4, f: 841.8 },
          { condition: "DL Addnl 1 kgs", a: 36.8, b: 43.7, c1: 55.2, c2: 62.1, d1: 69, d2: 80.5, e: 89.7, f: 96.6 },
          { condition: "DL Upto10 kgs", a: 549.7, b: 660.1, c1: 770.5, c2: 839.5, d1: 890.1, d2: 975.2, e: 1074.1, f: 1115.5 },
          { condition: "DL Addnl 1 kgs", a: 39.1, b: 48.3, c1: 52.9, c2: 57.5, d1: 59.8, d2: 66.7, e: 73.6, f: 80.5 },
          { condition: "RTO", note: "Same as Forward" },
          { condition: "DTO 0-250 gm", a: 115, b: 133.4, c1: 135.7, c2: 142.6, d1: 147.2, d2: 151.8, e: 170.2, f: 190.9 },
          { condition: "DTO 250-500 gm", a: 25.3, b: 32.2, c1: 36.8, c2: 41.4, d1: 43.7, d2: 48.3, e: 55.2, f: 62.1 },
          { condition: "DTO Additional 500 gm till 5kg", a: 50.6, b: 66.7, c1: 78.2, c2: 87.4, d1: 96.6, d2: 98.9, e: 124.2, f: 135.7 },
          { condition: "DTO Upto 5kgs", a: 595.7, b: 747.5, c1: 839.5, c2: 913.1, d1: 963.7, d2: 1023.5, e: 1244.3, f: 1347.8 },
          { condition: "DTO Addnl 1 kgs", a: 59.8, b: 69, c1: 87.4, c2: 98.9, d1: 110.4, d2: 128.8, e: 142.6, f: 154.1 },
          { condition: "DTO Upto10 kgs", a: 878.6, b: 1055.7, c1: 1232.8, c2: 1343.2, d1: 1423.7, d2: 1559.4, e: 1718.1, f: 1784.8 },
          { condition: "DTO Addnl 1 kgs", a: 62.1, b: 78.2, c1: 85.1, c2: 92, d1: 96.6, d2: 105.8, e: 117.3, f: 128.8 }
        ],
        codCharges: "2.25% or Rs. 60/- Whichever is higher",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Delhivery",
        serviceType: "Express",
        zones: [
          { name: 'a', type: 'Within City/Same city' },
          { name: 'b', type: 'upto 500 KM Regional (Single connection)' },
          { name: 'c', type: 'Metro to Metro (501 KM-2500 KM)' },
          { name: 'd', type: 'Rest of India (501 KM-2500 KM)' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'Leh Ladakh, Andaman Nicobar, Manipur, Kashmir' }
        ],
        rateCard: [
          { condition: "0-250 gm", a: 71.3, b: 82.8, c: 108.1, d: 117.3, e: 142.6, f: 158.7 },
          { condition: "250-500 gm", a: 16.1, b: 20.7, c: 32.2, d: 43.7, e: 46, f: 55.2 },
          { condition: "Additional 500 gm", a: 32.2, b: 41.4, c: 96.6, d: 108.1, e: 117.3, f: 133.4 },
          { condition: "RTO 0-250 gm", a: 71.3, b: 82.8, c: 89.7, d: 94.3, e: 105.8, f: 119.6 },
          { condition: "RTO 250-500 gm", a: 16.1, b: 20.7, c: 25.3, d: 29.9, e: 34.5, f: 39.1 },
          { condition: "RTO Additional 500 gm", a: 32.2, b: 41.4, c: 55.2, d: 62.1, e: 78.2, f: 85.1 },
          { condition: "DTO 0-250 gm", a: 115, b: 133.4, c: 142.6, d: 151.8, e: 170.2, f: 190.9 },
          { condition: "DTO 250-500 gm", a: 25.3, b: 32.2, c: 41.4, d: 48.3, e: 55.2, f: 62.1 },
          { condition: "DTO Additional 500 gm", a: 50.6, b: 66.7, c: 87.4, d: 98.9, e: 124.2, f: 135.7 }
        ],
        codCharges: "2.25% or Rs. 60/- Whichever is higher",
        fuelSurcharge: "0%"
      }
    ]
  },
  {
    customerType: "gold",
    multiplier: "2X",
    deliveryPartners: [
      {
        carrierName: "Delhivery",
        serviceType: "Surface",
        zones: [
          { name: 'a', type: 'Within City/Same city' },
          { name: 'b', type: 'upto 500 KM Regional (Single connection)' },
          { name: 'c1', type: 'Metro to Metro (501 KM- 1400 KM)' },
          { name: 'c2', type: 'Metro to Metro (1401KM-2500 KM)' },
          { name: 'd1', type: 'Rest of India (501 KM- 1400 KM)' },
          { name: 'd2', type: 'Rest of India (1401KM-2500 KM)' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'Leh Ladakh, Andaman Nicobar, Manipur, Kashmir' }
        ],
        rateCard: [
          { condition: "DL 0-250 gm", a: 62, b: 72, c1: 74, c2: 78, d1: 80, d2: 82, e: 92, f: 104 },
          { condition: "DL 250-500 gm", a: 14, b: 18, c1: 20, c2: 22, d1: 24, d2: 26, e: 30, f: 34 },
          { condition: "DL Additional 500 gm till 5kg", a: 28, b: 36, c1: 42, c2: 48, d1: 52, d2: 54, e: 68, f: 74 },
          { condition: "DL Upto 5kgs", a: 324, b: 406, c1: 456, c2: 496, d1: 524, d2: 556, e: 676, f: 732 },
          { condition: "DL Addnl 1 kgs", a: 32, b: 38, c1: 48, c2: 54, d1: 60, d2: 70, e: 78, f: 84 },
          { condition: "DL Upto10 kgs", a: 478, b: 574, c1: 670, c2: 730, d1: 774, d2: 848, e: 934, f: 970 },
          { condition: "DL Addnl 1 kgs", a: 34, b: 42, c1: 46, c2: 50, d1: 52, d2: 58, e: 64, f: 70 },
          { condition: "RTO", note: "Same as Forward" },
          { condition: "DTO 0-250 gm", a: 100, b: 116, c1: 118, c2: 124, d1: 128, d2: 132, e: 148, f: 166 },
          { condition: "DTO 250-500 gm", a: 22, b: 28, c1: 32, c2: 36, d1: 38, d2: 42, e: 48, f: 54 },
          { condition: "DTO Additional 500 gm till 5kg", a: 44, b: 58, c1: 68, c2: 76, d1: 84, d2: 86, e: 108, f: 118 },
          { condition: "DTO Upto 5kgs", a: 518, b: 650, c1: 730, c2: 794, d1: 838, d2: 890, e: 1082, f: 1172 },
          { condition: "DTO Addnl 1 kgs", a: 52, b: 60, c1: 76, c2: 86, d1: 96, d2: 112, e: 124, f: 134 },
          { condition: "DTO Upto10 kgs", a: 764, b: 918, c1: 1072, c2: 1168, d1: 1238, d2: 1356, e: 1494, f: 1552 },
          { condition: "DTO Addnl 1 kgs", a: 54, b: 68, c1: 74, c2: 80, d1: 84, d2: 92, e: 102, f: 112 }
        ],
        codCharges: "2.25% or Rs. 60/- Whichever is higher",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Delhivery",
        serviceType: "Express",
        zones: [
          { name: 'a', type: 'Within City/Same city' },
          { name: 'b', type: 'upto 500 KM Regional (Single connection)' },
          { name: 'c', type: 'Metro to Metro (501 KM-2500 KM)' },
          { name: 'd', type: 'Rest of India (501 KM-2500 KM)' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'Leh Ladakh, Andaman Nicobar, Manipur, Kashmir' }
        ],
        rateCard: [
          { condition: "0-250 gm", a: 62, b: 72, c: 94, d: 102, e: 124, f: 138 },
          { condition: "250-500 gm", a: 14, b: 18, c: 28, d: 38, e: 40, f: 48 },
          { condition: "Additional 500 gm", a: 28, b: 36, c: 84, d: 94, e: 102, f: 116 },
          { condition: "RTO 0-250 gm", a: 62, b: 72, c: 78, d: 82, e: 92, f: 104 },
          { condition: "RTO 250-500 gm", a: 14, b: 18, c: 22, d: 26, e: 30, f: 34 },
          { condition: "RTO Additional 500 gm", a: 28, b: 36, c: 48, d: 54, e: 68, f: 74 },
          { condition: "DTO 0-250 gm", a: 100, b: 116, c: 124, d: 132, e: 148, f: 166 },
          { condition: "DTO 250-500 gm", a: 22, b: 28, c: 36, d: 42, e: 48, f: 54 },
          { condition: "DTO Additional 500 gm", a: 44, b: 58, c: 76, d: 86, e: 108, f: 118 }
        ],
        codCharges: "2.25% or Rs. 60/- Whichever is higher",
        fuelSurcharge: "0%"
      }
    ]
  },
  {
    customerType: "platinum",
    multiplier: "1.8X",
    deliveryPartners: [
      {
        carrierName: "Delhivery",
        serviceType: "Surface",
        zones: [
          { name: 'a', type: 'Within City/Same city' },
          { name: 'b', type: 'upto 500 KM Regional (Single connection)' },
          { name: 'c1', type: 'Metro to Metro (501 KM- 1400 KM)' },
          { name: 'c2', type: 'Metro to Metro (1401KM-2500 KM)' },
          { name: 'd1', type: 'Rest of India (501 KM- 1400 KM)' },
          { name: 'd2', type: 'Rest of India (1401KM-2500 KM)' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'Leh Ladakh, Andaman Nicobar, Manipur, Kashmir' }
        ],
        rateCard: [
          { condition: "DL 0-250 gm", a: 55.8, b: 64.8, c1: 66.6, c2: 70.2, d1: 72, d2: 73.8, e: 82.8, f: 93.6 },
          { condition: "DL 250-500 gm", a: 12.6, b: 16.2, c1: 18, c2: 19.8, d1: 21.6, d2: 23.4, e: 27, f: 30.6 },
          { condition: "DL Additional 500 gm till 5kg", a: 25.2, b: 32.4, c1: 37.8, c2: 43.2, d1: 46.8, d2: 48.6, e: 61.2, f: 66.6 },
          { condition: "DL Upto 5kgs", a: 291.6, b: 365.4, c1: 410.4, c2: 446.4, d1: 471.6, d2: 500.4, e: 608.4, f: 658.8 },
          { condition: "DL Addnl 1 kgs", a: 28.8, b: 34.2, c1: 43.2, c2: 48.6, d1: 54, d2: 63, e: 70.2, f: 75.6 },
          { condition: "DL Upto10 kgs", a: 430.2, b: 516.6, c1: 603, c2: 657, d1: 696.6, d2: 763.2, e: 840.6, f: 873 },
          { condition: "DL Addnl 1 kgs", a: 30.6, b: 37.8, c1: 41.4, c2: 45, d1: 46.8, d2: 52.2, e: 57.6, f: 63 },
          { condition: "RTO", note: "Same as Forward" },
          { condition: "DTO 0-250 gm", a: 90, b: 104.4, c1: 106.2, c2: 111.6, d1: 115.2, d2: 118.8, e: 133.2, f: 149.4 },
          { condition: "DTO 250-500 gm", a: 19.8, b: 25.2, c1: 28.8, c2: 32.4, d1: 34.2, d2: 37.8, e: 43.2, f: 48.6 },
          { condition: "DTO Additional 500 gm till 5kg", a: 39.6, b: 52.2, c1: 61.2, c2: 68.4, d1: 75.6, d2: 77.4, e: 97.2, f: 106.2 },
          { condition: "DTO Upto 5kgs", a: 466.2, b: 585, c1: 657, c2: 714.6, d1: 754.2, d2: 801, e: 973.8, f: 1054.8 },
          { condition: "DTO Addnl 1 kgs", a: 46.8, b: 54, c1: 68.4, c2: 77.4, d1: 86.4, d2: 100.8, e: 111.6, f: 120.6 },
          { condition: "DTO Upto10 kgs", a: 687.6, b: 826.2, c1: 964.8, c2: 1051.2, d1: 1114.2, d2: 1220.4, e: 1344.6, f: 1396.8 },
          { condition: "DTO Addnl 1 kgs", a: 48.6, b: 61.2, c1: 66.6, c2: 72, d1: 75.6, d2: 82.8, e: 91.8, f: 100.8 }
        ],
        codCharges: "2.25% or Rs. 60/- Whichever is higher",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Delhivery",
        serviceType: "Express",
        zones: [
          { name: 'a', type: 'Within City/Same city' },
          { name: 'b', type: 'upto 500 KM Regional (Single connection)' },
          { name: 'c', type: 'Metro to Metro (501 KM-2500 KM)' },
          { name: 'd', type: 'Rest of India (501 KM-2500 KM)' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'Leh Ladakh, Andaman Nicobar, Manipur, Kashmir' }
        ],
        rateCard: [
          { condition: "0-250 gm", a: 55.8, b: 64.8, c: 84.6, d: 91.8, e: 111.6, f: 124.2 },
          { condition: "250-500 gm", a: 12.6, b: 16.2, c: 25.2, d: 34.2, e: 36, f: 43.2 },
          { condition: "Additional 500 gm", a: 25.2, b: 32.4, c: 75.6, d: 84.6, e: 91.8, f: 104.4 },
          { condition: "RTO 0-250 gm", a: 55.8, b: 64.8, c: 70.2, d: 73.8, e: 82.8, f: 93.6 },
          { condition: "RTO 250-500 gm", a: 12.6, b: 16.2, c: 19.8, d: 23.4, e: 27, f: 30.6 },
          { condition: "RTO Additional 500 gm", a: 25.2, b: 32.4, c: 43.2, d: 48.6, e: 61.2, f: 66.6 },
          { condition: "DTO 0-250 gm", a: 90, b: 104.4, c: 111.6, d: 118.8, e: 133.2, f: 149.4 },
          { condition: "DTO 250-500 gm", a: 19.8, b: 25.2, c: 32.4, d: 37.8, e: 43.2, f: 48.6 },
          { condition: "DTO Additional 500 gm", a: 39.6, b: 52.2, c: 68.4, d: 77.4, e: 97.2, f: 106.2 }
        ],
        codCharges: "2.25% or Rs. 60/- Whichever is higher",
        fuelSurcharge: "0%"
      }
    ]
  },
  // Xpressbees Data (New Entries)
  {
    customerType: "bronze",
    multiplier: "1X", // Rates already include bronze pricing
    deliveryPartners: [
      {
        carrierName: "Xpressbees",
        serviceType: "Air 0.5KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-0.5 KG", 
            a: 78, b: 81, c: 81, d: 150, e: 180, f: 165 
          },
          { 
            condition: "RTO", 
            a: 69, b: 72, c: 72, d: 114, e: 150, f: 135 
          },
          { 
            condition: "Addl 0.5KG", 
            a: 36, b: 42, c: 42, d: 105, e: 150, f: 126 
          }
        ],
        codCharges: "2.36% or ₹66 (Higher)",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "Surface 0.5KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-0.5 KG", 
            a: 78, b: 81, c: 81, d: 114, e: 150, f: 126 
          },
          { 
            condition: "RTO", 
            a: 69, b: 72, c: 72, d: 99, e: 135, f: 111 
          },
          { 
            condition: "Addl 0.5KG", 
            a: 36, b: 42, c: 42, d: 54, e: 78, f: 66 
          }
        ],
        codCharges: "2.36% or ₹66 (Higher)",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "Express Reverse",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-0.5 KG", 
            a: 120, b: 129, c: 129, d: 150, e: 195, f: 168 
          },
          { 
            condition: "RTO", 
            a: 120, b: 129, c: 129, d: 150, e: 195, f: 168 
          },
          { 
            condition: "Addl 0.5KG", 
            a: 84, b: 90, c: 90, d: 108, e: 114, f: 99 
          }
        ],
        codCharges: "2.36% or ₹66 (Higher)",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "1KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-1 KG", 
            a: 114, b: 126, c: 126, d: 162, e: 228, f: 189 
          },
          { 
            condition: "RTO", 
            a: 102, b: 111, c: 111, d: 141, e: 195, f: 165 
          },
          { 
            condition: "Addl 1KG", 
            a: 70, b: 90, c: 90, d: 99, e: 120, f: 108 
          }
        ],
        codCharges: "2.36% or ₹66 (Higher)",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "2KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-2 KG", 
            a: 192, b: 210, c: 210, d: 228, e: 300, f: 252 
          },
          { 
            condition: "RTO", 
            a: 165, b: 180, c: 180, d: 204, e: 270, f: 225 
          },
          { 
            condition: "Addl 1KG", 
            a: 42, b: 48, c: 48, d: 54, e: 72, f: 54 
          }
        ],
        codCharges: "2.36% or ₹66 (Higher)",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "5KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-5 KG", 
            a: 300, b: 330, c: 330, d: 375, e: 510, f: 420 
          },
          { 
            condition: "RTO", 
            a: 270, b: 297, c: 297, d: 330, e: 450, f: 366 
          },
          { 
            condition: "Addl 1KG", 
            a: 42, b: 48, c: 48, d: 54, e: 72, f: 54 
          }
        ],
        codCharges: "2.36% or ₹66 (Higher)",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "10KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-10 KG", 
            a: 450, b: 510, c: 510, d: 555, e: 810, f: 600 
          },
          { 
            condition: "RTO", 
            a: 390, b: 450, c: 450, d: 495, e: 750, f: 525 
          },
          { 
            condition: "Addl 1KG", 
            a: 36, b: 42, c: 42, d: 45, e: 63, f: 48 
          }
        ],
        codCharges: "2.36% or ₹66 (Higher)",
        fuelSurcharge: "0%"
      }
    ]
  },
  {
    customerType: "silver",
    multiplier: "1X",
    deliveryPartners: [
      {
        carrierName: "Xpressbees",
        serviceType: "Air 0.5KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { condition: "FWD 0-0.5 KG", a: 65, b: 67.5, c: 67.5, d: 125, e: 150, f: 137.5 },
          { condition: "RTO", a: 57.5, b: 60, c: 60, d: 95, e: 125, f: 112.5 },
          { condition: "Addl 0.5KG", a: 30, b: 35, c: 35, d: 87.5, e: 125, f: 105 }
        ],
        codCharges: "2.12% or ₹66 (Higher)",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "Surface 0.5KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { condition: "FWD 0-0.5 KG", a: 65, b: 67.5, c: 67.5, d: 95, e: 125, f: 105 },
          { condition: "RTO", a: 57.5, b: 60, c: 60, d: 82.5, e: 112.5, f: 92.5 },
          { condition: "Addl 0.5KG", a: 30, b: 35, c: 35, d: 45, e: 65, f: 55 }
        ],
        codCharges: "2.12% or ₹66 (Higher)",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "Express Reverse",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { condition: "FWD 0-0.5 KG", a: 100, b: 107.5, c: 107.5, d: 125, e: 162.5, f: 140 },
          { condition: "RTO", a: 100, b: 107.5, c: 107.5, d: 125, e: 162.5, f: 140 },
          { condition: "Addl 0.5KG", a: 70, b: 75, c: 75, d: 90, e: 95, f: 82.5 }
        ],
        codCharges: "2.12% or ₹66 (Higher)",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "1KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { condition: "FWD 0-1 KG", a: 95, b: 105, c: 105, d: 135, e: 190, f: 157.5 },
          { condition: "RTO", a: 85, b: 92.5, c: 92.5, d: 117.5, e: 162.5, f: 137.5 },
          { condition: "Addl 1KG", a: 62.5, b: 75, c: 75, d: 82.5, e: 100, f: 90 }
        ],
        codCharges: "2.12% or ₹66 (Higher)",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "2KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { condition: "FWD 0-2 KG", a: 160, b: 175, c: 175, d: 190, e: 250, f: 210 },
          { condition: "RTO", a: 137.5, b: 150, c: 150, d: 170, e: 225, f: 187.5 },
          { condition: "Addl 1KG", a: 40, b: 45, c: 45, d: 50, e: 75, f: 60 }
        ],
        codCharges: "2.12% or ₹66 (Higher)",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "5KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { condition: "FWD 0-5 KG", a: 250, b: 275, c: 275, d: 312.5, e: 425, f: 350 },
          { condition: "RTO", a: 225, b: 247.5, c: 247.5, d: 275, e: 375, f: 307.5 },
          { condition: "Addl 1KG", a: 35, b: 40, c: 40, d: 45, e: 60, f: 45 }
        ],
        codCharges: "2.12% or ₹66 (Higher)",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "10KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { condition: "FWD 0-10 KG", a: 375, b: 425, c: 425, d: 462.5, e: 675, f: 500 },
          { condition: "RTO", a: 325, b: 375, c: 375, d: 412.5, e: 625, f: 437.5 },
          { condition: "Addl 1KG", a: 30, b: 35, c: 35, d: 37.5, e: 52.5, f: 40 }
        ],
        codCharges: "2.12% or ₹66 (Higher)",
        fuelSurcharge: "0%"
      }
    ]
  },
  {
    customerType: "gold",
    multiplier: "1X",
    deliveryPartners: [
      {
        carrierName: "Xpressbees",
        serviceType: "Air 0.5KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { condition: "FWD 0-0.5 KG", a: 52, b: 54, c: 54, d: 100, e: 120, f: 110 },
          { condition: "RTO", a: 46, b: 48, c: 48, d: 76, e: 100, f: 90 },
          { condition: "Addl 0.5KG", a: 24, b: 28, c: 28, d: 70, e: 100, f: 84 }
        ],
        codCharges: "2% or ₹55 (Higher)",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "Surface 0.5KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { condition: "FWD 0-0.5 KG", a: 52, b: 54, c: 54, d: 76, e: 100, f: 84 },
          { condition: "RTO", a: 46, b: 48, c: 48, d: 66, e: 90, f: 74 },
          { condition: "Addl 0.5KG", a: 24, b: 28, c: 28, d: 36, e: 52, f: 44 }
        ],
        codCharges: "2% or ₹55 (Higher)",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "Express Reverse",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { condition: "FWD 0-0.5 KG", a: 80, b: 86, c: 86, d: 100, e: 130, f: 112 },
          { condition: "RTO", a: 80, b: 86, c: 86, d: 100, e: 130, f: 112 },
          { condition: "Addl 0.5KG", a: 56, b: 60, c: 60, d: 72, e: 76, f: 66 }
        ],
        codCharges: "2% or ₹55 (Higher)",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "1KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { condition: "FWD 0-1 KG", a: 76, b: 84, c: 84, d: 108, e: 152, f: 126 },
          { condition: "RTO", a: 68, b: 74, c: 74, d: 94, e: 130, f: 110 },
          { condition: "Addl 1KG", a: 50, b: 60, c: 60, d: 66, e: 80, f: 72 }
        ],
        codCharges: "2% or ₹55 (Higher)",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "2KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { condition: "FWD 0-2 KG", a: 128, b: 140, c: 140, d: 152, e: 200, f: 168 },
          { condition: "RTO", a: 110, b: 120, c: 120, d: 136, e: 180, f: 150 },
          { condition: "Addl 1KG", a: 32, b: 36, c: 36, d: 40, e: 60, f: 48 }
        ],
        codCharges: "2% or ₹55 (Higher)",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "5KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { condition: "FWD 0-5 KG", a: 200, b: 220, c: 220, d: 250, e: 340, f: 280 },
          { condition: "RTO", a: 180, b: 198, c: 198, d: 220, e: 300, f: 244 },
          { condition: "Addl 1KG", a: 28, b: 32, c: 32, d: 36, e: 48, f: 32 }
        ],
        codCharges: "2% or ₹55 (Higher)",
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "10KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { condition: "FWD 0-10 KG", a: 300, b: 340, c: 340, d: 370, e: 540, f: 400 },
          { condition: "RTO", a: 260, b: 300, c: 300, d: 330, e: 500, f: 350 },
          { condition: "Addl 1KG", a: 24, b: 28, c: 28, d: 30, e: 42, f: 32 }
        ],
        codCharges: "2% or ₹55 (Higher)",
        fuelSurcharge: "0%"
      }
    ]
  },
  {
    customerType: "platinum",
    multiplier: "1X", // Rates already include platinum pricing
    deliveryPartners: [
      {
        carrierName: "Xpressbees",
        serviceType: "Air 0.5KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-0.5 KG", 
            a: 62.4, b: 64.8, c: 64.8, d: 120, e: 144, f: 132 
          },
          { 
            condition: "RTO", 
            a: 55.2, b: 57.6, c: 57.6, d: 91.2, e: 120, f: 108 
          },
          { 
            condition: "Addl 0.5KG", 
            a: 28.8, b: 33.6, c: 33.6, d: 84, e: 120, f: 100.8 
          }
        ],
        codCharges: "1.5% or ₹49.5 (Higher)", // 1.5X of 2.36%
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "Surface 0.5KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-0.5 KG", 
            a: 62.4, b: 64.8, c: 64.8, d: 91.2, e: 120, f: 100.8 
          },
          { 
            condition: "RTO", 
            a: 55.2, b: 57.6, c: 57.6, d: 79.2, e: 108, f: 88.8 
          },
          { 
            condition: "Addl 0.5KG", 
            a: 28.8, b: 33.6, c: 33.6, d: 43.2, e: 62.4, f: 52.8 
          }
        ],
        codCharges: "1.5% or ₹49.5 (Higher)", // 1.5X of 2.36%
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "Express Reverse",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-0.5 KG", 
            a: 96, b: 103.2, c: 103.2, d: 120, e: 156, f: 134.4 
          },
          { 
            condition: "RTO", 
            a: 96, b: 103.2, c: 103.2, d: 120, e: 156, f: 134.4 
          },
          { 
            condition: "Addl 0.5KG", 
            a: 67.2, b: 72, c: 72, d: 86.4, e: 91.2, f: 79.2 
          }
        ],
        codCharges: "1.5% or ₹49.5 (Higher)", // 1.5X of 2.36%
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "1KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-1 KG", 
            a: 91.2, b: 100.8, c: 100.8, d: 129.6, e: 182.4, f: 151.2 
          },
          { 
            condition: "RTO", 
            a: 81.6, b: 88.8, c: 88.8, d: 112.8, e: 156, f: 132 
          },
          { 
            condition: "Addl 1KG", 
            a: 60, b: 72, c: 72, d: 79.2, e: 96, f: 86.4 
          }
        ],
        codCharges: "1.5% or ₹49.5 (Higher)", // 1.5X of 2.36%
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "2KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-2 KG", 
            a: 153.6, b: 168, c: 168, d: 182.4, e: 240, f: 201.6 
          },
          { 
            condition: "RTO", 
            a: 132, b: 144, c: 144, d: 163.2, e: 216, f: 180 
          },
          { 
            condition: "Addl 1KG", 
            a: 38.4, b: 43.2, c: 43.2, d: 48, e: 72, f: 57.6 
          }
        ],
        codCharges: "1.5% or ₹49.5 (Higher)", // 1.5X of 2.36%
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "5KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-5 KG", 
            a: 240, b: 264, c: 264, d: 300, e: 408, f: 336 
          },
          { 
            condition: "RTO", 
            a: 216, b: 237.6, c: 237.6, d: 264, e: 360, f: 292.8 
          },
          { 
            condition: "Addl 1KG", 
            a: 33.6, b: 38.4, c: 38.4, d: 43.2, e: 57.6, f: 38.4 
          }
        ],
        codCharges: "1.5% or ₹49.5 (Higher)", // 1.5X of 2.36%
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "10KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-10 KG", 
            a: 360, b: 408, c: 408, d: 444, e: 648, f: 480 
          },
          { 
            condition: "RTO", 
            a: 312, b: 360, c: 360, d: 396, e: 600, f: 420 
          },
          { 
            condition: "Addl 1KG", 
            a: 28.8, b: 33.6, c: 33.6, d: 36, e: 50.4, f: 38.4 
          }
        ],
        codCharges: "1.5% or ₹49.5 (Higher)", // 1.5X of 2.36%
        fuelSurcharge: "0%"
      }
    ]
  },
  {
    customerType: "custom",
    multiplier: "Ax", // Freight rates are already adjusted
    deliveryPartners: [
      // Xpressbees
      {
        carrierName: "Xpressbees",
        serviceType: "Air 0.5KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-0.5 KG", 
            a: 78 * 1, b: 81 * 1, c: 81 * 1, d: 150 * 1, e: 180 * 1, f: 165 * 1 
          },
          { 
            condition: "RTO", 
            a: 69 * 1, b: 72 * 1, c: 72 * 1, d: 114 * 1, e: 150 * 1, f: 135 * 1 
          },
          { 
            condition: "Addl 0.5KG", 
            a: 36 * 1, b: 42 * 1, c: 42 * 1, d: 105 * 1, e: 150 * 1, f: 126 * 1 
          }
        ],
        codCharges: "2X% or ₹132 (Higher)", // 2X of 2.36%
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "Surface 0.5KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-0.5 KG", 
            a: 78 * 1, b: 81 * 1, c: 81 * 1, d: 114 * 1, e: 150 * 1, f: 126 * 1 
          },
          { 
            condition: "RTO", 
            a: 69 * 1, b: 72 * 1, c: 72 * 1, d: 99 * 1, e: 135 * 1, f: 111 * 1 
          },
          { 
            condition: "Addl 0.5KG", 
            a: 36 * 1, b: 42 * 1, c: 42 * 1, d: 54 * 1, e: 78 * 1, f: 66 * 1 
          }
        ],
        codCharges: "2X% or ₹132 (Higher)", // 2X of 2.36%
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "Express Reverse",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-0.5 KG", 
            a: 120 * 1, b: 129 * 1, c: 129 * 1, d: 150 * 1, e: 195 * 1, f: 168 * 1 
          },
          { 
            condition: "RTO", 
            a: 120 * 1, b: 129 * 1, c: 129 * 1, d: 150 * 1, e: 195 * 1, f: 168 * 1 
          },
          { 
            condition: "Addl 0.5KG", 
            a: 84 * 1, b: 90 * 1, c: 90 * 1, d: 108 * 1, e: 114 * 1, f: 99 * 1 
          }
        ],
        codCharges: "2X% or ₹132 (Higher)", // 2X of 2.36%
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "1KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-1 KG", 
            a: 114 * 1, b: 126 * 1, c: 126 * 1, d: 162 * 1, e: 228 * 1, f: 189 * 1 
          },
          { 
            condition: "RTO", 
            a: 102 * 1, b: 111 * 1, c: 111 * 1, d: 141 * 1, e: 195 * 1, f: 165 * 1 
          },
          { 
            condition: "Addl 1KG", 
            a: 70 * 1, b: 90 * 1, c: 90 * 1, d: 99 * 1, e: 120 * 1, f: 108 * 1 
          }
        ],
        codCharges: "2X% or ₹132 (Higher)", // 2X of 2.36%
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "2KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-2 KG", 
            a: 192 * 1, b: 210 * 1, c: 210 * 1, d: 228 * 1, e: 300 * 1, f: 252 * 1 
          },
          { 
            condition: "RTO", 
            a: 165 * 1, b: 180 * 1, c: 180 * 1, d: 204 * 1, e: 270 * 1, f: 225 * 1 
          },
          { 
            condition: "Addl 1KG", 
            a: 42 * 1, b: 48 * 1, c: 48 * 1, d: 54 * 1, e: 72 * 1, f: 54 * 1 
          }
        ],
        codCharges: "2X% or ₹132 (Higher)", // 2X of 2.36%
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "5KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-5 KG", 
            a: 300 * 1, b: 330 * 1, c: 330 * 1, d: 375 * 1, e: 510 * 1, f: 420 * 1 
          },
          { 
            condition: "RTO", 
            a: 270 * 1, b: 297 * 1, c: 297 * 1, d: 330 * 1, e: 450 * 1, f: 366 * 1 
          },
          { 
            condition: "Addl 1KG", 
            a: 42 * 1, b: 48 * 1, c: 48 * 1, d: 54 * 1, e: 72 * 1, f: 54 * 1 
          }
        ],
        codCharges: "2X% or ₹132 (Higher)", // 2X of 2.36%
        fuelSurcharge: "0%"
      },
      {
        carrierName: "Xpressbees",
        serviceType: "10KG",
        zones: [
          { name: 'a', type: 'Within City' },
          { name: 'b', type: 'Within State' },
          { name: 'c', type: 'Regional' },
          { name: 'd', type: 'Metro to Metro' },
          { name: 'e', type: 'North-East, Jammu, HP, UK' },
          { name: 'f', type: 'All India' }
        ],
        rateCard: [
          { 
            condition: "FWD 0-10 KG", 
            a: 450 * 1, b: 510 * 1, c: 510 * 1, d: 555 * 1, e: 810 * 1, f: 600 * 1 
          },
          { 
            condition: "RTO", 
            a: 390 * 1, b: 450 * 1, c: 450 * 1, d: 495 * 1, e: 750 * 1, f: 525 * 1 
          },
          { 
            condition: "Addl 1KG", 
            a: 36 * 1, b: 42 * 1, c: 42 * 1, d: 45 * 1, e: 63 * 1, f: 48 * 1 
          }
        ],
        codCharges: "2X% or ₹132 (Higher)", // 2X of 2.36%
        fuelSurcharge: "0%"
      }
    ]
  }
];

module.exports = chargeSheet;
