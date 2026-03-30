freelancers = {
    "junior": {
        "rate_multiplier": 0.8
    },
    "mid": {
        "rate_multiplier": 1.0
    },
    "senior": {
        "rate_multiplier": 1.4
    }
}


def adjust_price_for_freelancer(price, level):
    multiplier = freelancers[level]["rate_multiplier"]
    return int(price * multiplier)