"""Generate recommendations and remediation commands for failed compliance rules."""

from app.schemas.common_schema import RuleResult

RECOMMENDATION_MAP: dict[str, tuple[str, str]] = {
    "aaa new-model": ("Enable AAA new model for centralized authentication", "aaa new-model"),
    "service password-encryption": ("Enable password encryption to protect stored credentials", "service password-encryption"),
    "dot1x system-auth-control": ("Enable 802.1X system-wide authentication control", "dot1x system-auth-control"),
    "aaa authentication login default": ("Configure AAA authentication for login sessions", "aaa authentication login default group tacacs+ local"),
    "aaa authorization exec default": ("Configure AAA authorization for exec sessions", "aaa authorization exec default group tacacs+ local"),
    "aaa accounting exec default": ("Enable AAA accounting for exec sessions", "aaa accounting exec default start-stop group tacacs+"),
    "login block-for": ("Configure login block-for to prevent brute force attacks", "login block-for 120 attempts 5 within 60"),
    "login quiet-mode": ("Enable login quiet-mode during attack mitigation", "login quiet-mode access-class ACL_VTY"),
    "no ip domain-lookup": ("Disable DNS lookup on failed commands", "no ip domain-lookup"),
    "ip domain-name": ("Configure domain name for device identification", "ip domain-name {{domain_name}}"),
    "ip name-server": ("Configure DNS name servers", "ip name-server {{dns_servers}}"),
    "ntp server": ("Configure NTP server for time synchronization", "ntp server {{ntp_servers}}"),
    "clock timezone": ("Configure timezone for accurate timestamps", "clock timezone EST -5"),
    "snmp-server community": ("Configure read-only SNMP community with ACL", "snmp-server community {{snmp_community}} RO ACL_SNMP"),
    "snmp-server location": ("Set SNMP location for asset tracking", "snmp-server location {{location}}"),
    "snmp-server contact": ("Set SNMP contact information", "snmp-server contact {{contact}}"),
    "logging buffered": ("Enable buffered logging", "logging buffered 64000"),
    "logging console": ("Configure console logging level", "logging console informational"),
    "logging host": ("Configure remote syslog server", "logging host {{syslog_servers}}"),
    "service timestamps log": ("Enable timestamps on log messages", "service timestamps log datetime msec localtime show-timezone"),
    "spanning-tree mode": ("Configure spanning-tree mode", "spanning-tree mode rapid-pvst"),
    "spanning-tree portfast bpduguard default": ("Enable BPDU guard on PortFast ports", "spanning-tree portfast bpduguard default"),
    "spanning-tree loopguard default": ("Enable loop guard globally", "spanning-tree loopguard default"),
    "port-security": ("Enable port security on access ports", "switchport port-security"),
    "switchport mode access": ("Configure switchport mode access", "switchport mode access"),
    "switchport nonegotiate": ("Disable DTP negotiation", "switchport nonegotiate"),
    "ip routing": ("Enable IP routing on L3 switch", "ip routing"),
    "router ospf": ("Configure OSPF routing protocol", "router ospf {{ospf_process}}"),
    "router bgp": ("Configure BGP routing protocol", "router bgp {{bgp_asn}}"),
    "ip route": ("Configure static routes as needed", "ip route {{destination}} {{mask}} {{next_hop}}"),
    "wlan": ("Configure WLAN profiles", "wlan {{wlan_id}} {{profile_name}}"),
    "parameter-map type webauth": ("Configure web authentication parameter map", "parameter-map type webauth global"),
    "flow monitor wireless": ("Enable wireless AVC flow monitoring", "flow monitor wireless-avc-basic"),
    "vrrp": ("Configure VRRP for gateway redundancy", "vrrp {{group}} priority {{priority}}"),
    "hsrp": ("Configure HSRP for gateway redundancy", "standby {{group}} priority {{priority}}"),
    "redundancy": ("Configure device redundancy", "redundancy"),
    "stackwise": ("Configure StackWise for switch stacking", "switch {{stack_num}} provision {{model}}"),
}


def _lookup_recommendation(rule: str) -> tuple[str, str]:
    rule_lower = rule.lower().strip()
    for key, (rec, rem) in RECOMMENDATION_MAP.items():
        if key.lower() in rule_lower or rule_lower.startswith(key.lower()):
            return rec, rem

    first_token = rule.split()[0] if rule.split() else rule
    return (
        f"Implement required configuration: {rule}",
        rule,
    )


def enrich_failed_rules(failed: list[RuleResult]) -> list[RuleResult]:
    """Add recommendation and remediation to each failed rule."""
    enriched: list[RuleResult] = []
    for rule in failed:
        rec, rem = _lookup_recommendation(rule.rule)
        enriched.append(
            RuleResult(
                rule=rule.rule,
                category=rule.category,
                status=rule.status,
                recommendation=rec,
                remediation=rem,
            )
        )
    return enriched


def build_recommendations(failed: list[RuleResult]) -> list[RuleResult]:
    """Build recommendation list from failed rules."""
    return enrich_failed_rules(failed)
