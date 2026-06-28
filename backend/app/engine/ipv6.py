import ipaddress

def parse_ipv6(ip_str: str, prefix_len: int = 64):
    """
    Parses an IPv6 address and CIDR prefix.
    """
    try:
        # If the input already has prefix, separate it
        if "/" in ip_str:
            parts = ip_str.split("/")
            ip_str = parts[0]
            prefix_len = int(parts[1])
            
        network = ipaddress.IPv6Network(f"{ip_str}/{prefix_len}", strict=False)
        ip_addr = ipaddress.IPv6Address(ip_str)
        
        # Compressed and Expanded forms
        compressed = str(ip_addr)
        expanded = ip_addr.exploded
        
        # Address Type detection
        address_type = "Global Unicast"
        if ip_addr.is_multicast:
            address_type = "Multicast"
        elif ip_addr.is_private:
            address_type = "Unique Local Address (ULA)"
        elif ip_addr.is_link_local:
            address_type = "Link-Local Address"
        elif ip_addr.is_loopback:
            address_type = "Loopback Address"
        elif ip_addr.is_unspecified:
            address_type = "Unspecified Address"
        elif ip_str.lower().startswith("2001:db8"):
            address_type = "Documentation Address"
            
        return {
            "success": True,
            "ip": ip_str,
            "prefix_len": prefix_len,
            "network_prefix": str(network.network_address),
            "address_type": address_type,
            "compressed_form": compressed,
            "expanded_form": expanded,
            "total_addresses": network.num_addresses,
            "is_link_local": ip_addr.is_link_local,
            "is_multicast": ip_addr.is_multicast,
            "is_loopback": ip_addr.is_loopback,
            "netmask": str(network.netmask)
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
