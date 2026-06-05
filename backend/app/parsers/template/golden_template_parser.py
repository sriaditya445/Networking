"""
Golden Template Parser

Parses golden configuration templates with placeholder support.
Converts templates into normalized JSON structure for comparison with device configs.

Supports placeholders like:
  {{HOSTNAME}}
  {{NTP_SERVER}}
  {{SNMP_COMMUNITY}}
"""

import re
from typing import Dict, List, Any, Optional, Set
from app.core.logger import logger


class GoldenTemplateParser:
    """Parse golden templates with placeholder support into structured JSON."""

    PLACEHOLDER_PATTERN = re.compile(r'\{\{([A-Z_0-9]+)\}\}')

    def __init__(self, template_text: str):
        self.template_text = template_text
        self.lines = [line.rstrip() for line in template_text.split('\n')]
        self.template_dict: Dict[str, Any] = {}
        self.all_placeholders: Set[str] = set()

    def parse(self) -> Dict[str, Any]:
        """Parse golden template into structured JSON."""
        try:
            self.template_dict = {
                "template_raw": self.template_text,
                "template_sections": self._parse_sections(),
                "all_placeholders": sorted(list(self.all_placeholders)),
                "placeholder_count": len(self.all_placeholders),
                "sections_defined": list(self.template_dict.get("template_sections", {}).keys())
            }
            return self.template_dict
        except Exception as e:
            logger.error(f"Error parsing golden template: {e}")
            raise

    def _parse_sections(self) -> Dict[str, Any]:
        """Parse template into configuration sections."""
        sections = {}

        # Hostname section
        sections["hostname"] = self._parse_hostname_section()

        # AAA section
        sections["aaa"] = self._parse_aaa_section()

        # SSH section
        sections["ssh"] = self._parse_ssh_section()

        # NTP section
        sections["ntp"] = self._parse_ntp_section()

        # SNMP section
        sections["snmp"] = self._parse_snmp_section()

        # Logging section
        sections["logging"] = self._parse_logging_section()

        # Spanning Tree section
        sections["spanning_tree"] = self._parse_spanning_tree_section()

        # VLAN section
        sections["vlans"] = self._parse_vlan_section()

        # Interface section
        sections["interfaces"] = self._parse_interface_section()

        # Port Channel section
        sections["port_channels"] = self._parse_port_channel_section()

        # 802.1X section
        sections["dot1x"] = self._parse_dot1x_section()

        # DHCP Snooping section
        sections["dhcp_snooping"] = self._parse_dhcp_snooping_section()

        # ARP Inspection section
        sections["arp_inspection"] = self._parse_arp_inspection_section()

        # ACL section
        sections["access_lists"] = self._parse_acl_section()

        # Remove empty sections
        sections = {k: v for k, v in sections.items() if v}

        return sections

    def _extract_placeholders(self, text: str) -> List[str]:
        """Extract all placeholders from text."""
        placeholders = self.PLACEHOLDER_PATTERN.findall(text)
        self.all_placeholders.update(placeholders)
        return placeholders

    def _find_lines_with_keyword(self, keyword: str, start_index: int = 0) -> List[tuple[int, str]]:
        """Find all lines containing keyword (case-insensitive)."""
        results = []
        for i in range(start_index, len(self.lines)):
            if re.search(rf'\b{re.escape(keyword)}\b', self.lines[i], re.IGNORECASE):
                results.append((i, self.lines[i]))
        return results

    # ============ Hostname Section ============
    def _parse_hostname_section(self) -> Optional[Dict[str, Any]]:
        """Parse hostname template section."""
        for line in self.lines:
            if re.match(r'^hostname\s+', line, re.IGNORECASE):
                placeholders = self._extract_placeholders(line)
                return {
                    "raw_lines": [line],
                    "placeholders": placeholders,
                    "has_placeholder": bool(placeholders),
                    "pattern": line
                }
        return None

    # ============ AAA Section ============
    def _parse_aaa_section(self) -> Optional[Dict[str, Any]]:
        """Parse AAA template section."""
        aaa_lines = self._find_lines_with_keyword('aaa')
        if not aaa_lines:
            return None

        aaa_config = {
            "raw_lines": [line for _, line in aaa_lines],
            "placeholders": [],
            "sections": {
                "new_model": None,
                "authentication": [],
                "authorization": [],
                "accounting": [],
                "servers": []
            }
        }

        for _, line in aaa_lines:
            placeholders = self._extract_placeholders(line)
            aaa_config["placeholders"].extend(placeholders)

            if 'new-model' in line.lower():
                aaa_config["sections"]["new_model"] = line

            if 'authentication' in line.lower():
                aaa_config["sections"]["authentication"].append(line)

            if 'authorization' in line.lower():
                aaa_config["sections"]["authorization"].append(line)

            if 'accounting' in line.lower():
                aaa_config["sections"]["accounting"].append(line)

        # TACACS/RADIUS servers
        server_lines = self._find_lines_with_keyword('tacacs-server|radius-server')
        for _, line in server_lines:
            placeholders = self._extract_placeholders(line)
            aaa_config["placeholders"].extend(placeholders)
            aaa_config["sections"]["servers"].append(line)

        return aaa_config if aaa_config["raw_lines"] else None

    # ============ SSH Section ============
    def _parse_ssh_section(self) -> Optional[Dict[str, Any]]:
        """Parse SSH template section."""
        ssh_lines = self._find_lines_with_keyword('ssh')
        if not ssh_lines:
            return None

        ssh_config = {
            "raw_lines": [line for _, line in ssh_lines],
            "placeholders": [],
            "settings": {}
        }

        for _, line in ssh_lines:
            placeholders = self._extract_placeholders(line)
            ssh_config["placeholders"].extend(placeholders)

            # Extract version
            match = re.search(r'version\s+(\d+)', line, re.IGNORECASE)
            if match:
                ssh_config["settings"]["version"] = int(match.group(1))

            # Other SSH settings
            if 'key-exchange' in line.lower():
                ssh_config["settings"]["has_key_exchange"] = True
            if 'encryption' in line.lower():
                ssh_config["settings"]["has_encryption"] = True
            if 'timeout' in line.lower():
                ssh_config["settings"]["has_timeout"] = True

        return ssh_config if ssh_config["raw_lines"] else None

    # ============ NTP Section ============
    def _parse_ntp_section(self) -> Optional[Dict[str, Any]]:
        """Parse NTP template section."""
        ntp_lines = self._find_lines_with_keyword('ntp')
        if not ntp_lines:
            return None

        ntp_config = {
            "raw_lines": [line for _, line in ntp_lines],
            "placeholders": [],
            "servers": [],
            "authentication": False,
            "source_interface": None
        }

        for _, line in ntp_lines:
            placeholders = self._extract_placeholders(line)
            ntp_config["placeholders"].extend(placeholders)

            # NTP servers
            match = re.search(r'ntp\s+server\s+(.+)', line, re.IGNORECASE)
            if match:
                ntp_config["servers"].append(match.group(1).strip())

            # NTP authentication
            if 'authenticate' in line.lower():
                ntp_config["authentication"] = True

            # NTP source
            if 'source' in line.lower():
                ntp_config["source_interface"] = line

        return ntp_config if ntp_config["raw_lines"] else None

    # ============ SNMP Section ============
    def _parse_snmp_section(self) -> Optional[Dict[str, Any]]:
        """Parse SNMP template section."""
        snmp_lines = self._find_lines_with_keyword('snmp')
        if not snmp_lines:
            return None

        snmp_config = {
            "raw_lines": [line for _, line in snmp_lines],
            "placeholders": [],
            "version": None,
            "communities": [],
            "v3_users": [],
            "trap_hosts": [],
            "inform_hosts": []
        }

        for _, line in snmp_lines:
            placeholders = self._extract_placeholders(line)
            snmp_config["placeholders"].extend(placeholders)

            # Community strings
            if 'community' in line.lower():
                match = re.search(r'community\s+([^\s]+)', line, re.IGNORECASE)
                if match:
                    snmp_config["communities"].append(match.group(1))

            # V3 users
            if 'user' in line.lower():
                snmp_config["version"] = 3

            # Trap hosts
            if 'trap' in line.lower() and 'host' in line.lower():
                snmp_config["trap_hosts"].append(line)

            # Inform hosts
            if 'inform' in line.lower():
                snmp_config["inform_hosts"].append(line)

        return snmp_config if snmp_config["raw_lines"] else None

    # ============ Logging Section ============
    def _parse_logging_section(self) -> Optional[Dict[str, Any]]:
        """Parse logging template section."""
        logging_lines = self._find_lines_with_keyword('logging')
        if not logging_lines:
            return None

        logging_config = {
            "raw_lines": [line for _, line in logging_lines],
            "placeholders": [],
            "servers": [],
            "levels": [],
            "buffered": False
        }

        for _, line in logging_lines:
            placeholders = self._extract_placeholders(line)
            logging_config["placeholders"].extend(placeholders)

            # Syslog servers
            if 'host' in line.lower():
                logging_config["servers"].append(line)

            # Log levels
            for level in ['emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'informational', 'debug']:
                if level in line.lower():
                    logging_config["levels"].append(level)

            # Buffered
            if 'buffered' in line.lower():
                logging_config["buffered"] = True

        return logging_config if logging_config["raw_lines"] else None

    # ============ Spanning Tree Section ============
    def _parse_spanning_tree_section(self) -> Optional[Dict[str, Any]]:
        """Parse spanning tree template section."""
        st_lines = self._find_lines_with_keyword('spanning-tree')
        if not st_lines:
            return None

        st_config = {
            "raw_lines": [line for _, line in st_lines],
            "placeholders": [],
            "mode": None,
            "features": []
        }

        for _, line in st_lines:
            placeholders = self._extract_placeholders(line)
            st_config["placeholders"].extend(placeholders)

            # Mode
            if 'mode' in line.lower():
                match = re.search(r'mode\s+(\S+)', line, re.IGNORECASE)
                if match:
                    st_config["mode"] = match.group(1)

            # Features
            for feature in ['bpdu guard', 'portfast', 'root guard', 'loop guard']:
                if feature in line.lower():
                    st_config["features"].append(feature)

        return st_config if st_config["raw_lines"] else None

    # ============ VLAN Section ============
    def _parse_vlan_section(self) -> Optional[Dict[str, Any]]:
        """Parse VLAN template section."""
        vlan_lines = self._find_lines_with_keyword('vlan')
        if not vlan_lines:
            return None

        vlan_config = {
            "raw_lines": [line for _, line in vlan_lines],
            "placeholders": [],
            "vlan_ids": [],
            "native_vlan": None
        }

        for _, line in vlan_lines:
            placeholders = self._extract_placeholders(line)
            vlan_config["placeholders"].extend(placeholders)

            # VLAN definitions
            match = re.search(r'vlan\s+(\d+)', line, re.IGNORECASE)
            if match:
                vlan_config["vlan_ids"].append(int(match.group(1)))

            # Native VLAN
            if 'native' in line.lower():
                match = re.search(r'native\s+vlan\s+(\d+)', line, re.IGNORECASE)
                if match:
                    vlan_config["native_vlan"] = int(match.group(1))

        return vlan_config if vlan_config["raw_lines"] else None

    # ============ Interface Section ============
    def _parse_interface_section(self) -> Optional[Dict[str, Any]]:
        """Parse interface template section."""
        interface_config = {
            "raw_lines": [],
            "placeholders": [],
            "interface_templates": []
        }

        current_interface = None
        for line in self.lines:
            if re.match(r'^interface\s+', line, re.IGNORECASE):
                if current_interface:
                    interface_config["interface_templates"].append(current_interface)
                current_interface = {
                    "name_pattern": line,
                    "settings": []
                }
                interface_config["raw_lines"].append(line)
            elif current_interface and line.startswith(" "):
                placeholders = self._extract_placeholders(line)
                interface_config["placeholders"].extend(placeholders)
                current_interface["settings"].append(line.strip())
                interface_config["raw_lines"].append(line)

        if current_interface:
            interface_config["interface_templates"].append(current_interface)

        return interface_config if interface_config["raw_lines"] else None

    # ============ Port Channel Section ============
    def _parse_port_channel_section(self) -> Optional[Dict[str, Any]]:
        """Parse port channel template section."""
        pc_lines = self._find_lines_with_keyword('port-channel|port channel')
        if not pc_lines:
            return None

        return {
            "raw_lines": [line for _, line in pc_lines],
            "placeholders": [],
            "count": len(pc_lines)
        }

    # ============ 802.1X Section ============
    def _parse_dot1x_section(self) -> Optional[Dict[str, Any]]:
        """Parse 802.1X template section."""
        dot1x_lines = self._find_lines_with_keyword('dot1x')
        if not dot1x_lines:
            return None

        dot1x_config = {
            "raw_lines": [line for _, line in dot1x_lines],
            "placeholders": [],
            "settings": {}
        }

        for _, line in dot1x_lines:
            placeholders = self._extract_placeholders(line)
            dot1x_config["placeholders"].extend(placeholders)

        return dot1x_config if dot1x_config["raw_lines"] else None

    # ============ DHCP Snooping Section ============
    def _parse_dhcp_snooping_section(self) -> Optional[Dict[str, Any]]:
        """Parse DHCP snooping template section."""
        dhcp_lines = self._find_lines_with_keyword('dhcp.*snooping')
        if not dhcp_lines:
            return None

        return {
            "raw_lines": [line for _, line in dhcp_lines],
            "placeholders": self._extract_placeholders('\n'.join([line for _, line in dhcp_lines])),
            "count": len(dhcp_lines)
        }

    # ============ ARP Inspection Section ============
    def _parse_arp_inspection_section(self) -> Optional[Dict[str, Any]]:
        """Parse ARP inspection template section."""
        arp_lines = self._find_lines_with_keyword('arp.*inspection')
        if not arp_lines:
            return None

        return {
            "raw_lines": [line for _, line in arp_lines],
            "placeholders": self._extract_placeholders('\n'.join([line for _, line in arp_lines])),
            "count": len(arp_lines)
        }

    # ============ ACL Section ============
    def _parse_acl_section(self) -> Optional[Dict[str, Any]]:
        """Parse access list template section."""
        acl_lines = self._find_lines_with_keyword('access-list|access list')
        if not acl_lines:
            return None

        acl_config = {
            "raw_lines": [line for _, line in acl_lines],
            "placeholders": [],
            "count": len(acl_lines)
        }

        for _, line in acl_lines:
            placeholders = self._extract_placeholders(line)
            acl_config["placeholders"].extend(placeholders)

        return acl_config if acl_config["raw_lines"] else None

    def get_placeholder_info(self) -> Dict[str, List[str]]:
        """Get mapping of placeholders to sections where they're used."""
        placeholder_sections = {}

        for section_name, section_data in self.template_dict.get("template_sections", {}).items():
            if isinstance(section_data, dict) and "placeholders" in section_data:
                for placeholder in section_data["placeholders"]:
                    if placeholder not in placeholder_sections:
                        placeholder_sections[placeholder] = []
                    placeholder_sections[placeholder].append(section_name)

        return placeholder_sections
