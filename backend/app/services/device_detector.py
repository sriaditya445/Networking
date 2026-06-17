import re
from dataclasses import dataclass


@dataclass
class DetectionResult:
    device_type: str
    vendor: str
    model: str | None
    confidence: float
    matched_patterns: list[str]


# Vendor-agnostic detection patterns (extensible via MongoDB in future)
DEVICE_PATTERNS: dict[str, list[tuple[str, float]]] = {
    "switch": [
        (r"spanning-tree\s+mode\s+\w+", 0.9),
        (r"dot1x\s+system-auth-control", 0.85),
        (r"switchport\s+mode\s+(access|trunk)", 0.8),
        (r"spanning-tree\s+vlan", 0.75),
        (r"vlan\s+\d+", 0.4),
        (r"interface\s+range", 0.5),
    ],
    "router": [
        (r"router\s+ospf\s+\d+", 0.95),
        (r"router\s+bgp\s+\d+", 0.95),
        (r"ip\s+route\s+", 0.85),
        (r"router\s+eigrp\s+\d+", 0.9),
        (r"router\s+rip", 0.85),
        (r"ip\s+nat\s+", 0.7),
    ],
    "wlc": [
        (r"parameter-map\s+type\s+webauth", 0.95),
        (r"^wlan\s+\d+", 0.9),
        (r"flow\s+monitor\s+wireless", 0.85),
        (r"wireless\s+profile\s+policy", 0.85),
        (r"ap\s+dot11\s+", 0.8),
        (r"flex\s+connect\s+", 0.75),
    ],
    "nexus": [
        (r"feature\s+nxapi", 0.9),
        (r"nv\s+overlay\s+evpn", 0.85),
        (r"interface\s+nve\d+", 0.85),
        (r"feature\s+bgp", 0.4),
    ],
    "firewall": [
        (r"access-list\s+\w+\s+(extended|standard)", 0.6),
        (r"policy-map\s+type\s+inspect", 0.85),
        (r"zone\s+security\s+", 0.85),
        (r"object-group\s+network", 0.8),
        (r"security\s+level", 0.7),
    ],
}

VENDOR_PATTERNS: dict[str, list[tuple[str, float]]] = {
    "Cisco": [
        (r"^!\s*Last\s+configuration", 0.5),
        (r"service\s+timestamps\s+log", 0.6),
        (r"version\s+\d+", 0.4),
        (r"cisco", 0.3),
    ],
    "Juniper": [
        (r"set\s+system\s+host-name", 0.95),
        (r"set\s+interfaces", 0.7),
    ],
    "Arista": [
        (r"!\s*Device:\s*.*EOS", 0.9),
        (r"transceiver\s+qsfp", 0.6),
    ],
    "Palo Alto": [
        (r"set\s+deviceconfig\s+system", 0.95),
        (r"set\s+rulebase\s+security", 0.85),
    ],
    "Fortinet": [
        (r"config\s+system\s+interface", 0.9),
        (r"config\s+firewall\s+policy", 0.85),
    ],
}

MODEL_PATTERNS = {
    "C3650": [r"ws-c3650-\S+",r"c3650-\S+"],
    "C3850": [r"ws-c3850-\S+",r"c3850-\S+"],
    "C9200": [r"c9200-\S+"],
    "C9300": [r"c9300-\S+"],
    "ISR4331": [r"isr4331"]
}


def detect_device_type(config_content: str) -> DetectionResult:
    """Score config against patterns and return best device type match."""
    scores: dict[str, float] = {}
    matched: dict[str, list[str]] = {}

    for device_type, patterns in DEVICE_PATTERNS.items():
        score = 0.0
        matches: list[str] = []
        for pattern, weight in patterns:
            if re.search(pattern, config_content, re.MULTILINE | re.IGNORECASE):
                score += weight
                matches.append(pattern)
        scores[device_type] = score
        matched[device_type] = matches

    best_type = max(scores, key=lambda k: scores[k])
    best_score = scores[best_type]

    if best_score < 0.5:
        return DetectionResult(
            device_type="unknown",
            vendor=_detect_vendor(config_content),
            model=_detect_model(config_content),
            confidence=0.0,
            matched_patterns=[],
        )

    max_possible = sum(w for _, w in DEVICE_PATTERNS[best_type])
    confidence = min(best_score / max(max_possible, 1.0), 1.0)

    return DetectionResult(
        device_type=best_type,
        vendor=_detect_vendor(config_content),
        model=_detect_model(config_content),
        confidence=round(confidence, 2),
        matched_patterns=matched[best_type],
    )


def _detect_vendor(config_content: str) -> str:
    scores: dict[str, float] = {}
    for vendor, patterns in VENDOR_PATTERNS.items():
        score = 0.0
        for pattern, weight in patterns:
            if re.search(pattern, config_content, re.MULTILINE | re.IGNORECASE):
                score += weight
        scores[vendor] = score

    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] > 0.3 else "Cisco"

def _detect_model(config_content: str) -> str | None:
    for model, patterns in MODEL_PATTERNS.items():
        for pattern in patterns:
            if re.search(
                pattern,
                config_content,
                re.MULTILINE | re.IGNORECASE
            ):
                return model
    return None
