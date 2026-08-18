# pricing_engine.py

from .rates import rates
from .multipliers import complexity_multiplier, region_multiplier
from .extra_costs import extra_costs


def get_hourly_rate(domains, experience_level):
    exp = experience_level if experience_level in rates["web"] else "intermediate"
    total = 0
    for d in domains:
        total += rates.get(d, rates["web"])[exp]
    return total / len(domains)


def calculate_base_cost(hours, hourly_rate, complexity):
    return hours * hourly_rate * complexity_multiplier[complexity]


def apply_region_multiplier(cost, region):
    return cost * region_multiplier.get(region, 1.0)


def calculate_extra_costs(features):
    cost = 0
    
    if "ai chatbot" in features:
        cost += extra_costs["openai"]
    
    if "database setup" in features:
        cost += extra_costs["firebase"]
    
    return cost


def estimate_price(features, domains, hours, complexity, region, experience_level):
    
    hourly_rate = get_hourly_rate(domains, experience_level)
    
    base_cost = calculate_base_cost(hours, hourly_rate, complexity)
    
    regional_cost = apply_region_multiplier(base_cost, region)
    
    extra = calculate_extra_costs(features)
    
    total_cost = regional_cost + extra
    
    # price range (very important)
    min_price = int(total_cost * 0.85)
    max_price = int(total_cost * 1.15)
    
    return {
        "hourly_rate": hourly_rate,
        "base_cost": base_cost,
        "regional_cost": regional_cost,
        "extra_cost": extra,
        "min_price": min_price,
        "max_price": max_price
    }

def combine_prices(rule_price: int, ml_price: int) -> int:
    """Weighted hybrid with rule-heavy blend when ML and rules wildly disagree."""
    if ml_price <= 0:
        return int(rule_price)
    if rule_price <= 0:
        return int(ml_price)
    lo, hi = min(rule_price, ml_price), max(rule_price, ml_price)
    ratio = hi / max(lo, 1)
    if ratio > 3:
        return int(0.85 * rule_price + 0.15 * ml_price)
    return int(0.7 * rule_price + 0.3 * ml_price)