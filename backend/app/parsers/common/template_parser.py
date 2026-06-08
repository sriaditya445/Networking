"""
Template Parser

Converts golden templates (with {{PLACEHOLDER}} syntax) into the same 
hierarchical JSON structure as configurations.

This allows direct comparison between device configurations and golden templates
at the JSON level rather than line-by-line.

Example Input:
    hostname {{HOSTNAME}}
    ip ssh version 2
    ntp server {{NTP_SERVER}}

Example Output:
    {
        "hostname": "{{HOSTNAME}}",
        "ip": {"ssh": {"version": "2"}},
        "ntp": {"server": "{{NTP_SERVER}}"}
    }

Placeholders:
- {{HOSTNAME}} - matches any value
- {{NTP_SERVER}} - matches any value
- Plain text - must match exactly
"""

from typing import Dict, Any, List, Set
import re
from app.parsers.common.generic_config_parser import GenericConfigParser


class TemplateParser:
    """
    Parser for golden templates that preserves placeholder syntax
    while building hierarchical JSON structure.
    """

    # Regex to detect placeholders
    PLACEHOLDER_REGEX = re.compile(r'\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}')

    @staticmethod
    def parse_template(template_text: str) -> Dict[str, Any]:
        """
        Parse a golden template into hierarchical JSON structure.

        Args:
            template_text: Template text with {{PLACEHOLDER}} syntax

        Returns:
            Hierarchical dictionary with placeholders preserved as strings
        """
        if not template_text or not template_text.strip():
            return {}

        # Use GenericConfigParser with template-aware preprocessing
        lines = TemplateParser._preprocess_template_lines(template_text)
        parsed_lines = TemplateParser._extract_lines_with_indent(lines)

        if not parsed_lines:
            return {}

        # Build hierarchy from flat list
        root = {}
        stack = [(0, root)]  # Stack of (indent_level, current_dict)

        for indent_level, command in parsed_lines:
            # Pop stack until we find the right parent level
            while len(stack) > 1 and stack[-1][0] >= indent_level:
                stack.pop()

            parent_dict = stack[-1][1]

            # Parse command, preserving placeholders
            key, value = TemplateParser._parse_template_command(command)

            if key:
                # Store the key-value pair
                if value:
                    if key in parent_dict:
                        if not isinstance(parent_dict[key], dict):
                            parent_dict[key] = {}
                    else:
                        parent_dict[key] = value
                else:
                    # No value - becomes parent for children
                    if key not in parent_dict:
                        parent_dict[key] = {}
                    elif not isinstance(parent_dict[key], dict):
                        parent_dict[key] = {}

                # Push for potential children
                if isinstance(parent_dict[key], dict):
                    stack.append((indent_level, parent_dict[key]))

        return root

    @staticmethod
    def _preprocess_template_lines(template_text: str) -> List[str]:
        """
        Clean template lines while preserving placeholders.
        - Remove empty lines
        - Remove comment-only lines
        - Normalize line endings
        """
        lines = []
        for line in template_text.splitlines():
            line = line.rstrip()

            if not line or not line.strip():
                continue

            stripped = line.lstrip()
            if stripped.startswith('!') or stripped.startswith('#'):
                continue

            lines.append(line)

        return lines

    @staticmethod
    def _extract_lines_with_indent(lines: List[str]) -> List[tuple]:
        """
        Extract indentation level and command from each line.

        Returns:
            List of (indent_level, command_text) tuples
        """
        parsed = []

        for line in lines:
            indent_level = len(line) - len(line.lstrip())
            command = line.strip()
            parsed.append((indent_level, command))

        return parsed

    @staticmethod
    def _parse_template_command(command: str) -> tuple:
        """
        Parse a template command line into key-value pair.

        Preserves {{PLACEHOLDER}} syntax in values.

        Returns:
            (key, value) tuple. Value is None if command has no value.
        """
        if not command:
            return None, None

        parts = command.split(None, 1)

        if len(parts) == 1:
            key = parts[0]
            return key, None

        key = parts[0]
        rest = parts[1]

        # Check if rest is a value or sub-command
        # Treat anything with placeholders as a value
        if TemplateParser._contains_placeholder(rest):
            return key, rest

        # Use same heuristic as GenericConfigParser
        if TemplateParser._is_value(rest):
            return key, rest
        else:
            return key, None

    @staticmethod
    def _contains_placeholder(text: str) -> bool:
        """
        Check if text contains {{PLACEHOLDER}} syntax.
        """
        return bool(TemplateParser.PLACEHOLDER_REGEX.search(text))

    @staticmethod
    def _is_value(text: str) -> bool:
        """
        Heuristic to determine if text is a value or sub-command.

        Returns True if it looks like a value rather than a command.
        """
        # If it's numeric, IP, or appears to be data
        if re.match(r'^[\d.]+$', text):
            return True

        if re.match(r'^".*"$', text):
            return True

        if any(x in text.lower() for x in ['http://', 'https://', '/', 'ftp://']):
            return True

        if '|' in text or '>' in text or '<' in text:
            return True

        word_count = len(text.split())
        if word_count <= 2:
            keywords = {
                'version', 'mode', 'access', 'add', 'remove', 'set',
                'enable', 'disable', 'on', 'off', 'yes', 'no',
                'priv', 'encr', 'exec', 'group', 'list', 'local',
                'radius', 'tacacs', 'ldap', 'nis'
            }
            if text.lower() in keywords:
                return False
            return True

        return False

    @staticmethod
    def extract_placeholders(template_json: Dict[str, Any]) -> Set[str]:
        """
        Extract all placeholder names from a parsed template.

        Args:
            template_json: Parsed template dictionary

        Returns:
            Set of placeholder names (e.g., {'HOSTNAME', 'NTP_SERVER'})
        """
        placeholders = set()

        def _extract_recursive(obj):
            if isinstance(obj, dict):
                for value in obj.values():
                    _extract_recursive(value)
            elif isinstance(obj, str):
                matches = TemplateParser.PLACEHOLDER_REGEX.findall(obj)
                placeholders.update(matches)

        _extract_recursive(template_json)
        return placeholders

    @staticmethod
    def validate_template_json(template_json: Dict[str, Any]) -> tuple:
        """
        Validate template JSON structure.

        Returns:
            (is_valid, error_message)
        """
        if not isinstance(template_json, dict):
            return False, "Template must be a dictionary"

        # Check for valid placeholder syntax
        placeholders = TemplateParser.extract_placeholders(template_json)
        for placeholder in placeholders:
            if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', placeholder):
                return False, f"Invalid placeholder name: {placeholder}"

        return True, None


# Convenience functions
def parse_template_to_json(template_text: str) -> Dict[str, Any]:
    """
    Parse template text to JSON dictionary.
    """
    parser = TemplateParser()
    return parser.parse_template(template_text)


def get_template_placeholders(template_json: Dict[str, Any]) -> Set[str]:
    """
    Get all placeholder names from parsed template.
    """
    parser = TemplateParser()
    return parser.extract_placeholders(template_json)
