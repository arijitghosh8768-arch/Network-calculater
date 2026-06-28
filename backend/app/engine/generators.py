import ipaddress

def generate_wildcard(subnet_mask: str):
    """
    Calculates wildcard mask from a subnet mask.
    """
    try:
        octets = subnet_mask.split('.')
        wildcard = '.'.join(str(255 - int(octet)) for octet in octets)
        return wildcard
    except Exception:
        return "0.0.0.0"

def generate_cisco_acl(network_str: str, acl_number: int = 10, action: str = "permit"):
    """
    Generates standard Cisco ACL permit or deny command for a network.
    """
    try:
        network = ipaddress.IPv4Network(network_str, strict=False)
        wildcard = str(network.hostmask)
        net_addr = str(network.network_address)
        
        acl_line = f"access-list {acl_number} {action} {net_addr} {wildcard}"
        return {
            "success": True,
            "acl": acl_line,
            "network": net_addr,
            "wildcard": wildcard
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def generate_ospf_statement(network_str: str, area: int = 0, process_id: int = 1):
    """
    Generates OSPF network statement.
    """
    try:
        network = ipaddress.IPv4Network(network_str, strict=False)
        wildcard = str(network.hostmask)
        net_addr = str(network.network_address)
        
        config = [
            f"router ospf {process_id}",
            f" network {net_addr} {wildcard} area {area}"
        ]
        return {
            "success": True,
            "ospf_commands": config,
            "statement": f"network {net_addr} {wildcard} area {area}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
