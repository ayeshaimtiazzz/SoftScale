def apply_user_adjustments(price, effort=1.0, urgency=1.0):
    
    # effort increases cost
    price *= effort
    
    # urgency increases cost
    if urgency > 1:
        price *= 1.2
    
    return int(price)