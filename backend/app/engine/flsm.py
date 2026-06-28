import ipaddress
import math

def calculate_flsm(base_network_str: str, num_subnets: int = None, hosts_per_subnet: int = None):
    """
    Splits a base network using Fixed Length Subnet Masking.
    Either num_subnets or hosts_per_subnet must be provided.
    """
    try:
        base_net = ipaddress.IPv4Network(base_network_str, strict=False)
        base_prefix = base_net.prefixlen
        
        if num_subnets is not None and num_subnets > 0:
            # Calculate how many bits to borrow
            bits_to_borrow = math.ceil(math.log2(num_subnets))
            new_prefix = base_prefix + bits_to_borrow
        elif hosts_per_subnet is not None and hosts_per_subnet > 0:
            # Need hosts_per_subnet + 2 (for network and broadcast addresses)
            total_required_ips = hosts_per_subnet + 2
            host_bits = math.ceil(math.log2(total_required_ips))
            new_prefix = 32 - host_bits
        else:
            return {"success": False, "error": "Must specify either num_subnets or hosts_per_subnet"}
            
        if new_prefix > 32:
            return {"success": False, "error": "Subnet division exceeds IPv4 limits (/32)"}
        if new_prefix < base_prefix:
            return {"success": False, "error": f"Requested configuration would require a larger network than base network /{base_prefix}"}
            
        # Get all subnets
        subnets = list(base_net.subnets(new_prefix=new_prefix))
        
        subnets_data = []
        for i, sub in enumerate(subnets):
            # Limit returned list if too large to prevent response bloating
            if i >= 128:
                break
            hosts = list(sub.hosts())
            first_host = str(hosts[0]) if len(hosts) > 0 else "N/A"
            last_host = str(hosts[-1]) if len(hosts) > 0 else "N/A"
            subnets_data.append({
                "index": i + 1,
                "network_address": str(sub.network_address),
                "broadcast_address": str(sub.broadcast_address),
                "netmask": str(sub.netmask),
                "cidr": sub.prefixlen,
                "first_host": first_host,
                "last_host": last_host,
                "usable_hosts": len(hosts)
            })
            
        return {
            "success": True,
            "base_network": base_network_str,
            "new_cidr": new_prefix,
            "new_mask": str(subnets[0].netmask),
            "total_subnets_possible": len(subnets),
            "subnets": subnets_data,
            "truncated": len(subnets) > 128
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
