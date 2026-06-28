import ipaddress

def parse_ipv4(ip_str: str, cidr: int):
    """
    Parses an IPv4 address and CIDR, calculating subnetting properties.
    """
    try:
        network = ipaddress.IPv4Network(f"{ip_str}/{cidr}", strict=False)
        ip_addr = ipaddress.IPv4Address(ip_str)
        
        # Calculate properties
        net_mask = str(network.netmask)
        wildcard_mask = str(network.hostmask)
        net_address = str(network.network_address)
        broadcast_address = str(network.broadcast_address)
        
        # Usable hosts
        hosts = list(network.hosts())
        if len(hosts) > 0:
            first_host = str(hosts[0])
            last_host = str(hosts[-1])
            usable_hosts = len(hosts)
        else:
            # For /31 or /32
            first_host = "N/A" if cidr == 32 else str(network.network_address)
            last_host = "N/A" if cidr == 32 else str(network.broadcast_address)
            usable_hosts = network.num_addresses
            
        total_hosts = network.num_addresses
        
        # Class Detector
        first_octet = int(ip_str.split('.')[0])
        ip_class = "Unknown"
        if 1 <= first_octet <= 126:
            ip_class = "A"
        elif 128 <= first_octet <= 191:
            ip_class = "B"
        elif 192 <= first_octet <= 223:
            ip_class = "C"
        elif 224 <= first_octet <= 239:
            ip_class = "D (Multicast)"
        elif 240 <= first_octet <= 255:
            ip_class = "E (Experimental)"
        elif first_octet == 127:
            ip_class = "A (Loopback)"

        # IP Type Detector
        ip_type = "Public"
        if ip_addr.is_private:
            ip_type = "Private"
        elif ip_addr.is_loopback:
            ip_type = "Loopback"
        elif ip_addr.is_link_local:
            ip_type = "APIPA (Link-Local)"
        elif ip_addr.is_multicast:
            ip_type = "Multicast"
        elif ip_addr.is_reserved:
            ip_type = "Reserved"
        elif ip_addr == network.broadcast_address:
            ip_type = "Broadcast"
            
        # Binary Visualizer data
        # We want to represent the IP address in binary, showing which bits are net and which are host.
        ip_bin = "".join(f"{int(o):08b}" for o in ip_str.split('.'))
        
        binary_octets = []
        for i in range(4):
            octet_bin = ip_bin[i*8:(i+1)*8]
            octet_details = []
            for j in range(8):
                bit_index = i * 8 + j
                is_net_bit = bit_index < cidr
                octet_details.append({
                    "bit": octet_bin[j],
                    "type": "network" if is_net_bit else "host",
                    "position": bit_index
                })
            binary_octets.append(octet_details)
            
        return {
            "success": True,
            "ip": ip_str,
            "cidr": cidr,
            "network_address": net_address,
            "broadcast_address": broadcast_address,
            "subnet_mask": net_mask,
            "wildcard_mask": wildcard_mask,
            "first_host": first_host,
            "last_host": last_host,
            "total_hosts": total_hosts,
            "usable_hosts": usable_hosts,
            "ip_class": ip_class,
            "ip_type": ip_type,
            "binary_octets": binary_octets
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def cidr_to_mask(cidr: int):
    try:
        network = ipaddress.IPv4Network(f"0.0.0.0/{cidr}", strict=False)
        return {"success": True, "mask": str(network.netmask)}
    except Exception as e:
        return {"success": False, "error": str(e)}

def mask_to_cidr(mask_str: str):
    try:
        # Convert mask to wildcard/network to get prefix length
        network = ipaddress.IPv4Network(f"0.0.0.0/{mask_str}", strict=False)
        return {"success": True, "cidr": network.prefixlen}
    except Exception as e:
        return {"success": False, "error": str(e)}
