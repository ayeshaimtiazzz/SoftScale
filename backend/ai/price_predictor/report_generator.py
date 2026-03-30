# report_generator.py

def calculate_breakdown(domains, hours, hourly_rate):
    breakdown = {}
    
    split_hours = hours / len(domains)
    
    for d in domains:
        breakdown[d] = int(split_hours * hourly_rate)
    
    return breakdown

def estimate_timeline(hours):
    days = hours / 6   # assume 6 productive hours/day
    
    if days < 7:
        return "1 week"
    elif days < 14:
        return "2 weeks"
    elif days < 30:
        return "3–4 weeks"
    else:
        return "1–2 months"
    


def generate_explanation(features, complexity, domains):
    
    explanation = "This project includes "
    
    explanation += ", ".join(features)
    
    explanation += f". It is a {complexity} complexity project involving "
    
    explanation += ", ".join(domains)
    
    if "ai" in domains:
        explanation += ". AI integration increases development cost"
    
    return explanation

def generate_report(features, domains, hours, pricing_result, complexity):
    
    breakdown = calculate_breakdown(domains, hours, pricing_result["hourly_rate"])
    
    timeline = estimate_timeline(hours)
    
    explanation = generate_explanation(features, complexity, domains)
    
    report = {
        "price_range": f'{pricing_result["min_price"]} - {pricing_result["max_price"]}',
        "timeline": timeline,
        "estimated_hours": hours,
        "cost_breakdown": breakdown,
        "extra_cost": pricing_result["extra_cost"],
        "explanation": explanation
    }
    
    return report