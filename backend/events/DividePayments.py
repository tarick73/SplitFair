def dividePay(data):
    RESULT = []
    P_COUNT = len(data)
    fullSum = float(sum(amount for _, amount in data))
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
