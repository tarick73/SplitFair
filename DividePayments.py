def dividePay(data):
    RESULT = []
    P_COUNT = len(data)
    fullSum = sum(amount for _, amount in data)
    MEAN_SUM = fullSum / P_COUNT

    CRED_STACK = [(name, amount - MEAN_SUM) for name, amount in data if amount > MEAN_SUM]
    DEBT_STACK = [(name, MEAN_SUM - amount) for name, amount in data if amount < MEAN_SUM]

    CRED_STACK = [list(item) for item in CRED_STACK]
    DEBT_STACK = [list(item) for item in DEBT_STACK]

    for c_idx, (C, cred) in enumerate(CRED_STACK):
        if cred <=0:
            continue
        for d_idx, (D, debt) in enumerate(DEBT_STACK):
            if debt <=0:
                continue
            if cred >= debt:
                RESULT.append(f'{D} -> {C} {debt:.2f}')
                cred -= debt
                DEBT_STACK[d_idx][1] = 0
                CRED_STACK[c_idx][1] = cred
            else:
                RESULT.append(f'{D} -> {C} {cred:.2f}')
                debt -= cred
                DEBT_STACK[d_idx][1] = debt
                CRED_STACK[c_idx][1] = 0
                cred = 0
                break
    return RESULT


# Extended test cases as arrays of tuples
test1 = [("Alice", 40), ("Bob", 20), ("Charlie", 0)]                                            # Charlie pays Alice 20
test2 = [("Alice", 40), ("Bob", 20), ("Charlie", 40)]                                           # Bob pays Alice 6.67, Bob pays Charlie 6.67
test3 = [("John", 100), ("Mary", 50), ("Sue", 150)]                                             # Mary pays Sue 50
test4 = [("A", 0), ("B", 0), ("C", 90)]                                                         # A and B pay C 30 each
test5 = [("P1", 10), ("P2", 10), ("P3", 10)]                                                    # Perfectly balanced
test6 = [("X", 70), ("Y", 0), ("Z", 30)]                                                        # Y pays X 33.33
test7 = [("P1", 300), ("P2", 150), ("P3", 200), ("P4", 100), ("P5", 50), ("P6", 70)]            # P4 and P5 pay P1 (45 and 95)
test8 = [("X1", 10), ("X2", 0), ("X3", 0), ("X4", 0), ("X5", 40), ("X6", 50)]                   # X1 pays X5 6.67, X2 pays X6 16.67
test9 = [("K1", 500), ("K2", 0), ("K3", 0), ("K4", 1000), ("K5", 300), ("K6", 200)]             # K5 & K6 pay K1, K2 & K3 pay K4
test10 = [("A1", 5000), ("A2", 3000), ("A3", 2000), ("A4", 4000), ("A5", 1000), ("A6", 500)]    # A3 & A5 pay A1
test11 = [("U1", 80), ("U2", 45), ("U3", 35), ("U4", 60), ("U5", 20)]                           # U2/U3 pay U1, U5 pays U4
test12 = [("M1", 120), ("M2", 130), ("M3", 100), ("M4", 110), ("M5", 50)]                       # M5 pays M2
test13 = [("R1", 200), ("R2", 100), ("R3", 0), ("R4", 50), ("R5", 50)]                          # R2/R3 pay R1, rest split debts
test14 = [("S1", 500), ("S2", 200), ("S3", 100), ("S4", 400), ("S5", 300), ("S6", 0)]           # S2/S3 pay S1, S6 pays S4
test15 = [("T1", 1000), ("T2", 450), ("T3", 550), ("T4", 300), ("T5", 700)]                     # T2 pays T1, T4 pays T5
test16 = [("A", 100), ("B", 50), ("C", 30), ("D", 70), ("E", 20)]                               # B and C pay A

print(dividePay(test1))
print(dividePay(test2))
print(dividePay(test3))
print(dividePay(test4))
print(dividePay(test5))
print(dividePay(test6))
print(dividePay(test7))
print(dividePay(test8))
print(dividePay(test9))
print(dividePay(test10))
print(dividePay(test11))
print(dividePay(test12))
print(dividePay(test13))
print(dividePay(test14))
print(dividePay(test15))
print(dividePay(test16))
