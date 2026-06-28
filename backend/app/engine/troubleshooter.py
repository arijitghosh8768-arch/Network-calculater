import re

def analyze_cli_logs(cli_log: str):
    """
    Scans show output logs for common CCNA/CCNP network errors and returns diagnostic reports.
    """
    issues = []
    solutions = []

    # 1. Interface states (show ip interface brief)
    # Match lines like: GigabitEthernet0/1    192.168.1.1    YES manual administratively down down
    down_interfaces = re.findall(r"(\w+Ethernet\d+/\d+(?:\.\d+)?)\s+\S+\s+\S+\s+\S+\s+administratively down\s+down", cli_log, re.IGNORECASE)
    for intf in down_interfaces:
        issues.append(f"Interface {intf} is administratively disabled.")
        solutions.append(f"interface {intf}\n no shutdown")

    # Physical link down (but not admin down)
    link_down = re.findall(r"(\w+Ethernet\d+/\d+(?:\.\d+)?)\s+\S+\s+\S+\s+\S+\s+down\s+down", cli_log, re.IGNORECASE)
    for intf in link_down:
        if intf not in down_interfaces:
            issues.append(f"Interface {intf} physical link state is DOWN. Check physical cabling or peer port mode.")
            solutions.append(f"! For interface {intf}:\n! Check ethernet cable or verify the remote switch port state.")

    # 2. VLAN inconsistencies (show vlan)
    # Check if native VLAN mismatch is explicitly mentioned in logs
    if "native vlan mismatch" in cli_log.lower() or "mismatch writing vlan" in cli_log.lower():
        issues.append("Native VLAN mismatch detected on trunk port.")
        solutions.append("interface GigabitEthernet0/1\n switchport trunk native vlan 99")

    # 3. Route issues (show ip route)
    if "show ip route" in cli_log.lower() and "gateway of last resort is not set" in cli_log.lower():
        issues.append("Static default route (Gateway of Last Resort) is missing.")
        solutions.append("ip route 0.0.0.0 0.0.0.0 <next_hop_ip_address>")

    # 4. Spanning tree block (show spanning-tree)
    if "bpdu-inconsistent" in cli_log.lower() or "loop-inconsistent" in cli_log.lower():
        issues.append("STP BPDU inconsistency detected. BPDU Guard has disabled the port.")
        solutions.append("interface range g0/1 - 24\n shutdown\n no shutdown\n! Ensure APs or rogue switches are disconnected.")

    # Default if clean
    if not issues:
        # Check if there is anything readable
        if len(cli_log.strip()) > 10:
            issues.append("Log parsed: No high-priority configuration anomalies or interface faults found.")
            solutions.append("! Verify connectivity with ping and traceroute commands.")
        else:
            issues.append("Invalid or empty input log. Please paste terminal show outputs.")
            solutions.append("! Paste 'show ip interface brief', 'show ip route', or 'show vlan' output.")

    return {
        "success": True,
        "issues": issues,
        "solutions": "\n".join(solutions)
    }
