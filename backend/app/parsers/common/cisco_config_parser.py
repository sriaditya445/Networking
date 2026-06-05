"""
Structured Cisco Configuration Parser

Converts raw Cisco IOS configurations into normalized JSON structure.
Supports all major configuration sections relevant for compliance audit.
"""

import re
from typing import Dict, List, Any, Optional, Set
from app.core.logger import logger


class CiscoConfigParser:
    """Parse Cisco IOS configurations into structured JSON."""

    def __init__(self, config_text: str):
        self.config_text = config_text
        self.lines = [line.strip() for line in config_text.split('\n') if line.strip()]
        self.config_dict: Dict[str, Any] = {}

    def parse(self) -> Dict[str, Any]:
        """Parse complete Cisco configuration into structured JSON."""
        try:
            self.config_dict = {
                "hostname": self._parse_hostname(),
                "aaa": self._parse_aaa(),
                "ssh": self._parse_ssh(),
                "ntp": self._parse_ntp(),
                "snmp": self._parse_snmp(),
                "logging": self._parse_logging(),
                "spanning_tree": self._parse_spanning_tree(),
                "vlans": self._parse_vlans(),
                "interfaces": self._parse_interfaces(),
                "port_channels": self._parse_port_channels(),
                "dot1x": self._parse_dot1x(),
                "dhcp_snooping": self._parse_dhcp_snooping(),
                "arp_inspection": self._parse_arp_inspection(),
                "access_control_lists": self._parse_access_lists(),
                "route_maps": self._parse_route_maps(),
                "prefix_lists": self._parse_prefix_lists(),
            }
            return self.config_dict
        except Exception as e:
            logger.error(f"Error parsing Cisco configuration: {e}")
            raise

    # ============ Hostname Parsing ============
    def _parse_hostname(self) -> Optional[str]:
        """Extract hostname from configuration."""
        for line in self.lines:
            match = re.match(r'^hostname\s+([a-zA-Z0-9-_.]+)$', line, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    # ============ AAA (Authentication, Authorization, Accounting) Parsing ============
    def _parse_aaa(self) -> Dict[str, Any]:
        """Parse AAA configuration."""
        aaa = {
            "enabled": False,
            "new_model": False,
            "authentication": {
                "login_default": [],
                "enable_default": [],
                "methods": {}
            },
            "authorization": {
                "default": [],
                "methods": {}
            },
            "accounting": {
                "enabled": False,
                "methods": {}
            },
            "tacacs_servers": [],
            "radius_servers": [],
            "local_user_count": 0
        }

        in_aaa = False
        for i, line in enumerate(self.lines):
            if re.match(r'^aaa\s+new-model\s*$', line, re.IGNORECASE):
                aaa["enabled"] = True
                aaa["new_model"] = True

            # TACACS+ servers
            if re.match(r'^tacacs-server\s+host\s+(.+)$', line, re.IGNORECASE):
                match = re.match(r'^tacacs-server\s+host\s+([0-9.]+)', line, re.IGNORECASE)
                if match:
                    aaa["tacacs_servers"].append(match.group(1))

            # RADIUS servers
            if re.match(r'^radius-server\s+host\s+(.+)$', line, re.IGNORECASE):
                match = re.match(r'^radius-server\s+host\s+([0-9.]+)', line, re.IGNORECASE)
                if match:
                    aaa["radius_servers"].append(match.group(1))

            # Authentication methods
            if re.match(r'^aaa\s+authentication\s+login\s+default\s+(.+)$', line, re.IGNORECASE):
                match = re.match(r'^aaa\s+authentication\s+login\s+default\s+(.+)$', line, re.IGNORECASE)
                if match:
                    methods = match.group(1).split()
                    aaa["authentication"]["login_default"] = methods

            # Local users
            if re.match(r'^username\s+\S+\s+', line, re.IGNORECASE):
                aaa["local_user_count"] += 1

        return aaa

    # ============ SSH Parsing ============
    def _parse_ssh(self) -> Dict[str, Any]:
        """Parse SSH configuration."""
        ssh = {
            "enabled": False,
            "version": None,
            "keyx": [],
            "encryption": [],
            "mac_algorithms": [],
            "timeout": None,
            "authentication_retries": None,
            "password_authentication_enabled": True
        }

        for line in self.lines:
            # SSH version
            match = re.match(r'^ip\s+ssh\s+version\s+(\d)$', line, re.IGNORECASE)
            if match:
                ssh["version"] = int(match.group(1))
                ssh["enabled"] = True

            # Key exchange algorithms
            match = re.match(r'^ip\s+ssh\s+key-exchange-algorithms\s+(.+)$', line, re.IGNORECASE)
            if match:
                ssh["keyx"] = match.group(1).split(',')

            # Encryption algorithms
            match = re.match(r'^ip\s+ssh\s+encryption\s+(.+)$', line, re.IGNORECASE)
            if match:
                ssh["encryption"] = match.group(1).split(',')

            # MAC algorithms
            match = re.match(r'^ip\s+ssh\s+mac\s+(.+)$', line, re.IGNORECASE)
            if match:
                ssh["mac_algorithms"] = match.group(1).split(',')

            # SSH timeout
            match = re.match(r'^ip\s+ssh\s+time-out\s+(\d+)$', line, re.IGNORECASE)
            if match:
                ssh["timeout"] = int(match.group(1))

            # SSH authentication retries
            match = re.match(r'^ip\s+ssh\s+authentication-retries\s+(\d+)$', line, re.IGNORECASE)
            if match:
                ssh["authentication_retries"] = int(match.group(1))

        return ssh

    # ============ NTP Parsing ============
    def _parse_ntp(self) -> Dict[str, Any]:
        """Parse NTP configuration."""
        ntp = {
            "enabled": False,
            "servers": [],
            "source_interface": None,
            "authentication_enabled": False,
            "trusted_keys": [],
            "authenticate_enabled": False
        }

        for line in self.lines:
            # NTP servers
            match = re.match(r'^ntp\s+server\s+([0-9.a-zA-Z-]+)(?:\s+(.+))?', line, re.IGNORECASE)
            if match:
                server = match.group(1)
                ntp["servers"].append(server)
                ntp["enabled"] = True

            # NTP source interface
            match = re.match(r'^ntp\s+source\s+(\S+)$', line, re.IGNORECASE)
            if match:
                ntp["source_interface"] = match.group(1)

            # NTP authentication
            if re.search(r'^ntp\s+authenticate', line, re.IGNORECASE):
                ntp["authenticate_enabled"] = True
                ntp["authentication_enabled"] = True

            # NTP trusted keys
            match = re.match(r'^ntp\s+trusted-key\s+(\d+)(?:\s+(.+))?', line, re.IGNORECASE)
            if match:
                ntp["trusted_keys"].append(int(match.group(1)))

        return ntp

    # ============ SNMP Parsing ============
    def _parse_snmp(self) -> Dict[str, Any]:
        """Parse SNMP configuration."""
        snmp = {
            "enabled": False,
            "version": None,
            "community_strings": {
                "read_only": [],
                "read_write": []
            },
            "v3_users": [],
            "trap_hosts": [],
            "inform_hosts": [],
            "engine_id": None,
            "source_interface": None
        }

        for line in self.lines:
            # SNMP community (v2c)
            if re.match(r'^snmp-server\s+community\s+(.+)$', line, re.IGNORECASE):
                match = re.match(r'^snmp-server\s+community\s+(\S+)(?:\s+RO)?(?:\s+(.+))?', line, re.IGNORECASE)
                if match:
                    community = match.group(1)
                    if 'RO' in line.upper():
                        snmp["community_strings"]["read_only"].append(community)
                    elif 'RW' in line.upper():
                        snmp["community_strings"]["read_write"].append(community)
                    else:
                        snmp["community_strings"]["read_only"].append(community)
                    snmp["enabled"] = True

            # SNMP v3 users
            match = re.match(r'^snmp-server\s+user\s+(\S+)\s+(.+)$', line, re.IGNORECASE)
            if match:
                user = match.group(1)
                snmp["v3_users"].append(user)
                snmp["version"] = 3

            # SNMP trap hosts
            match = re.match(r'^snmp-server\s+host\s+([0-9.]+|[a-zA-Z0-9-_.]+)\s+traps\s+(.+)', line, re.IGNORECASE)
            if match:
                snmp["trap_hosts"].append(match.group(1))

            # SNMP inform hosts
            match = re.match(r'^snmp-server\s+host\s+([0-9.]+|[a-zA-Z0-9-_.]+)\s+inform\s+(.+)', line, re.IGNORECASE)
            if match:
                snmp["inform_hosts"].append(match.group(1))

        return snmp

    # ============ Logging Parsing ============
    def _parse_logging(self) -> Dict[str, Any]:
        """Parse logging configuration."""
        logging = {
            "enabled": False,
            "console_level": None,
            "buffer_level": None,
            "syslog_servers": [],
            "buffered": False,
            "buffered_size": None,
            "trap_level": None,
            "source_interface": None
        }

        for line in self.lines:
            # Logging enabled
            if re.match(r'^logging\s+on$', line, re.IGNORECASE):
                logging["enabled"] = True

            # Syslog servers
            match = re.match(r'^logging\s+host\s+([0-9.a-zA-Z-_.]+)(?:\s+(.+))?', line, re.IGNORECASE)
            if match:
                logging["syslog_servers"].append(match.group(1))
                logging["enabled"] = True

            # Logging buffered
            match = re.match(r'^logging\s+buffered\s+(\d+)?\s*(\S+)?', line, re.IGNORECASE)
            if match:
                logging["buffered"] = True
                if match.group(1):
                    logging["buffered_size"] = int(match.group(1))
                if match.group(2):
                    logging["buffer_level"] = match.group(2)

            # Logging console level
            match = re.match(r'^logging\s+console\s+(\S+)$', line, re.IGNORECASE)
            if match:
                logging["console_level"] = match.group(1)

            # Logging trap level
            match = re.match(r'^logging\s+trap\s+(\S+)$', line, re.IGNORECASE)
            if match:
                logging["trap_level"] = match.group(1)

        return logging

    # ============ Spanning Tree Parsing ============
    def _parse_spanning_tree(self) -> Dict[str, Any]:
        """Parse spanning tree configuration."""
        st = {
            "enabled": False,
            "mode": None,
            "protocol_version": None,
            "root_guard_enabled": False,
            "bpdu_guard_enabled": False,
            "portfast_enabled": False,
            "loopguard_enabled": False,
            "instances": [],
            "priority": None
        }

        for line in self.lines:
            # Spanning tree mode
            match = re.match(r'^spanning-tree\s+mode\s+(.+)$', line, re.IGNORECASE)
            if match:
                st["mode"] = match.group(1)
                st["enabled"] = True

            # RSTP/MSTP
            if re.search(r'spanning-tree', line, re.IGNORECASE):
                st["enabled"] = True

            # Root guard
            if 'root guard' in line.lower():
                st["root_guard_enabled"] = True

            # BPDU guard
            if 'bpdu guard' in line.lower():
                st["bpdu_guard_enabled"] = True

            # PortFast
            if 'portfast' in line.lower():
                st["portfast_enabled"] = True

            # Loop guard
            if 'loop guard' in line.lower():
                st["loopguard_enabled"] = True

            # Priority
            match = re.match(r'^spanning-tree\s+priority\s+(\d+)$', line, re.IGNORECASE)
            if match:
                st["priority"] = int(match.group(1))

        return st

    # ============ VLAN Parsing ============
    def _parse_vlans(self) -> Dict[str, Any]:
        """Parse VLAN configuration."""
        vlans = {
            "count": 0,
            "vlans": [],
            "management_vlan": None,
            "native_vlan": 1
        }

        vlan_ids: Set[int] = set()

        for line in self.lines:
            # VLAN definitions
            match = re.match(r'^vlan\s+(\d+)$', line, re.IGNORECASE)
            if match:
                vlan_id = int(match.group(1))
                vlan_ids.add(vlan_id)

            # Management VLAN (via ip routing vlan)
            match = re.match(r'^interface\s+Vlan(\d+)', line, re.IGNORECASE)
            if match:
                vlan_id = int(match.group(1))
                vlans["management_vlan"] = vlan_id

            # Native VLAN (switchport native vlan)
            match = re.match(r'^switchport\s+native\s+vlan\s+(\d+)', line, re.IGNORECASE)
            if match:
                vlans["native_vlan"] = int(match.group(1))

        vlans["vlans"] = sorted(list(vlan_ids))
        vlans["count"] = len(vlan_ids)

        return vlans

    # ============ Interface Parsing ============
    def _parse_interfaces(self) -> Dict[str, Any]:
        """Parse interface configurations."""
        interfaces = {
            "total": 0,
            "interfaces": []
        }

        current_interface = None

        for line in self.lines:
            # Interface definition
            match = re.match(r'^interface\s+(.+)$', line, re.IGNORECASE)
            if match:
                if current_interface:
                    interfaces["interfaces"].append(current_interface)
                current_interface = {
                    "name": match.group(1),
                    "ip_address": None,
                    "netmask": None,
                    "description": None,
                    "status": None,
                    "mtu": None,
                    "speed": None,
                    "duplex": None,
                    "port_security": False,
                    "access_vlan": None,
                    "trunk": False,
                    "allowed_vlans": []
                }

            elif current_interface and line.startswith(" "):
                line = line.strip()

                # IP address
                match = re.match(r'^ip\s+address\s+([0-9.]+)\s+([0-9.]+)', line, re.IGNORECASE)
                if match:
                    current_interface["ip_address"] = match.group(1)
                    current_interface["netmask"] = match.group(2)

                # Description
                match = re.match(r'^description\s+(.+)$', line, re.IGNORECASE)
                if match:
                    current_interface["description"] = match.group(1)

                # Shutdown
                if 'no shutdown' in line.lower():
                    current_interface["status"] = "up"
                elif 'shutdown' in line.lower():
                    current_interface["status"] = "down"

                # MTU
                match = re.match(r'^mtu\s+(\d+)$', line, re.IGNORECASE)
                if match:
                    current_interface["mtu"] = int(match.group(1))

                # Speed
                match = re.match(r'^speed\s+(.+)$', line, re.IGNORECASE)
                if match:
                    current_interface["speed"] = match.group(1)

                # Duplex
                match = re.match(r'^duplex\s+(.+)$', line, re.IGNORECASE)
                if match:
                    current_interface["duplex"] = match.group(1)

                # Port security
                if 'port-security' in line.lower():
                    current_interface["port_security"] = True

                # Access VLAN
                match = re.match(r'^switchport\s+access\s+vlan\s+(\d+)', line, re.IGNORECASE)
                if match:
                    current_interface["access_vlan"] = int(match.group(1))

                # Trunk
                if 'switchport mode trunk' in line.lower():
                    current_interface["trunk"] = True

                # Allowed VLANs
                match = re.match(r'^switchport\s+trunk\s+allowed\s+vlan\s+(.+)', line, re.IGNORECASE)
                if match:
                    vlans_str = match.group(1)
                    current_interface["allowed_vlans"] = self._parse_vlan_range(vlans_str)

        # Add last interface
        if current_interface:
            interfaces["interfaces"].append(current_interface)

        interfaces["total"] = len(interfaces["interfaces"])
        return interfaces

    # ============ Port Channel Parsing ============
    def _parse_port_channels(self) -> Dict[str, Any]:
        """Parse port channel (LAG) configuration."""
        port_channels = {
            "count": 0,
            "port_channels": []
        }

        for line in self.lines:
            match = re.match(r'^interface\s+Port-Channel\s*(\d+)', line, re.IGNORECASE)
            if match:
                port_channels["port_channels"].append({
                    "number": int(match.group(1))
                })

        port_channels["count"] = len(port_channels["port_channels"])
        return port_channels

    # ============ Dot1x Parsing ============
    def _parse_dot1x(self) -> Dict[str, Any]:
        """Parse 802.1X authentication configuration."""
        dot1x = {
            "enabled": False,
            "authentication_method": None,
            "guest_vlan": None,
            "eapol_timeout": None,
            "timeout": None
        }

        for line in self.lines:
            if 'dot1x' in line.lower():
                dot1x["enabled"] = True

            # Authentication method
            match = re.match(r'^aaa\s+authentication\s+dot1x\s+default\s+(.+)$', line, re.IGNORECASE)
            if match:
                dot1x["authentication_method"] = match.group(1)

            # Guest VLAN
            match = re.match(r'^dot1x\s+guest-vlan\s+(\d+)', line, re.IGNORECASE)
            if match:
                dot1x["guest_vlan"] = int(match.group(1))

        return dot1x

    # ============ DHCP Snooping Parsing ============
    def _parse_dhcp_snooping(self) -> Dict[str, Any]:
        """Parse DHCP snooping configuration."""
        dhcp_snooping = {
            "enabled": False,
            "vlans": [],
            "option82_enabled": False,
            "trusted_ports": []
        }

        for line in self.lines:
            if 'ip dhcp snooping' in line.lower() and 'vlan' in line.lower():
                dhcp_snooping["enabled"] = True

                # Extract VLAN ranges
                match = re.search(r'vlan\s+(.+)$', line, re.IGNORECASE)
                if match:
                    vlans_str = match.group(1)
                    dhcp_snooping["vlans"] = self._parse_vlan_range(vlans_str)

            if 'dhcp snooping information option' in line.lower():
                dhcp_snooping["option82_enabled"] = True

        return dhcp_snooping

    # ============ ARP Inspection Parsing ============
    def _parse_arp_inspection(self) -> Dict[str, Any]:
        """Parse ARP inspection configuration."""
        arp_inspection = {
            "enabled": False,
            "vlans": [],
            "validation_enabled": False,
            "validation_types": []
        }

        for line in self.lines:
            if 'ip arp inspection' in line.lower():
                arp_inspection["enabled"] = True

            # VLAN-specific ARP inspection
            match = re.match(r'^ip\s+arp\s+inspection\s+vlan\s+(.+)$', line, re.IGNORECASE)
            if match:
                vlans_str = match.group(1)
                arp_inspection["vlans"] = self._parse_vlan_range(vlans_str)

            # Validation
            if 'ip arp inspection validate' in line.lower():
                arp_inspection["validation_enabled"] = True
                # Extract validation types (src-mac, dst-mac, ip)
                if 'src-mac' in line.lower():
                    arp_inspection["validation_types"].append("src-mac")
                if 'dst-mac' in line.lower():
                    arp_inspection["validation_types"].append("dst-mac")
                if ' ip' in line.lower():
                    arp_inspection["validation_types"].append("ip")

        return arp_inspection

    # ============ Access Lists Parsing ============
    def _parse_access_lists(self) -> Dict[str, Any]:
        """Parse ACL (access list) configuration."""
        acls = {
            "standard_acls": [],
            "extended_acls": [],
            "named_acls": [],
            "acl_count": 0
        }

        for line in self.lines:
            # Standard ACL
            match = re.match(r'^access-list\s+(\d+)\s+', line, re.IGNORECASE)
            if match:
                acl_num = match.group(1)
                if acl_num not in acls["standard_acls"]:
                    acls["standard_acls"].append(acl_num)

            # Named ACL
            match = re.match(r'^ip\s+access-list\s+(?:standard|extended)\s+(\S+)', line, re.IGNORECASE)
            if match:
                acl_name = match.group(1)
                if acl_name not in acls["named_acls"]:
                    acls["named_acls"].append(acl_name)

        acls["acl_count"] = len(acls["standard_acls"]) + len(acls["named_acls"])
        return acls

    # ============ Route Maps Parsing ============
    def _parse_route_maps(self) -> Dict[str, Any]:
        """Parse route map configuration."""
        route_maps = {
            "count": 0,
            "route_maps": []
        }

        for line in self.lines:
            match = re.match(r'^route-map\s+(\S+)\s+(.+)$', line, re.IGNORECASE)
            if match:
                route_maps["route_maps"].append({
                    "name": match.group(1),
                    "action": match.group(2)
                })

        route_maps["count"] = len(route_maps["route_maps"])
        return route_maps

    # ============ Prefix Lists Parsing ============
    def _parse_prefix_lists(self) -> Dict[str, Any]:
        """Parse prefix list configuration."""
        prefix_lists = {
            "count": 0,
            "prefix_lists": []
        }

        for line in self.lines:
            match = re.match(r'^ip\s+prefix-list\s+(\S+)\s+(.+)$', line, re.IGNORECASE)
            if match:
                prefix_lists["prefix_lists"].append({
                    "name": match.group(1),
                    "definition": match.group(2)
                })

        prefix_lists["count"] = len(prefix_lists["prefix_lists"])
        return prefix_lists

    # ============ Helper Methods ============
    def _parse_vlan_range(self, vlans_str: str) -> List[int]:
        """Parse VLAN range string (e.g., '1-10,20,30-40') into list of VLAN IDs."""
        vlans: Set[int] = set()

        parts = vlans_str.split(',')
        for part in parts:
            part = part.strip()
            if '-' in part:
                try:
                    start, end = part.split('-')
                    for v in range(int(start), int(end) + 1):
                        vlans.add(v)
                except ValueError:
                    pass
            else:
                try:
                    vlans.add(int(part))
                except ValueError:
                    pass

        return sorted(list(vlans))
