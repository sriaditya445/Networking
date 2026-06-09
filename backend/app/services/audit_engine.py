# import os
# import re
# from typing import Dict, Any, List, Tuple

# class AuditEngine:
#     @staticmethod
#     def _clean_config(raw_config: str) -> List[str]:
#         """Cleans raw configuration by removing empty lines and comments."""
#         lines = []
#         for line in raw_config.splitlines():
#             line = line.strip()
#             if line and not line.startswith("!") and not line.startswith("#"):
#                 lines.append(line)
#         return lines

#     @staticmethod
#     def _parse_template(template_content: str) -> List[Tuple[str, re.Pattern]]:
#         """
#         Parses a golden template into a list of (raw_line, regex_pattern).
#         Converts {{PLACEHOLDERS}} into match-all regex.
#         """
#         lines = AuditEngine._clean_config(template_content)
#         parsed = []
#         for line in lines:
#             escaped_line = re.escape(line)
#             pattern_str = re.sub(r'\\\{\\\{[A-Za-z0-9_]+\\\}\\\}', r'.+', escaped_line)
#             regex = re.compile(f"^{pattern_str}$", re.IGNORECASE)
#             parsed.append((line, regex))
            
#         return parsed

#     @staticmethod
#     def _get_base_command(line: str) -> str:
#         """Heuristic to get the base command to check for non-compliant matches."""
#         parts = line.split()
#         if len(parts) >= 2:
#             return f"{parts[0]} {parts[1]}".lower()
#         elif len(parts) == 1:
#             return parts[0].lower()
#         return ""

#     @staticmethod
#     def run_audit(device_config: str, device_type: str) -> Dict[str, Any]:
#         template_file = f"{device_type.lower()}_golden_template.txt"
#         base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
#         template_path = os.path.join(base_dir, "templates", template_file)
        
#         # Fallback to switch if template doesn't exist or is unknown
#         if not os.path.exists(template_path):
#             template_path = os.path.join(base_dir, "templates", "switch_golden_template.txt")
            
#         try:
#             with open(template_path, 'r') as f:
#                 template_content = f.read()
#         except Exception as e:
#             raise Exception(f"Failed to load template {template_file}: {str(e)}")

#         template_lines = AuditEngine._parse_template(template_content)
#         device_lines = AuditEngine._clean_config(device_config)
        
#         findings = []
#         summary = {"compliant": 0, "missing": 0, "non_compliant": 0, "extra": 0}
        
#         matched_device_lines = set()
        
#         # Check template requirements against device config
#         for raw_template, template_regex in template_lines:
#             template_base = AuditEngine._get_base_command(raw_template)
            
#             # Find an exact match first (COMPLIANT)
#             exact_match = None
#             for idx, dev_line in enumerate(device_lines):
#                 if idx in matched_device_lines:
#                     continue
#                 if template_regex.match(dev_line):
#                     exact_match = dev_line
#                     matched_device_lines.add(idx)
#                     break
                    
#             if exact_match:
#                 findings.append({
#                     "section": template_base,
#                     "status": "COMPLIANT",
#                     "expected": raw_template,
#                     "actual": exact_match
#                 })
#                 summary["compliant"] += 1
#                 continue
                
#             # If no exact match, look for a non-compliant match (same base command)
#             non_compliant_match = None
#             for idx, dev_line in enumerate(device_lines):
#                 if idx in matched_device_lines:
#                     continue
#                 if AuditEngine._get_base_command(dev_line) == template_base:
#                     non_compliant_match = dev_line
#                     matched_device_lines.add(idx)
#                     break
            
#             if non_compliant_match:
#                 findings.append({
#                     "section": template_base,
#                     "status": "NON_COMPLIANT",
#                     "expected": raw_template,
#                     "actual": non_compliant_match
#                 })
#                 summary["non_compliant"] += 1
#             else:
#                 findings.append({
#                     "section": template_base,
#                     "status": "MISSING",
#                     "expected": raw_template,
#                     "actual": "Not Found"
#                 })
#                 summary["missing"] += 1

#         # Any remaining device lines are EXTRA_CONFIGURATION
#         for idx, dev_line in enumerate(device_lines):
#             if idx not in matched_device_lines:
#                 findings.append({
#                     "section": "Extra Config",
#                     "status": "EXTRA_CONFIGURATION",
#                     "actual": dev_line
#                 })
#                 summary["extra"] += 1
                
#         total_required = len(template_lines)
#         score = (summary["compliant"] / total_required) * 100 if total_required > 0 else 0
        
#         return {
#             "score": round(score, 2),
#             "summary": summary,
#             "findings": findings
#         }
