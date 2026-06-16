"""
Generic Hierarchical Configuration Parser

Converts raw network configuration text (any vendor) into a structured 
hierarchical JSON format without relying on predefined sections.

Works by detecting indentation levels and building a tree structure
where indented commands become children of their parent command.

Example Input:
    hostname SW1
    ip ssh version 2
    interface Gig1/0/1
      switchport mode access
      switchport access vlan 10

Example Output:
    {
        "hostname": "SW1",
        "ip": {"ssh": {"version": "2"}},
        "interface": {
            "Gig1/0/1": {
                "switchport": {
                    "mode": "access",
                    "access": {"vlan": "10"}
                }
            }
        }
    }
"""

from typing import Dict, Any, List, Tuple
import re


class GenericConfigParser:
    """
    Generic hierarchical configuration parser that works with any 
    network configuration syntax.
    """

    # Regex to detect indentation and extract command
    COMMAND_REGEX = re.compile(r'^(\s*)(.+)$', re.MULTILINE)

    @staticmethod
    def parse_config(config_text: str) -> Dict[str, Any]:
        """
        Parse raw configuration text into a hierarchical JSON structure.

        Args:
            config_text: Raw configuration text (any vendor format)

        Returns:
            Hierarchical dictionary representing the configuration
        """
        if not config_text or not config_text.strip():
            return {}

        lines = GenericConfigParser._preprocess_lines(config_text)
        parsed_lines = GenericConfigParser._extract_lines_with_indent(lines)

        if not parsed_lines:
            return {}

        # Build hierarchy from flat list of (indent_level, command) tuples
        root = {}
        stack = [(0, root)]  # Stack of (indent_level, current_dict)

        for indent_level, command in parsed_lines:
            # Pop stack until we find the right parent level
            while len(stack) > 1 and stack[-1][0] >= indent_level:
                stack.pop()

            parent_dict = stack[-1][1]

            # Parse the command into key-value pair
            key, value = GenericConfigParser._parse_command(command)

            if key:
                # If value exists, store directly
                if value:
                    if key in parent_dict:
                        # Key exists - convert to dict for hierarchy
                        if not isinstance(parent_dict[key], dict):
                            parent_dict[key] = {}
                    else:
                        parent_dict[key] = value
                else:
                    # No value - this becomes a parent for children
                    if key not in parent_dict:
                        parent_dict[key] = {}
                    elif not isinstance(parent_dict[key], dict):
                        parent_dict[key] = {}

                # Push current level onto stack for next iterations
                if isinstance(parent_dict[key], dict):
                    stack.append((indent_level, parent_dict[key]))

        return root

    @staticmethod
    def _preprocess_lines(config_text: str) -> List[str]:
        """
        Clean and preprocess configuration lines.
        - Remove empty lines
        - Remove comment-only lines
        - Normalize line endings
        """
        lines = []
        for line in config_text.splitlines():
            # Remove trailing whitespace
            line = line.rstrip()

            # Skip empty lines
            if not line or not line.strip():
                continue

            # Skip comment-only lines (lines that start with ! or #)
            stripped = line.lstrip()
            if stripped.startswith('!') or stripped.startswith('#'):
                continue

            lines.append(line)

        return lines

    @staticmethod
    def _extract_lines_with_indent(lines: List[str]) -> List[Tuple[int, str]]:
        """
        Extract indentation level and command from each line.

        Returns:
            List of (indent_level, command_text) tuples
        """
        parsed = []

        for line in lines:
            # Count leading spaces/tabs
            indent_level = len(line) - len(line.lstrip())

            # Get command text (stripped)
            command = line.strip()

            parsed.append((indent_level, command))

        return parsed

    @staticmethod
    def _parse_command(command: str) -> Tuple[str, Any]:
        """
        Parse a single command line into key-value pair.

        Handles:
        - Simple keys: "hostname" -> ("hostname", None)
        - Key-value: "hostname SW1" -> ("hostname", "SW1")
        - Multi-word commands: "ip ssh version 2" -> ("ip", None) or ("ip.ssh.version", "2")

        Returns:
            (key, value) tuple. Value is None if command has no value.
        """
        if not command:
            return None, None

        parts = command.split(None, 1)  # Split on first whitespace

        if len(parts) == 1:
            # Single word command (e.g., "aaa" or "aaa new-model")
            # Check if it's a numeric or special value
            key = parts[0]
            return key, None

        key = parts[0]
        rest = parts[1]

        # Try to detect if rest is a sub-command or a value
        # If rest starts with a common keyword, it might be a sub-command hierarchy
        
        # Check if rest looks like a value (contains numbers, special chars, or is short)
        if GenericConfigParser._is_value(rest):
            return key, rest
        else:
            # Could be a sub-command, return as hierarchy
            return key, None

    @staticmethod
    def _is_value(text: str) -> bool:
        """
        Heuristic to determine if text is a value or sub-command.
        
        Returns True if it looks like a value rather than a command.
        """
        # If it's numeric, IP, or appears to be data - it's a value
        if re.match(r'^[\d.]+$', text):  # Numbers or IPs
            return True

        if re.match(r'^".*"$', text):  # Quoted strings
            return True

        # If it's a URL or path
        if any(x in text.lower() for x in ['http://', 'https://', '/', 'ftp://']):
            return True

        # If it contains special command separators
        if '|' in text or '>' in text or '<' in text:
            return True

        # If it's short (1-2 words) and doesn't look like a keyword combo
        word_count = len(text.split())
        if word_count <= 2:
            # Common keywords that are sub-commands
            keywords = {
                'version', 'mode', 'access', 'add', 'remove', 'set',
                'enable', 'disable', 'on', 'off', 'yes', 'no',
                'priv', 'encr', 'exec', 'group', 'list', 'local',
                'radius', 'tacacs', 'ldap', 'nis', 'enable'
            }
            if text.lower() in keywords:
                return False
            return True

        return False


# Convenience function
def parse_config_to_json(config_text: str) -> Dict[str, Any]:
    """
    Convenience function to parse configuration text to JSON.
    """
    parser = GenericConfigParser()
    return parser.parse_config(config_text)
