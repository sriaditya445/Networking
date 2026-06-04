def extract_hostname(content: str, filename: str) -> str:

    match = HOSTNAME_REGEX.search(content)

    if match:
        return match.group(1)

    return os.path.splitext(filename)[0]