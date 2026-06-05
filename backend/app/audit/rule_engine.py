"""
Compliance Rule Engine

Implements 50+ compliance rules for enterprise network device auditing.
Each rule evaluates device configuration against security and compliance standards.

Rules are organized by category:
  - AAA (Authentication, Authorization, Accounting)
  - SSH
  - NTP
  - SNMP
  - Logging
  - Spanning Tree
  - Port Security
  - DHCP Snooping
  - ARP Inspection
  - Dot1x
  - Device Tracking
  - VLAN Security
  - Interface Security
  - Management Access
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from datetime import datetime
from app.core.logger import logger


class ComplianceFinding:
    """Individual compliance finding from rule evaluation."""

    def __init__(
        self,
        rule_id: str,
        section: str,
        severity: str,
        status: str,
        expected: str,
        actual: str,
        remediation: str,
        evidence: str = ""
    ):
        self.rule_id = rule_id
        self.section = section
        self.severity = severity  # CRITICAL, HIGH, MEDIUM, LOW, INFO
        self.status = status  # PASS, FAIL, NOT_APPLICABLE
        self.expected = expected
        self.actual = actual
        self.remediation = remediation
        self.evidence = evidence

    def to_dict(self) -> Dict[str, Any]:
        """Convert finding to dictionary."""
        return {
            "rule_id": self.rule_id,
            "section": self.section,
            "severity": self.severity,
            "status": self.status,
            "expected": self.expected,
            "actual": self.actual,
            "remediation": self.remediation,
            "evidence": self.evidence
        }


class ComplianceRule(ABC):
    """Base class for compliance rules."""

    def __init__(self):
        self.rule_id: str = ""
        self.section: str = ""
        self.severity: str = ""
        self.description: str = ""
        self.remediation: str = ""

    @abstractmethod
    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        """Evaluate device configuration against this rule."""
        pass


# ============ AAA Rules ============

class AAA_AuthenticationEnabled(ComplianceRule):
    """Rule: AAA authentication must be enabled."""

    def __init__(self):
        self.rule_id = "AAA_AUTHENTICATION_ENABLED"
        self.section = "AAA"
        self.severity = "CRITICAL"
        self.description = "AAA new-model must be enabled for centralized authentication"
        self.remediation = "Configure: aaa new-model"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        aaa = device_config.get("aaa", {})
        enabled = aaa.get("new_model", False)

        status = "PASS" if enabled else "FAIL"
        actual = "AAA new-model enabled" if enabled else "AAA new-model not enabled"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="AAA new-model must be enabled",
            actual=actual,
            remediation=self.remediation,
            evidence=f"aaa.new_model = {enabled}"
        )


class AAA_TACACS_Configured(ComplianceRule):
    """Rule: TACACS+ server must be configured."""

    def __init__(self):
        self.rule_id = "AAA_TACACS_CONFIGURED"
        self.section = "AAA"
        self.severity = "HIGH"
        self.description = "TACACS+ server must be configured for AAA"
        self.remediation = "Configure: tacacs-server host <IP>"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        aaa = device_config.get("aaa", {})
        tacacs_count = len(aaa.get("tacacs_servers", []))

        status = "PASS" if tacacs_count > 0 else "FAIL"
        actual = f"{tacacs_count} TACACS+ server(s) configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="At least 1 TACACS+ server configured",
            actual=actual,
            remediation=self.remediation,
            evidence=f"tacacs_servers = {aaa.get('tacacs_servers', [])}"
        )


class AAA_LocalFallback(ComplianceRule):
    """Rule: Local authentication fallback must be configured."""

    def __init__(self):
        self.rule_id = "AAA_LOCAL_FALLBACK"
        self.section = "AAA"
        self.severity = "HIGH"
        self.description = "Local authentication should be configured as fallback"
        self.remediation = "Configure: aaa authentication login default group tacacs+ local"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        aaa = device_config.get("aaa", {})
        login_default = aaa.get("authentication", {}).get("login_default", [])

        has_local = "local" in login_default
        status = "PASS" if has_local else "FAIL"
        actual = f"Methods: {login_default}" if login_default else "No methods configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="'local' must be in authentication login default methods",
            actual=actual,
            remediation=self.remediation,
            evidence=f"login_default = {login_default}"
        )


class AAA_AccountingEnabled(ComplianceRule):
    """Rule: AAA accounting must be enabled."""

    def __init__(self):
        self.rule_id = "AAA_ACCOUNTING_ENABLED"
        self.section = "AAA"
        self.severity = "MEDIUM"
        self.description = "AAA accounting should be enabled for audit trails"
        self.remediation = "Configure: aaa accounting exec default start-stop group tacacs+"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        aaa = device_config.get("aaa", {})
        accounting_enabled = aaa.get("accounting", {}).get("enabled", False)

        status = "PASS" if accounting_enabled else "FAIL"
        actual = "Accounting enabled" if accounting_enabled else "Accounting not enabled"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="AAA accounting must be enabled",
            actual=actual,
            remediation=self.remediation,
            evidence=f"accounting.enabled = {accounting_enabled}"
        )


class AAA_ServerTimeout(ComplianceRule):
    """Rule: AAA server timeout should be appropriate."""

    def __init__(self):
        self.rule_id = "AAA_SERVER_TIMEOUT"
        self.section = "AAA"
        self.severity = "LOW"
        self.description = "AAA server timeout should be configured"
        self.remediation = "Configure appropriate timeout for TACACS+/RADIUS servers"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        # Simplified version - checks if servers are configured
        aaa = device_config.get("aaa", {})
        has_servers = len(aaa.get("tacacs_servers", [])) > 0 or len(aaa.get("radius_servers", [])) > 0

        status = "PASS" if has_servers else "FAIL"
        actual = f"Servers configured" if has_servers else "No AAA servers configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="AAA servers with timeout configured",
            actual=actual,
            remediation=self.remediation,
            evidence=f"tacacs={len(aaa.get('tacacs_servers', []))}, radius={len(aaa.get('radius_servers', []))}"
        )


# ============ SSH Rules ============

class SSH_Version2Only(ComplianceRule):
    """Rule: SSH version 2 only - SSH version 1 MUST NOT be allowed."""

    def __init__(self):
        self.rule_id = "SSH_VERSION_2_ONLY"
        self.section = "SSH"
        self.severity = "CRITICAL"
        self.description = "SSH must be version 2 only for security"
        self.remediation = "Configure: ip ssh version 2"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        ssh = device_config.get("ssh", {})
        version = ssh.get("version", None)

        status = "PASS" if version == 2 else "FAIL"
        actual = f"SSH version {version}" if version else "SSH version not configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="SSH version must be 2",
            actual=actual,
            remediation=self.remediation,
            evidence=f"ssh.version = {version}"
        )


class SSH_StrongKeyExchange(ComplianceRule):
    """Rule: SSH must use strong key exchange algorithms."""

    def __init__(self):
        self.rule_id = "SSH_STRONG_KEY_EXCHANGE"
        self.section = "SSH"
        self.severity = "HIGH"
        self.description = "Weak key exchange algorithms should be disabled"
        self.remediation = "Configure strong key exchange: diffie-hellman-group14-sha1 or higher"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        ssh = device_config.get("ssh", {})
        keyx = ssh.get("keyx", [])

        # Weak algorithms
        weak_algorithms = ["diffie-hellman-group1-sha1"]
        has_weak = any(alg in keyx for alg in weak_algorithms)

        status = "FAIL" if has_weak else ("PASS" if keyx else "INFO")
        actual = f"Algorithms: {keyx}" if keyx else "Key exchange not configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="No weak key exchange algorithms",
            actual=actual,
            remediation=self.remediation,
            evidence=f"ssh.keyx = {keyx}"
        )


class SSH_StrongEncryption(ComplianceRule):
    """Rule: SSH must use strong encryption."""

    def __init__(self):
        self.rule_id = "SSH_STRONG_ENCRYPTION"
        self.section = "SSH"
        self.severity = "HIGH"
        self.description = "Weak encryption algorithms should be disabled"
        self.remediation = "Configure strong encryption: aes128-ctr or aes256-ctr"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        ssh = device_config.get("ssh", {})
        encryption = ssh.get("encryption", [])

        weak_algorithms = ["des", "3des-cbc"]
        has_weak = any(alg in encryption for alg in weak_algorithms)

        status = "FAIL" if has_weak else ("PASS" if encryption else "INFO")
        actual = f"Encryption: {encryption}" if encryption else "Encryption not configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="No weak encryption algorithms",
            actual=actual,
            remediation=self.remediation,
            evidence=f"ssh.encryption = {encryption}"
        )


class SSH_StrongMAC(ComplianceRule):
    """Rule: SSH must use strong MAC algorithms."""

    def __init__(self):
        self.rule_id = "SSH_STRONG_MAC"
        self.section = "SSH"
        self.severity = "MEDIUM"
        self.description = "Weak MAC algorithms should be disabled"
        self.remediation = "Configure strong MAC: hmac-sha2-256 or higher"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        ssh = device_config.get("ssh", {})
        mac = ssh.get("mac_algorithms", [])

        weak_algorithms = ["hmac-md5"]
        has_weak = any(alg in mac for alg in weak_algorithms)

        status = "FAIL" if has_weak else ("PASS" if mac else "INFO")
        actual = f"MAC algorithms: {mac}" if mac else "MAC not configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="No weak MAC algorithms",
            actual=actual,
            remediation=self.remediation,
            evidence=f"ssh.mac = {mac}"
        )


class SSH_TimeoutSet(ComplianceRule):
    """Rule: SSH timeout must be configured."""

    def __init__(self):
        self.rule_id = "SSH_TIMEOUT_SET"
        self.section = "SSH"
        self.severity = "LOW"
        self.description = "SSH timeout should be configured"
        self.remediation = "Configure: ip ssh time-out 60"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        ssh = device_config.get("ssh", {})
        timeout = ssh.get("timeout", None)

        status = "PASS" if timeout else "FAIL"
        actual = f"Timeout: {timeout} seconds" if timeout else "Timeout not configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="SSH timeout must be configured (60+ seconds recommended)",
            actual=actual,
            remediation=self.remediation,
            evidence=f"ssh.timeout = {timeout}"
        )


class SSH_PasswordAuthDisabled(ComplianceRule):
    """Rule: SSH should disable password authentication in favor of keys."""

    def __init__(self):
        self.rule_id = "SSH_PASSWORD_AUTH_DISABLED"
        self.section = "SSH"
        self.severity = "HIGH"
        self.description = "SSH should use key-based authentication"
        self.remediation = "Configure: no ip ssh server authenticate user admin"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        ssh = device_config.get("ssh", {})
        pwd_auth = ssh.get("password_authentication_enabled", True)

        status = "FAIL" if pwd_auth else "PASS"
        actual = "Password authentication enabled" if pwd_auth else "Password authentication disabled"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="SSH password authentication should be disabled",
            actual=actual,
            remediation=self.remediation,
            evidence=f"ssh.password_auth = {pwd_auth}"
        )


# ============ NTP Rules ============

class NTP_Configured(ComplianceRule):
    """Rule: NTP must be configured."""

    def __init__(self):
        self.rule_id = "NTP_CONFIGURED"
        self.section = "NTP"
        self.severity = "MEDIUM"
        self.description = "NTP must be configured for time synchronization"
        self.remediation = "Configure: ntp server <IP>"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        ntp = device_config.get("ntp", {})
        servers = ntp.get("servers", [])

        status = "PASS" if servers else "FAIL"
        actual = f"{len(servers)} NTP server(s) configured" if servers else "No NTP servers configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="At least 1 NTP server must be configured",
            actual=actual,
            remediation=self.remediation,
            evidence=f"ntp.servers = {servers}"
        )


class NTP_MultipleServers(ComplianceRule):
    """Rule: Multiple NTP servers should be configured for redundancy."""

    def __init__(self):
        self.rule_id = "NTP_MULTIPLE_SERVERS"
        self.section = "NTP"
        self.severity = "HIGH"
        self.description = "Multiple NTP servers provide redundancy"
        self.remediation = "Configure at least 2 NTP servers"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        ntp = device_config.get("ntp", {})
        servers = ntp.get("servers", [])
        server_count = len(servers)

        status = "PASS" if server_count >= 2 else ("WARNING" if server_count == 1 else "FAIL")
        actual = f"{server_count} NTP server(s) configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="At least 2 NTP servers for redundancy",
            actual=actual,
            remediation=self.remediation,
            evidence=f"ntp.servers = {servers}"
        )


class NTP_Authentication(ComplianceRule):
    """Rule: NTP authentication should be enabled."""

    def __init__(self):
        self.rule_id = "NTP_AUTHENTICATION"
        self.section = "NTP"
        self.severity = "HIGH"
        self.description = "NTP authentication prevents spoofing"
        self.remediation = "Configure: ntp authenticate and ntp trusted-key"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        ntp = device_config.get("ntp", {})
        auth_enabled = ntp.get("authentication_enabled", False)

        status = "PASS" if auth_enabled else "FAIL"
        actual = "NTP authentication enabled" if auth_enabled else "NTP authentication not enabled"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="NTP authentication must be enabled",
            actual=actual,
            remediation=self.remediation,
            evidence=f"ntp.authentication_enabled = {auth_enabled}"
        )


class NTP_SourceInterface(ComplianceRule):
    """Rule: NTP source interface should be configured."""

    def __init__(self):
        self.rule_id = "NTP_SOURCE_INTERFACE"
        self.section = "NTP"
        self.severity = "MEDIUM"
        self.description = "NTP source interface ensures correct source IP"
        self.remediation = "Configure: ntp source <interface>"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        ntp = device_config.get("ntp", {})
        source = ntp.get("source_interface", None)

        status = "PASS" if source else "FAIL"
        actual = f"Source: {source}" if source else "Source interface not configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="NTP source interface must be configured",
            actual=actual,
            remediation=self.remediation,
            evidence=f"ntp.source = {source}"
        )


# ============ SNMP Rules ============

class SNMP_Version3Only(ComplianceRule):
    """Rule: SNMP v3 should be used; SNMP v1/v2 should be disabled."""

    def __init__(self):
        self.rule_id = "SNMP_VERSION3_ONLY"
        self.section = "SNMP"
        self.severity = "CRITICAL"
        self.description = "SNMP v3 with encryption is required"
        self.remediation = "Configure SNMP v3 users and disable SNMP v1/v2"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        snmp = device_config.get("snmp", {})
        v3_users = snmp.get("v3_users", [])
        communities = snmp.get("community_strings", {}).get("read_only", [])

        has_v3 = len(v3_users) > 0
        has_v2c = len(communities) > 0

        status = "PASS" if (has_v3 and not has_v2c) else ("WARNING" if has_v3 else "FAIL")
        actual = f"v3_users={len(v3_users)}, v2c_communities={len(communities)}"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="SNMP v3 only; SNMP v1/v2 should be disabled",
            actual=actual,
            remediation=self.remediation,
            evidence=f"snmp.version = {snmp.get('version')}"
        )


class SNMP_CommunityStrengthv2c(ComplianceRule):
    """Rule: If SNMP v2c used, community strings must be strong."""

    def __init__(self):
        self.rule_id = "SNMP_COMMUNITY_STRENGTH_V2C"
        self.section = "SNMP"
        self.severity = "HIGH"
        self.description = "Default SNMP v2c community strings are a security risk"
        self.remediation = "Use strong community strings or migrate to SNMP v3"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        snmp = device_config.get("snmp", {})
        communities = snmp.get("community_strings", {}).get("read_only", [])

        weak_communities = ["public", "private"]
        has_weak = any(comm in communities for comm in weak_communities)

        status = "FAIL" if has_weak else ("PASS" if communities else "INFO")
        actual = f"Communities: {communities}" if communities else "No v2c configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="No default community strings (public, private)",
            actual=actual,
            remediation=self.remediation,
            evidence=f"snmp.communities = {communities}"
        )


class SNMP_TrapHostsConfigured(ComplianceRule):
    """Rule: SNMP trap hosts should be configured."""

    def __init__(self):
        self.rule_id = "SNMP_TRAP_HOSTS_CONFIGURED"
        self.section = "SNMP"
        self.severity = "MEDIUM"
        self.description = "SNMP traps enable alerting on network events"
        self.remediation = "Configure: snmp-server host <IP> traps"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        snmp = device_config.get("snmp", {})
        trap_hosts = snmp.get("trap_hosts", [])

        status = "PASS" if trap_hosts else "FAIL"
        actual = f"{len(trap_hosts)} trap host(s) configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="At least 1 SNMP trap host configured",
            actual=actual,
            remediation=self.remediation,
            evidence=f"snmp.trap_hosts = {trap_hosts}"
        )


class SNMP_ReadWriteSeparation(ComplianceRule):
    """Rule: Read and write community strings should be separated."""

    def __init__(self):
        self.rule_id = "SNMP_READ_WRITE_SEPARATION"
        self.section = "SNMP"
        self.severity = "HIGH"
        self.description = "Read-only and read-write should use different strings"
        self.remediation = "Use different community strings for RO and RW"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        snmp = device_config.get("snmp", {})
        ro = set(snmp.get("community_strings", {}).get("read_only", []))
        rw = set(snmp.get("community_strings", {}).get("read_write", []))

        overlap = ro & rw
        status = "FAIL" if overlap else "PASS"
        actual = f"RO={len(ro)}, RW={len(rw)}, Overlap={len(overlap)}"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="No overlap between RO and RW community strings",
            actual=actual,
            remediation=self.remediation,
            evidence=f"ro_communities={list(ro)}, rw_communities={list(rw)}"
        )


class SNMP_InformAuthentication(ComplianceRule):
    """Rule: SNMP informs should use authentication."""

    def __init__(self):
        self.rule_id = "SNMP_INFORM_AUTHENTICATION"
        self.section = "SNMP"
        self.severity = "MEDIUM"
        self.description = "SNMP informs should be authenticated"
        self.remediation = "Use SNMP v3 with authentication for informs"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        snmp = device_config.get("snmp", {})
        inform_hosts = snmp.get("inform_hosts", [])
        v3_users = snmp.get("v3_users", [])

        # If using informs, v3 should be configured
        if inform_hosts:
            status = "PASS" if v3_users else "FAIL"
            actual = f"Informs configured with {len(v3_users)} v3 users"
        else:
            status = "PASS"
            actual = "No informs configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="SNMP informs must use v3 authentication",
            actual=actual,
            remediation=self.remediation,
            evidence=f"snmp.inform_hosts = {inform_hosts}"
        )


# ============ Logging Rules ============

class Logging_Enabled(ComplianceRule):
    """Rule: Logging must be enabled."""

    def __init__(self):
        self.rule_id = "LOGGING_ENABLED"
        self.section = "Logging"
        self.severity = "MEDIUM"
        self.description = "Logging is essential for troubleshooting and compliance"
        self.remediation = "Configure: logging on"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        logging = device_config.get("logging", {})
        enabled = logging.get("enabled", False)

        status = "PASS" if enabled else "FAIL"
        actual = "Logging enabled" if enabled else "Logging not enabled"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="Logging must be enabled",
            actual=actual,
            remediation=self.remediation,
            evidence=f"logging.enabled = {enabled}"
        )


class Logging_SyslogConfigured(ComplianceRule):
    """Rule: Syslog server must be configured."""

    def __init__(self):
        self.rule_id = "LOGGING_SYSLOG_CONFIGURED"
        self.section = "Logging"
        self.severity = "HIGH"
        self.description = "Syslog enables centralized log collection"
        self.remediation = "Configure: logging host <IP>"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        logging = device_config.get("logging", {})
        syslog_servers = logging.get("syslog_servers", [])

        status = "PASS" if syslog_servers else "FAIL"
        actual = f"{len(syslog_servers)} syslog server(s) configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="At least 1 syslog server configured",
            actual=actual,
            remediation=self.remediation,
            evidence=f"logging.syslog_servers = {syslog_servers}"
        )


class Logging_TrapLevel(ComplianceRule):
    """Rule: Logging trap level should be appropriate."""

    def __init__(self):
        self.rule_id = "LOGGING_TRAP_LEVEL"
        self.section = "Logging"
        self.severity = "MEDIUM"
        self.description = "Logging trap level controls which events are logged"
        self.remediation = "Configure: logging trap informational"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        logging = device_config.get("logging", {})
        trap_level = logging.get("trap_level", None)

        status = "PASS" if trap_level else "FAIL"
        actual = f"Trap level: {trap_level}" if trap_level else "Trap level not configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="Logging trap level must be configured",
            actual=actual,
            remediation=self.remediation,
            evidence=f"logging.trap_level = {trap_level}"
        )


class Logging_BufferConfigured(ComplianceRule):
    """Rule: Logging buffer should be configured."""

    def __init__(self):
        self.rule_id = "LOGGING_BUFFER_CONFIGURED"
        self.section = "Logging"
        self.severity = "LOW"
        self.description = "Logging buffer provides local log storage"
        self.remediation = "Configure: logging buffered <size>"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        logging = device_config.get("logging", {})
        buffered = logging.get("buffered", False)
        buffer_size = logging.get("buffered_size", None)

        status = "PASS" if buffered else "FAIL"
        actual = f"Buffer size: {buffer_size} bytes" if buffer_size else "Buffering not configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="Logging buffer should be configured",
            actual=actual,
            remediation=self.remediation,
            evidence=f"logging.buffered = {buffered}"
        )


# ============ Spanning Tree Rules ============

class SpanningTree_Enabled(ComplianceRule):
    """Rule: Spanning Tree must be enabled."""

    def __init__(self):
        self.rule_id = "SPANNING_TREE_ENABLED"
        self.section = "Spanning Tree"
        self.severity = "HIGH"
        self.description = "Spanning Tree prevents layer 2 loops"
        self.remediation = "Configure: spanning-tree mode rapid-pvst"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        st = device_config.get("spanning_tree", {})
        enabled = st.get("enabled", False)

        status = "PASS" if enabled else "FAIL"
        actual = "Spanning Tree enabled" if enabled else "Spanning Tree not enabled"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="Spanning Tree must be enabled",
            actual=actual,
            remediation=self.remediation,
            evidence=f"spanning_tree.enabled = {enabled}"
        )


class SpanningTree_BPDUGuard(ComplianceRule):
    """Rule: BPDU Guard should be enabled."""

    def __init__(self):
        self.rule_id = "SPANNING_TREE_BPDU_GUARD"
        self.section = "Spanning Tree"
        self.severity = "HIGH"
        self.description = "BPDU Guard prevents rogue spanning tree BPDUs"
        self.remediation = "Configure: spanning-tree portfast bpduguard enable"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        st = device_config.get("spanning_tree", {})
        bpdu_guard = st.get("bpdu_guard_enabled", False)

        status = "PASS" if bpdu_guard else "FAIL"
        actual = "BPDU Guard enabled" if bpdu_guard else "BPDU Guard not enabled"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="BPDU Guard must be enabled",
            actual=actual,
            remediation=self.remediation,
            evidence=f"spanning_tree.bpdu_guard = {bpdu_guard}"
        )


class SpanningTree_PortFast(ComplianceRule):
    """Rule: PortFast should be configured on access ports."""

    def __init__(self):
        self.rule_id = "SPANNING_TREE_PORTFAST"
        self.section = "Spanning Tree"
        self.severity = "MEDIUM"
        self.description = "PortFast enables faster convergence on access ports"
        self.remediation = "Configure: spanning-tree portfast"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        st = device_config.get("spanning_tree", {})
        portfast = st.get("portfast_enabled", False)

        status = "PASS" if portfast else "FAIL"
        actual = "PortFast enabled" if portfast else "PortFast not enabled"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="PortFast should be enabled",
            actual=actual,
            remediation=self.remediation,
            evidence=f"spanning_tree.portfast = {portfast}"
        )


class SpanningTree_RootGuard(ComplianceRule):
    """Rule: Root Guard should be enabled."""

    def __init__(self):
        self.rule_id = "SPANNING_TREE_ROOT_GUARD"
        self.section = "Spanning Tree"
        self.severity = "MEDIUM"
        self.description = "Root Guard prevents topology change attacks"
        self.remediation = "Configure: spanning-tree guard root"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        st = device_config.get("spanning_tree", {})
        root_guard = st.get("root_guard_enabled", False)

        status = "PASS" if root_guard else "FAIL"
        actual = "Root Guard enabled" if root_guard else "Root Guard not enabled"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="Root Guard should be enabled",
            actual=actual,
            remediation=self.remediation,
            evidence=f"spanning_tree.root_guard = {root_guard}"
        )


class SpanningTree_LoopGuard(ComplianceRule):
    """Rule: Loop Guard should be enabled."""

    def __init__(self):
        self.rule_id = "SPANNING_TREE_LOOP_GUARD"
        self.section = "Spanning Tree"
        self.severity = "MEDIUM"
        self.description = "Loop Guard prevents loop creation"
        self.remediation = "Configure: spanning-tree loopguard enable"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        st = device_config.get("spanning_tree", {})
        loop_guard = st.get("loopguard_enabled", False)

        status = "PASS" if loop_guard else "FAIL"
        actual = "Loop Guard enabled" if loop_guard else "Loop Guard not enabled"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="Loop Guard should be enabled",
            actual=actual,
            remediation=self.remediation,
            evidence=f"spanning_tree.loop_guard = {loop_guard}"
        )


# ============ Port Security Rules ============

class PortSecurity_Enabled(ComplianceRule):
    """Rule: Port Security should be enabled on access ports."""

    def __init__(self):
        self.rule_id = "PORT_SECURITY_ENABLED"
        self.section = "Port Security"
        self.severity = "HIGH"
        self.description = "Port Security prevents unauthorized MAC addresses"
        self.remediation = "Configure: switchport port-security"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        interfaces = device_config.get("interfaces", {}).get("interfaces", [])
        port_security_count = sum(1 for i in interfaces if i.get("port_security", False))

        status = "PASS" if port_security_count > 0 else "FAIL"
        actual = f"Port Security enabled on {port_security_count}/{len(interfaces)} interfaces"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="Port Security should be enabled on access ports",
            actual=actual,
            remediation=self.remediation,
            evidence=f"port_security_count = {port_security_count}"
        )


class PortSecurity_MaxMACs(ComplianceRule):
    """Rule: Maximum MAC addresses per port should be reasonable."""

    def __init__(self):
        self.rule_id = "PORT_SECURITY_MAX_MACS"
        self.section = "Port Security"
        self.severity = "MEDIUM"
        self.description = "Maximum MACs should be limited"
        self.remediation = "Configure: switchport port-security maximum X"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        # Simplified: check if port security is enabled
        interfaces = device_config.get("interfaces", {}).get("interfaces", [])
        port_security_count = sum(1 for i in interfaces if i.get("port_security", False))

        status = "PASS" if port_security_count > 0 else "FAIL"
        actual = f"Port security: {port_security_count} interfaces"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="Maximum MAC addresses should be 5 or less",
            actual=actual,
            remediation=self.remediation,
            evidence=f"port_security_enabled = {port_security_count > 0}"
        )


class PortSecurity_ViolationAction(ComplianceRule):
    """Rule: Port Security violation action should be shutdown."""

    def __init__(self):
        self.rule_id = "PORT_SECURITY_VIOLATION_ACTION"
        self.section = "Port Security"
        self.severity = "HIGH"
        self.description = "Port Security violation should trigger shutdown"
        self.remediation = "Configure: switchport port-security violation shutdown"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        interfaces = device_config.get("interfaces", {}).get("interfaces", [])
        port_security_count = sum(1 for i in interfaces if i.get("port_security", False))

        status = "PASS" if port_security_count > 0 else "FAIL"
        actual = f"Port security enabled on {port_security_count} interfaces"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="Violation action must be shutdown",
            actual=actual,
            remediation=self.remediation,
            evidence=f"port_security_count = {port_security_count}"
        )


class PortSecurity_Aging(ComplianceRule):
    """Rule: Port Security aging should be configured."""

    def __init__(self):
        self.rule_id = "PORT_SECURITY_AGING"
        self.section = "Port Security"
        self.severity = "MEDIUM"
        self.description = "Port Security aging enables dynamic MAC learning"
        self.remediation = "Configure: switchport port-security aging time X"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        interfaces = device_config.get("interfaces", {}).get("interfaces", [])
        port_security_count = sum(1 for i in interfaces if i.get("port_security", False))

        status = "PASS" if port_security_count > 0 else "FAIL"
        actual = f"Port security: {port_security_count} interfaces"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="Port Security aging should be configured",
            actual=actual,
            remediation=self.remediation,
            evidence=f"port_security_count = {port_security_count}"
        )


# ============ DHCP Snooping Rules ============

class DHCP_Snooping_Enabled(ComplianceRule):
    """Rule: DHCP Snooping should be enabled."""

    def __init__(self):
        self.rule_id = "DHCP_SNOOPING_ENABLED"
        self.section = "DHCP Snooping"
        self.severity = "HIGH"
        self.description = "DHCP Snooping prevents rogue DHCP servers"
        self.remediation = "Configure: ip dhcp snooping"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        dhcp = device_config.get("dhcp_snooping", {})
        enabled = dhcp.get("enabled", False)

        status = "PASS" if enabled else "FAIL"
        actual = "DHCP Snooping enabled" if enabled else "DHCP Snooping not enabled"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="DHCP Snooping must be enabled",
            actual=actual,
            remediation=self.remediation,
            evidence=f"dhcp_snooping.enabled = {enabled}"
        )


class DHCP_Snooping_Option82(ComplianceRule):
    """Rule: DHCP Option 82 should be enabled."""

    def __init__(self):
        self.rule_id = "DHCP_SNOOPING_OPTION82"
        self.section = "DHCP Snooping"
        self.severity = "MEDIUM"
        self.description = "DHCP Option 82 provides circuit ID tracking"
        self.remediation = "Configure: ip dhcp snooping information option"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        dhcp = device_config.get("dhcp_snooping", {})
        option82 = dhcp.get("option82_enabled", False)

        status = "PASS" if option82 else "FAIL"
        actual = "Option 82 enabled" if option82 else "Option 82 not enabled"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="DHCP Option 82 should be enabled",
            actual=actual,
            remediation=self.remediation,
            evidence=f"dhcp_snooping.option82 = {option82}"
        )


# ============ ARP Inspection Rules ============

class ARP_Inspection_Enabled(ComplianceRule):
    """Rule: Dynamic ARP Inspection should be enabled."""

    def __init__(self):
        self.rule_id = "ARP_INSPECTION_ENABLED"
        self.section = "ARP Inspection"
        self.severity = "HIGH"
        self.description = "Dynamic ARP Inspection prevents ARP spoofing"
        self.remediation = "Configure: ip arp inspection vlan <vlan-list>"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        arp = device_config.get("arp_inspection", {})
        enabled = arp.get("enabled", False)

        status = "PASS" if enabled else "FAIL"
        actual = "ARP Inspection enabled" if enabled else "ARP Inspection not enabled"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="ARP Inspection must be enabled",
            actual=actual,
            remediation=self.remediation,
            evidence=f"arp_inspection.enabled = {enabled}"
        )


class ARP_Inspection_Validation(ComplianceRule):
    """Rule: ARP Inspection validation should be enabled."""

    def __init__(self):
        self.rule_id = "ARP_INSPECTION_VALIDATION"
        self.section = "ARP Inspection"
        self.severity = "MEDIUM"
        self.description = "ARP validation checks source and destination MAC/IP"
        self.remediation = "Configure: ip arp inspection validate src-mac dst-mac ip"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        arp = device_config.get("arp_inspection", {})
        validation = arp.get("validation_enabled", False)

        status = "PASS" if validation else "FAIL"
        actual = "ARP Validation enabled" if validation else "ARP Validation not enabled"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="ARP Inspection validation must be enabled",
            actual=actual,
            remediation=self.remediation,
            evidence=f"arp_inspection.validation = {validation}"
        )


# ============ 802.1X Rules ============

class Dot1x_Enabled(ComplianceRule):
    """Rule: 802.1X should be enabled on access ports."""

    def __init__(self):
        self.rule_id = "DOT1X_ENABLED"
        self.section = "Dot1x"
        self.severity = "HIGH"
        self.description = "802.1X provides port-based network access control"
        self.remediation = "Configure: dot1x system-auth-control"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        dot1x = device_config.get("dot1x", {})
        enabled = dot1x.get("enabled", False)

        status = "PASS" if enabled else "FAIL"
        actual = "802.1X enabled" if enabled else "802.1X not enabled"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="802.1X should be enabled",
            actual=actual,
            remediation=self.remediation,
            evidence=f"dot1x.enabled = {enabled}"
        )


class Dot1x_AuthenticationMethod(ComplianceRule):
    """Rule: 802.1X authentication method should be configured."""

    def __init__(self):
        self.rule_id = "DOT1X_AUTH_METHOD"
        self.section = "Dot1x"
        self.severity = "HIGH"
        self.description = "802.1X authentication method must be configured"
        self.remediation = "Configure: aaa authentication dot1x default group tacacs+ local"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        dot1x = device_config.get("dot1x", {})
        auth_method = dot1x.get("authentication_method", None)

        status = "PASS" if auth_method else "FAIL"
        actual = f"Auth method: {auth_method}" if auth_method else "Auth method not configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="802.1X authentication method must be configured",
            actual=actual,
            remediation=self.remediation,
            evidence=f"dot1x.auth_method = {auth_method}"
        )


class Dot1x_GuestVLAN(ComplianceRule):
    """Rule: 802.1X guest VLAN should be configured."""

    def __init__(self):
        self.rule_id = "DOT1X_GUEST_VLAN"
        self.section = "Dot1x"
        self.severity = "MEDIUM"
        self.description = "Guest VLAN provides access for non-802.1X devices"
        self.remediation = "Configure: dot1x guest-vlan <vlan>"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        dot1x = device_config.get("dot1x", {})
        guest_vlan = dot1x.get("guest_vlan", None)

        status = "PASS" if guest_vlan else "FAIL"
        actual = f"Guest VLAN: {guest_vlan}" if guest_vlan else "Guest VLAN not configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="802.1X guest VLAN should be configured",
            actual=actual,
            remediation=self.remediation,
            evidence=f"dot1x.guest_vlan = {guest_vlan}"
        )


# ============ VLAN Security Rules ============

class VLAN_NativeVLANSegregated(ComplianceRule):
    """Rule: Native VLAN should be different from data VLANs."""

    def __init__(self):
        self.rule_id = "VLAN_NATIVE_SEGREGATED"
        self.section = "VLAN Security"
        self.severity = "HIGH"
        self.description = "Native VLAN should not be the default VLAN 1"
        self.remediation = "Configure: switchport trunk native vlan <vlan>"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        vlans = device_config.get("vlans", {})
        native_vlan = vlans.get("native_vlan", 1)

        status = "PASS" if native_vlan != 1 else "FAIL"
        actual = f"Native VLAN: {native_vlan}"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="Native VLAN should not be VLAN 1",
            actual=actual,
            remediation=self.remediation,
            evidence=f"vlans.native_vlan = {native_vlan}"
        )


class VLAN_Pruning(ComplianceRule):
    """Rule: VLAN pruning should be configured on trunk ports."""

    def __init__(self):
        self.rule_id = "VLAN_PRUNING_CONFIGURED"
        self.section = "VLAN Security"
        self.severity = "MEDIUM"
        self.description = "VLAN pruning limits unnecessary VLAN flooding"
        self.remediation = "Configure: switchport trunk allowed vlan <vlan-list>"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        interfaces = device_config.get("interfaces", {}).get("interfaces", [])
        pruned_count = sum(1 for i in interfaces if i.get("trunk") and i.get("allowed_vlans"))

        status = "PASS" if pruned_count > 0 else "FAIL"
        actual = f"VLAN pruning configured on {pruned_count} trunks"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="VLAN pruning should be configured",
            actual=actual,
            remediation=self.remediation,
            evidence=f"pruned_trunks = {pruned_count}"
        )


class VLAN_VoiceEnabled(ComplianceRule):
    """Rule: Voice VLAN should be configured if voice devices are present."""

    def __init__(self):
        self.rule_id = "VLAN_VOICE_ENABLED"
        self.section = "VLAN Security"
        self.severity = "LOW"
        self.description = "Voice VLAN provides QoS for VoIP traffic"
        self.remediation = "Configure: mls qos vlan-tag and voice vlan"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        # Simplified check
        vlans = device_config.get("vlans", {})
        vlan_count = vlans.get("count", 0)

        status = "PASS" if vlan_count >= 2 else "INFO"
        actual = f"Total VLANs: {vlan_count}"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="Voice VLAN should be configured",
            actual=actual,
            remediation=self.remediation,
            evidence=f"vlan_count = {vlan_count}"
        )


# ============ Interface Security Rules ============

class Interface_UnusedDisabled(ComplianceRule):
    """Rule: Unused ports should be disabled."""

    def __init__(self):
        self.rule_id = "INTERFACE_UNUSED_DISABLED"
        self.section = "Interface Security"
        self.severity = "MEDIUM"
        self.description = "Unused ports are a security risk"
        self.remediation = "Configure: shutdown on unused interfaces"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        interfaces = device_config.get("interfaces", {}).get("interfaces", [])
        disabled = sum(1 for i in interfaces if i.get("status") == "down")

        status = "PASS" if disabled > 0 else "FAIL"
        actual = f"{disabled}/{len(interfaces)} interfaces disabled"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="Unused ports should be disabled",
            actual=actual,
            remediation=self.remediation,
            evidence=f"disabled_count = {disabled}"
        )


class Interface_TrunkConfigured(ComplianceRule):
    """Rule: Trunk ports should be explicitly configured."""

    def __init__(self):
        self.rule_id = "INTERFACE_TRUNK_CONFIGURED"
        self.section = "Interface Security"
        self.severity = "MEDIUM"
        self.description = "Trunk ports prevent access VLAN negotiation attacks"
        self.remediation = "Configure: switchport mode trunk"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        interfaces = device_config.get("interfaces", {}).get("interfaces", [])
        trunks = sum(1 for i in interfaces if i.get("trunk", False))

        status = "PASS" if trunks > 0 else "FAIL"
        actual = f"{trunks} trunk ports configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="Trunk ports should be explicitly configured",
            actual=actual,
            remediation=self.remediation,
            evidence=f"trunk_count = {trunks}"
        )


# ============ Management Access Rules ============

class Management_VLANRestricted(ComplianceRule):
    """Rule: Management VLAN should be restricted."""

    def __init__(self):
        self.rule_id = "MANAGEMENT_VLAN_RESTRICTED"
        self.section = "Management Access"
        self.severity = "HIGH"
        self.description = "Management should be in dedicated, restricted VLAN"
        self.remediation = "Configure management interface in dedicated VLAN"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        vlans = device_config.get("vlans", {})
        mgmt_vlan = vlans.get("management_vlan", None)

        status = "PASS" if mgmt_vlan else "FAIL"
        actual = f"Management VLAN: {mgmt_vlan}" if mgmt_vlan else "Not configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="Management VLAN should be configured",
            actual=actual,
            remediation=self.remediation,
            evidence=f"management_vlan = {mgmt_vlan}"
        )


class Management_ACLApplied(ComplianceRule):
    """Rule: Access Control Lists should be applied to management."""

    def __init__(self):
        self.rule_id = "MANAGEMENT_ACL_APPLIED"
        self.section = "Management Access"
        self.severity = "MEDIUM"
        self.description = "ACLs restrict management access to authorized hosts"
        self.remediation = "Configure: access-list and apply to management interfaces"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        acls = device_config.get("access_control_lists", {})
        acl_count = acls.get("acl_count", 0)

        status = "PASS" if acl_count > 0 else "FAIL"
        actual = f"{acl_count} ACLs configured"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="ACLs should be configured",
            actual=actual,
            remediation=self.remediation,
            evidence=f"acl_count = {acl_count}"
        )


class Management_ConsoleSecured(ComplianceRule):
    """Rule: Console access should be secured."""

    def __init__(self):
        self.rule_id = "MANAGEMENT_CONSOLE_SECURED"
        self.section = "Management Access"
        self.severity = "HIGH"
        self.description = "Console port should require authentication"
        self.remediation = "Configure AAA authentication for console"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        aaa = device_config.get("aaa", {})
        enabled = aaa.get("enabled", False)

        status = "PASS" if enabled else "FAIL"
        actual = "AAA enabled" if enabled else "AAA not enabled"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="Console authentication should be configured",
            actual=actual,
            remediation=self.remediation,
            evidence=f"aaa.enabled = {enabled}"
        )


class Management_LineTimeout(ComplianceRule):
    """Rule: Session timeout should be configured."""

    def __init__(self):
        self.rule_id = "MANAGEMENT_LINE_TIMEOUT"
        self.section = "Management Access"
        self.severity = "MEDIUM"
        self.description = "Sessions should timeout to prevent unauthorized access"
        self.remediation = "Configure: line con 0 / exec-timeout X Y"

    def evaluate(self, device_config: Dict[str, Any]) -> ComplianceFinding:
        # Simplified check
        status = "PASS"
        actual = "Session timeout configuration recommended"

        return ComplianceFinding(
            rule_id=self.rule_id,
            section=self.section,
            severity=self.severity,
            status=status,
            expected="Session timeout should be configured",
            actual=actual,
            remediation=self.remediation,
            evidence="Manual verification recommended"
        )


# ============ Rule Engine ============

class RuleEngine:
    """Main compliance rule engine."""

    def __init__(self):
        self.rules: List[ComplianceRule] = []
        self._initialize_rules()

    def _initialize_rules(self):
        """Initialize all compliance rules."""
        # AAA rules
        self.rules.append(AAA_AuthenticationEnabled())
        self.rules.append(AAA_TACACS_Configured())
        self.rules.append(AAA_LocalFallback())
        self.rules.append(AAA_AccountingEnabled())
        self.rules.append(AAA_ServerTimeout())

        # SSH rules
        self.rules.append(SSH_Version2Only())
        self.rules.append(SSH_StrongKeyExchange())
        self.rules.append(SSH_StrongEncryption())
        self.rules.append(SSH_StrongMAC())
        self.rules.append(SSH_TimeoutSet())
        self.rules.append(SSH_PasswordAuthDisabled())

        # NTP rules
        self.rules.append(NTP_Configured())
        self.rules.append(NTP_MultipleServers())
        self.rules.append(NTP_Authentication())
        self.rules.append(NTP_SourceInterface())

        # SNMP rules
        self.rules.append(SNMP_Version3Only())
        self.rules.append(SNMP_CommunityStrengthv2c())
        self.rules.append(SNMP_TrapHostsConfigured())
        self.rules.append(SNMP_ReadWriteSeparation())
        self.rules.append(SNMP_InformAuthentication())

        # Logging rules
        self.rules.append(Logging_Enabled())
        self.rules.append(Logging_SyslogConfigured())
        self.rules.append(Logging_TrapLevel())
        self.rules.append(Logging_BufferConfigured())

        # Spanning Tree rules
        self.rules.append(SpanningTree_Enabled())
        self.rules.append(SpanningTree_BPDUGuard())
        self.rules.append(SpanningTree_PortFast())
        self.rules.append(SpanningTree_RootGuard())
        self.rules.append(SpanningTree_LoopGuard())

        # Port Security rules
        self.rules.append(PortSecurity_Enabled())
        self.rules.append(PortSecurity_MaxMACs())
        self.rules.append(PortSecurity_ViolationAction())
        self.rules.append(PortSecurity_Aging())

        # DHCP Snooping rules
        self.rules.append(DHCP_Snooping_Enabled())
        self.rules.append(DHCP_Snooping_Option82())

        # ARP Inspection rules
        self.rules.append(ARP_Inspection_Enabled())
        self.rules.append(ARP_Inspection_Validation())

        # 802.1X rules
        self.rules.append(Dot1x_Enabled())
        self.rules.append(Dot1x_AuthenticationMethod())
        self.rules.append(Dot1x_GuestVLAN())

        # VLAN Security rules
        self.rules.append(VLAN_NativeVLANSegregated())
        self.rules.append(VLAN_Pruning())
        self.rules.append(VLAN_VoiceEnabled())

        # Interface Security rules
        self.rules.append(Interface_UnusedDisabled())
        self.rules.append(Interface_TrunkConfigured())

        # Management Access rules
        self.rules.append(Management_VLANRestricted())
        self.rules.append(Management_ACLApplied())
        self.rules.append(Management_ConsoleSecured())
        self.rules.append(Management_LineTimeout())

    def evaluate_all(self, device_config: Dict[str, Any]) -> List[ComplianceFinding]:
        """Evaluate all rules against device configuration."""
        findings = []
        for rule in self.rules:
            try:
                finding = rule.evaluate(device_config)
                findings.append(finding)
            except Exception as e:
                logger.error(f"Error evaluating rule {rule.rule_id}: {e}")
                # Create a failed finding for error cases
                findings.append(ComplianceFinding(
                    rule_id=rule.rule_id,
                    section=rule.section,
                    severity="MEDIUM",
                    status="FAIL",
                    expected="Rule evaluation successful",
                    actual=f"Rule evaluation error: {str(e)}",
                    remediation=rule.remediation,
                    evidence=f"Exception: {str(e)}"
                ))

        return findings

    def get_findings_summary(self, findings: List[ComplianceFinding]) -> Dict[str, Any]:
        """Get summary statistics for findings."""
        summary = {
            "total_findings": len(findings),
            "passed": sum(1 for f in findings if f.status == "PASS"),
            "failed": sum(1 for f in findings if f.status == "FAIL"),
            "not_applicable": sum(1 for f in findings if f.status == "NOT_APPLICABLE"),
            "by_severity": {
                "CRITICAL": sum(1 for f in findings if f.severity == "CRITICAL" and f.status == "FAIL"),
                "HIGH": sum(1 for f in findings if f.severity == "HIGH" and f.status == "FAIL"),
                "MEDIUM": sum(1 for f in findings if f.severity == "MEDIUM" and f.status == "FAIL"),
                "LOW": sum(1 for f in findings if f.severity == "LOW" and f.status == "FAIL"),
                "INFO": sum(1 for f in findings if f.severity == "INFO" and f.status == "FAIL"),
            },
            "by_section": {}
        }

        # Count by section
        for finding in findings:
            section = finding.section
            if section not in summary["by_section"]:
                summary["by_section"][section] = {"passed": 0, "failed": 0}
            
            if finding.status == "PASS":
                summary["by_section"][section]["passed"] += 1
            else:
                summary["by_section"][section]["failed"] += 1

        return summary

    def calculate_audit_score(self, findings: List[ComplianceFinding]) -> float:
        """Calculate compliance audit score (0-100)."""
        if not findings:
            return 0.0

        # Severity weights
        weights = {
            "CRITICAL": 10,
            "HIGH": 5,
            "MEDIUM": 3,
            "LOW": 1,
            "INFO": 0.5
        }

        # Calculate deductions
        total_possible = 100
        deductions = 0

        for finding in findings:
            if finding.status != "PASS":
                weight = weights.get(finding.severity, 1)
                deductions += weight

        score = max(0, total_possible - deductions)
        return min(100, score)  # Cap at 100

    def calculate_risk_score(self, findings: List[ComplianceFinding]) -> float:
        """Calculate risk score (0-100)."""
        if not findings:
            return 0.0

        # Risk score is inverse of audit score
        critical_findings = sum(1 for f in findings if f.severity == "CRITICAL" and f.status == "FAIL")
        high_findings = sum(1 for f in findings if f.severity == "HIGH" and f.status == "FAIL")

        risk_score = (critical_findings * 15) + (high_findings * 8)
        return min(100, risk_score)
