def build_audit_summary(
    interfaces,
    vlans,
    routes,
    ips
):

    return {
        "interface_count": len(interfaces),
        "vlan_count": len(vlans),
        "route_count": len(routes),
        "ip_count": len(ips)
    }