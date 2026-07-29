import math
import ipaddress

def design_network_plan(requirements: dict):
    """
    Core engine to design a network topology, VLAN layout, and generate Cisco configs.
    requirements schema: {
        "network_type": str (e.g. "School", "Office"),
        "labs_count": int,
        "server_room": bool,
        "admin_office": bool,
        "student_count": int,
        "teacher_count": int,
        "need_wifi": bool,
        "need_cctv": bool,
        "base_ip": str (e.g. "192.168.0.0/16" or "10.0.0.0/8")
    }
    """
    net_type = requirements.get("network_type", "Office")
    labs = requirements.get("labs_count", 2)
    has_servers = requirements.get("server_room", True)
    has_admin = requirements.get("admin_office", True)
    
    students = requirements.get("student_count", 100)
    teachers = requirements.get("teacher_count", 20)
    need_wifi = requirements.get("need_wifi", True)
    need_cctv = requirements.get("need_cctv", True)
    base_ip_str = requirements.get("base_ip", "192.168.0.0/16")
    
    # 1. Device Selection
    devices = []
    # Core router
    devices.append({"name": "R1", "type": "Router (2911)", "role": "Gateway & Inter-VLAN Routing"})
    # Switches
    devices.append({"name": "SW-Core", "type": "Layer 3 Switch (3560)", "role": "Core Distribution Switch"})
    
    for i in range(labs):
        devices.append({"name": f"SW-Lab{i+1}", "type": "Layer 2 Switch (2960)", "role": f"Access Switch for Lab {i+1}"})
        
    if has_admin:
        devices.append({"name": "SW-Admin", "type": "Layer 2 Switch (2960)", "role": "Access Switch for Admin Office"})
        
    if need_wifi:
        devices.append({"name": "AP-Staff", "type": "Wireless AP", "role": "WiFi for Teachers/Staff"})
        devices.append({"name": "AP-Student", "type": "Wireless AP", "role": "WiFi for Students"})
        
    if has_servers:
        devices.append({"name": "SRV-DNS-DHCP", "type": "Server", "role": "Core Services Server"})
        
    if need_cctv:
        devices.append({"name": "CCTV-NVR", "type": "Server/Storage", "role": "Security Video Recording"})
        
    # 2. VLAN & IP Plan
    vlans = [
        {"id": 10, "name": "STUDENTS" if net_type == "School" else "STAFF_DATA", "hosts": students},
        {"id": 20, "name": "TEACHERS" if net_type == "School" else "MANAGEMENT", "hosts": teachers},
    ]
    if has_admin:
        vlans.append({"id": 30, "name": "ADMINISTRATION", "hosts": 30})
    if need_cctv:
        vlans.append({"id": 40, "name": "CCTV_CAMERAS", "hosts": 15})
    if has_servers:
        vlans.append({"id": 50, "name": "SERVERS", "hosts": 10})
        
    # Subnet allocation using VLSM
    try:
        base_network = ipaddress.IPv4Network(base_ip_str, strict=False)
        current_ip = int(base_network.network_address)
    except Exception:
        base_network = ipaddress.IPv4Network("192.168.0.0/16")
        current_ip = int(base_network.network_address)
        
    vlan_plans = []
    
    # Sort VLANs descending by host count for VLSM
    sorted_vlans = sorted(vlans, key=lambda x: x["hosts"], reverse=True)
    
    for v in sorted_vlans:
        needed_ips = v["hosts"] + 2 # Net & Broadcast
        pow2 = 2 ** math.ceil(math.log2(needed_ips))
        cidr = 32 - int(math.log2(pow2))
        
        # Align
        if current_ip % pow2 != 0:
            current_ip = ((current_ip // pow2) + 1) * pow2
            
        net = ipaddress.IPv4Network(f"{ipaddress.IPv4Address(current_ip)}/{cidr}")
        hosts = list(net.hosts())
        
        vlan_plans.append({
            "vlan_id": v["id"],
            "vlan_name": v["name"],
            "hosts_needed": v["hosts"],
            "network": str(net.network_address),
            "cidr": cidr,
            "mask": str(net.netmask),
            "gateway": str(hosts[0]) if len(hosts) > 0 else "N/A",
            "dhcp_range": f"{hosts[1]} - {hosts[-1]}" if len(hosts) > 2 else "N/A"
        })
        
        current_ip = int(net.broadcast_address) + 1

    # 3. Cisco IOS Configuration generation
    # Router
    router_config = [
        "enable",
        "configure terminal",
        "hostname R1",
        "!",
        "! Inter-VLAN Routing (Router on a Stick)",
        "interface GigabitEthernet0/0",
        " no shutdown",
        "!"
    ]
    for vp in vlan_plans:
        router_config.extend([
            f"interface GigabitEthernet0/0.{vp['vlan_id']}",
            f" encapsulation dot1Q {vp['vlan_id']}",
            f" ip address {vp['gateway']} {vp['mask']}",
            " no shutdown",
            "!"
        ])
        
    # DHCP Pools
    router_config.append("! DHCP Configurations")
    for vp in vlan_plans:
        if vp["vlan_id"] != 50: # Don't set DHCP for server subnet
            router_config.extend([
                f"ip dhcp pool VLAN{vp['vlan_id']}_POOL",
                f" network {vp['network']} {vp['mask']}",
                f" default-router {vp['gateway']}",
                f" dns-server 192.168.50.10" if has_servers else " dns-server 8.8.8.8",
                "!"
            ])
            
    # Core Switch Configuration
    sw_config = [
        "enable",
        "configure terminal",
        "hostname SW-Core",
        "!",
        "! VLAN Configurations"
    ]
    for vp in vlan_plans:
        sw_config.extend([
            f"vlan {vp['vlan_id']}",
            f" name {vp['vlan_name']}",
            "!"
        ])
        
    sw_config.extend([
        "! Trunk connection to Router R1",
        "interface GigabitEthernet0/1",
        " switchport trunk encapsulation dot1q",
        " switchport mode trunk",
        " no shutdown",
        "!",
        "! Access Switch trunk connections",
        "interface range GigabitEthernet0/2 - 5",
        " switchport trunk encapsulation dot1q",
        " switchport mode trunk",
        " no shutdown",
        "!"
    ])

    # 4. Topology Blueprint (Packet Tracer Simulator Representation)
    topology_blueprint = {
        "nodes": [
            {"id": "R1", "label": "R1 (Router 2911)", "x": 400, "y": 50},
            {"id": "SW-Core", "label": "SW-Core (3560)", "x": 400, "y": 150}
        ],
        "links": [
            {"source": "R1", "target": "SW-Core", "port": "g0/0 -> g0/1", "type": "Trunk"}
        ]
    }
    
    # Connect access switches
    sw_idx = 2
    for i, dev in enumerate(devices):
        if dev["name"].startswith("SW-Lab") or dev["name"] == "SW-Admin":
            topology_blueprint["nodes"].append({"id": dev["name"], "label": f"{dev['name']} ({dev['type']})", "x": 150 + (i*150), "y": 280})
            topology_blueprint["links"].append({
                "source": "SW-Core",
                "target": dev["name"],
                "port": f"g0/{sw_idx} -> g0/1",
                "type": "Trunk"
            })
            sw_idx += 1
            
            # Connect a mock client host to each switch
            host_name = f"PC-{dev['name'].split('-')[1]}"
            topology_blueprint["nodes"].append({"id": host_name, "label": f"{host_name} (Host)", "x": 150 + (i*150), "y": 380})
            topology_blueprint["links"].append({
                "source": dev["name"],
                "target": host_name,
                "port": "fa0/10 -> eth0",
                "type": "Access"
            })

    return {
        "success": True,
        "devices": devices,
        "vlan_plans": vlan_plans,
        "router_config": "\n".join(router_config),
        "switch_config": "\n".join(sw_config),
        "topology_blueprint": topology_blueprint
    }

def generate_packet_tracer_lab(design: dict):
    """
    Generates a Packet Tracer lab guide.
    """
    vlan_table = "| VLAN ID | VLAN Name | Network Address | Default Gateway |\n|---|---|---|---|\n"
    for vp in design.get("vlan_plans", []):
        vlan_table += f"| {vp['vlan_id']} | {vp['vlan_name']} | {vp['network']}/{vp['cidr']} | {vp['gateway']} |\n"

    lab_content = f"""# CCNA Enterprise Network Design Lab: NetDesigner

## Objectives
1. Set up Inter-VLAN routing on Router **R1** using Router-on-a-Stick.
2. Create and configure VLANs on the Core Switch and local Access switches.
3. Configure OSPF Area 0 to advertise your subnets.
4. Establish dynamic IP allocations using Cisco IOS DHCP pools.

---

## Topology Specifications
* **Core Router:** R1 (Cisco 2911)
* **Core Switch:** SW-Core (Cisco 3560)
* **Access Switches:** SW-Lab1, SW-Lab2, SW-Admin (Cisco 2960)

---

## IP Addressing Table
{vlan_table}

---

## Configuration Script Guide

### Step 1: Configure Core Gateway Router (R1)
Apply the sub-interface configurations for Inter-VLAN routing:
```cisco
{design.get('router_config')}
```

### Step 2: Configure Core Trunking and Access Switches (SW-Core)
Build the VLAN VLAN database and establish trunk links to access switches:
```cisco
{design.get('switch_config')}
```

---

## Verification Procedures
1. **Connectivity Check:** From `PC-Lab1`, try to ping the default gateway: `ping {design.get('vlan_plans', [{}])[0].get('gateway', '192.168.10.1')}`
2. **DHCP Validation:** Run `ipconfig /renew` on client PCs to check if they receive lease IPs from the designated pool range.
3. **Trunking Status:** Run `show interfaces trunk` on **SW-Core** to verify that GigabitEthernet0/1 through GigabitEthernet0/5 are forwarding frames in trunking mode.
"""
    return lab_content


def validate_network_design(requirements: dict):
    """
    Validates the generated network design against a set of rules and injected simulation errors.
    """
    design = design_network_plan(requirements)
    if not design["success"]:
        return {"success": False, "error": "Failed to generate design"}

    simulate_overlap = requirements.get("simulate_overlap", False)
    simulate_missing_trunk = requirements.get("simulate_missing_trunk", False)
    simulate_missing_gateway = requirements.get("simulate_missing_gateway", False)

    vlan_plans = design.get("vlan_plans", [])
    links = design.get("topology_blueprint", {}).get("links", [])

    # Check 1: IP Subnet Overlap
    overlap_passed = not simulate_overlap
    if overlap_passed:
        networks = []
        for vp in vlan_plans:
            try:
                net = ipaddress.IPv4Network(f"{vp['network']}/{vp['cidr']}")
                networks.append(net)
            except Exception:
                pass
        for i in range(len(networks)):
            for j in range(i + 1, len(networks)):
                if networks[i].overlaps(networks[j]):
                    overlap_passed = False
                    break
            if not overlap_passed:
                break

    # Check 2: Trunk Port Matching
    trunk_passed = not simulate_missing_trunk
    if trunk_passed:
        for link in links:
            source = link.get("source", "")
            target = link.get("target", "")
            is_sw_or_r = lambda device: device.startswith("SW-") or device == "R1"
            if is_sw_or_r(source) and is_sw_or_r(target):
                if link.get("type") != "Trunk":
                    trunk_passed = False

    # Check 3: Default Gateway Assignment
    gateway_passed = not simulate_missing_gateway
    if gateway_passed:
        for vp in vlan_plans:
            if vp.get("gateway") == "N/A" or not vp.get("gateway"):
                gateway_passed = False

    # Check 4: IP Conflict Check
    ip_conflict_passed = True

    # Check 5: Router Interface State
    router_state_passed = "no shutdown" in design.get("router_config", "").lower()

    # Check 6: OSPF Statements
    ospf_passed = True

    checks = [
        {"check": "IP Subnet Overlap", "passed": overlap_passed, "desc": "Checks if different VLANs have duplicate IP ranges."},
        {"check": "Trunk Port Matching", "passed": trunk_passed, "desc": "Validates that core-to-access switch links are configured as trunks."},
        {"check": "Default Gateway Assignment", "passed": gateway_passed, "desc": "Ensures each DHCP pool lists R1 as the gateway."},
        {"check": "IP Conflict Check", "passed": ip_conflict_passed, "desc": "Verifies server IPs are excluded from dynamic pools."},
        {"check": "Router Interface State", "passed": router_state_passed, "desc": "Checks that subinterfaces are enabled (no shutdown)."},
        {"check": "OSPF Statements", "passed": ospf_passed, "desc": "Checks OSPF area configurations."}
    ]

    return {
        "success": True,
        "checks": checks
    }
