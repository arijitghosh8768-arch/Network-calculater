import ipaddress
import math

def calculate_vlsm(base_network_str: str, requirements: list):
    """
    Allocates subnets using Variable Length Subnet Masking (VLSM).
    requirements is a list of dicts: [{"name": str, "hosts": int}]
    """
    try:
        base_net = ipaddress.IPv4Network(base_network_str, strict=False)
        
        # Sort requirements descending by host count
        # Keep track of original order or index to return nice response
        reqs = []
        for i, req in enumerate(requirements):
            name = req.get("name", f"Subnet {i+1}")
            hosts = int(req.get("hosts", 0))
            reqs.append({"id": i, "name": name, "hosts": hosts})
            
        reqs.sort(key=lambda x: x["hosts"], reverse=True)
        
        current_ip = int(base_net.network_address)
        allocated_subnets = []
        
        for req in reqs:
            hosts_needed = req["hosts"]
            
            # Need network + broadcast + host addresses
            total_ips = hosts_needed + 2
            
            # Find the smallest power of 2 >= total_ips
            if total_ips <= 2:
                # Minimum allocation is /30 or /31 depending on context, we'll use power of 2
                power_of_2 = 4
            else:
                power_of_2 = 2 ** math.ceil(math.log2(total_required_ips := total_ips))
                
            cidr = 32 - int(math.log2(power_of_2))
            
            # Align the current_ip to the boundary of power_of_2
            if current_ip % power_of_2 != 0:
                current_ip = ((current_ip // power_of_2) + 1) * power_of_2
                
            subnet_net = ipaddress.IPv4Network(f"{ipaddress.IPv4Address(current_ip)}/{cidr}")
            
            # Check if we have overrun the base network
            if subnet_net.broadcast_address > base_net.broadcast_address:
                return {
                    "success": False,
                    "error": f"Insufficient address space in base network {base_network_str} to satisfy requirements starting from {req['name']} ({hosts_needed} hosts)"
                }
                
            hosts = list(subnet_net.hosts())
            first_host = str(hosts[0]) if len(hosts) > 0 else "N/A"
            last_host = str(hosts[-1]) if len(hosts) > 0 else "N/A"
            
            allocated_subnets.append({
                "id": req["id"],
                "name": req["name"],
                "hosts_requested": hosts_needed,
                "network_address": str(subnet_net.network_address),
                "broadcast_address": str(subnet_net.broadcast_address),
                "netmask": str(subnet_net.netmask),
                "cidr": cidr,
                "first_host": first_host,
                "last_host": last_host,
                "usable_hosts": len(hosts),
                "total_hosts": subnet_net.num_addresses
            })
            
            # Move to next block
            current_ip = int(subnet_net.broadcast_address) + 1
            
        return {
            "success": True,
            "base_network": base_network_str,
            "allocated_subnets": sorted(allocated_subnets, key=lambda x: x["id"])
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
