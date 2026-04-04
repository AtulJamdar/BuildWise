def generate_report(results):
    score = 100

    severity_weight = {
        "HIGH": 10,
        "MEDIUM": 5,
        "LOW": 2
    }

    summary = {
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0
    }

    # ✅ FIXED: Now iterates through the list of dictionaries
    for issue in results:
        severity = issue["severity"]
        
        # Check if the severity exists in our mapping to avoid KeyErrors
        if severity in summary:
            summary[severity] += 1
            score -= severity_weight[severity]

    # Ensure score doesn't drop below 0
    score = max(score, 0)

    return score, summary