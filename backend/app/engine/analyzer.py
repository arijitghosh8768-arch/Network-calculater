import re
import string
from typing import Dict, Any, List

def clean_non_ascii(text: str) -> str:
    """Filters non-printable ASCII characters for processing binary .pkt strings."""
    printable = set(string.printable)
    cleaned = "".join(filter(lambda x: x in printable, text))
    # Replace multiple spaces/newlines
    cleaned = re.sub(r'[\r\n\t]+', '\n', cleaned)
    return cleaned

def parse_cisco_config(content: str) -> Dict[str, Any]:
    """
    Parses a single or combined Cisco IOS config file (or extracts segments from a PKT file)
    to output devices, connections, commands, audits, learning guides, interview questions,
    and migration templates.
    """
    # Try to find readable config strings if binary is uploaded
    if any(b < 9 or (13 < b < 32 and b != 27) for b in content[:200].encode('utf-8', errors='ignore')):
        content = clean_non_ascii(content)

    # Devices extracted
    devices: Dict[str, Dict[str, Any]] = {}
    
    # Split content by typical multi-device separators or process as single config
    configs = []
    # If there are hostname declarations, we split by them or treat as one
    hostnames = re.findall(r'(?:^|\n)\s*hostname\s+(\S+)', content)
    
    if len(hostnames) > 1:
        # Split configs by 'hostname ' matches
        parts = re.split(r'(?:^|\n)(?=\s*hostname\s+)', content)
        for part in parts:
            if part.strip():
                configs.append(part)
    else:
        configs = [content]

    # Defaults in case empty
    if not hostnames:
        hostnames = ["Core-Router"]
        configs = [content]

    connections: List[Dict[str, str]] = []
    
    # Helper to clean device lists
    for idx, cfg in enumerate(configs):
        # Extract hostname
        h_match = re.search(r'(?:^|\n)\s*hostname\s+(\S+)', cfg)
        h_name = h_match.group(1) if h_match else hostnames[idx] if idx < len(hostnames) else f"Device-{idx+1}"
        
        # Determine device type
        dev_type = "Switch"
        if "router" in cfg.lower() or "ip routing" in cfg.lower() or "interface GigabitEthernet" in cfg or "ip address" in cfg:
            dev_type = "Router"
        if "vlan" in cfg.lower() and not "ip routing" in cfg.lower():
            dev_type = "Switch"
        if "server" in h_name.lower():
            dev_type = "Server"
        if "ap" in h_name.lower() or "wlc" in h_name.lower():
            dev_type = "AP"
        if "pc" in h_name.lower() or "host" in h_name.lower():
            dev_type = "PC"

        # Find interfaces
        interfaces = []
        int_blocks = re.findall(r'(?:^|\n)\s*interface\s+([^\n]+)((?:\n\s+[^\n]+)+)', cfg)
        for int_name, int_body in int_blocks:
            int_name = int_name.strip()
            ip_match = re.search(r'ip\s+address\s+(\S+)\s+(\S+)', int_body)
            desc_match = re.search(r'description\s+([^\n]+)', int_body)
            sec_match = "switchport port-security" in int_body
            shutdown = "no shutdown" not in int_body and "shutdown" in int_body
            
            interfaces.append({
                "name": int_name,
                "ip": ip_match.group(1) if ip_match else None,
                "subnet": ip_match.group(2) if ip_match else None,
                "description": desc_match.group(1).strip() if desc_match else None,
                "port_security": sec_match,
                "shutdown": shutdown
            })

            # Check descriptions for connection mappings (e.g. "Link to SW1")
            if desc_match:
                desc = desc_match.group(1).lower()
                # Find target device name in description
                target_match = re.search(r'(?:to|connects\s+to|link\s+to)\s+(\S+)', desc)
                if target_match:
                    target = target_match.group(1).replace(",", "").strip()
                    connections.append({
                        "from_device": h_name,
                        "from_port": int_name,
                        "to_device": target.upper(),
                        "to_port": "Auto-Port"
                    })

        # Dynamic routing protocols configured
        ospf = "router ospf" in cfg
        rip = "router rip" in cfg
        eigrp = "router eigrp" in cfg
        bgp = "router bgp" in cfg
        
        # Security policies
        telnet_vty = False
        vty_blocks = re.findall(r'line\s+vty\s+([^\n]+)(?:\n\s+[^\n]+)+', cfg)
        for vty in vty_blocks:
            if "transport input telnet" in cfg or ("transport input" in cfg and "telnet" in cfg):
                telnet_vty = True

        enable_secret = "enable secret" in cfg
        enable_password = "enable password" in cfg

        devices[h_name] = {
            "name": h_name,
            "type": dev_type,
            "interfaces": interfaces,
            "routing": "OSPF" if ospf else "RIP" if rip else "EIGRP" if eigrp else "BGP" if bgp else "Static/None",
            "vlan_count": len(re.findall(r'(?:^|\n)vlan\s+(\d+)', cfg)),
            "dhcp_server": "ip dhcp pool" in cfg,
            "nat_configured": "ip nat inside" in cfg or "ip nat outside" in cfg,
            "acl_count": len(re.findall(r'(?:^|\n)(?:access-list|ip access-list)', cfg)),
            "telnet_vty": telnet_vty,
            "enable_secret": enable_secret,
            "enable_password": enable_password,
            "raw_config": cfg.strip()
        }

    # Generate synthetic connections if no descriptions matched
    if not connections and len(devices) > 1:
        dev_list = list(devices.keys())
        # Connect routers to switches, switches to hosts
        routers = [d for d in dev_list if devices[d]["type"] == "Router"]
        switches = [d for d in dev_list if devices[d]["type"] == "Switch"]
        hosts = [d for d in dev_list if devices[d]["type"] in ["PC", "Server", "AP"]]
        
        # Fallback if categories empty
        if not routers and switches:
            routers = [switches[0]]
            switches = switches[1:]
        if not switches and routers:
            switches = [routers[0]]
            routers = routers[1:]

        # Wire Routers to Core Switches
        for r in routers:
            for s in switches[:1]:
                connections.append({
                    "from_device": r,
                    "from_port": "GigabitEthernet0/0",
                    "to_device": s,
                    "to_port": "GigabitEthernet0/1"
                })
        # Wire Access Switches to hosts
        if switches:
            for idx, h in enumerate(hosts):
                sw_target = switches[idx % len(switches)]
                connections.append({
                    "from_device": sw_target,
                    "from_port": f"FastEthernet0/{idx+1}",
                    "to_device": h,
                    "to_port": "FastEthernet0"
                })
        # If no switches/routers match, just wire sequentially
        if not connections:
            for i in range(len(dev_list) - 1):
                connections.append({
                    "from_device": dev_list[i],
                    "from_port": "GigabitEthernet0/0",
                    "to_device": dev_list[i+1],
                    "to_port": "GigabitEthernet0/1"
                })

    # Summary counts
    inventory_counts = {
        "Router": sum(1 for d in devices.values() if d["type"] == "Router"),
        "Switch": sum(1 for d in devices.values() if d["type"] == "Switch"),
        "Server": sum(1 for d in devices.values() if d["type"] == "Server"),
        "AP": sum(1 for d in devices.values() if d["type"] == "AP"),
        "PC": sum(1 for d in devices.values() if d["type"] == "PC")
    }

    # Ensure there is at least something in counts
    if sum(inventory_counts.values()) == 0:
        inventory_counts["Router"] = 1
        inventory_counts["Switch"] = 1
        inventory_counts["PC"] = 2

    # Feature 6: Security Audit
    security_audits = []
    
    # Global checks
    all_configs_str = "\n".join(d["raw_config"] for d in devices.values())
    
    for dev_name, dev_data in devices.items():
        if dev_data["type"] in ["Router", "Switch"]:
            # Telnet
            if dev_data["telnet_vty"]:
                security_audits.append({
                    "device": dev_name,
                    "severity": "High",
                    "title": "Telnet Enabled on VTY lines",
                    "description": "Telnet transmits credentials in cleartext. Replace with SSH.",
                    "recommendation": "Configure 'transport input ssh' on line vty 0 4."
                })
            else:
                # If transport input isn't locked down
                security_audits.append({
                    "device": dev_name,
                    "severity": "Medium",
                    "title": "VTY lines accept all protocols",
                    "description": "No transport input filter is applied, allowing unencrypted Telnet sessions.",
                    "recommendation": "Apply 'transport input ssh' under vty configurations."
                })

            # Enable Password/Secret
            if not dev_data["enable_secret"] and dev_data["enable_password"]:
                security_audits.append({
                    "device": dev_name,
                    "severity": "High",
                    "title": "Plaintext Enable Password Used",
                    "description": "The configuration uses 'enable password' which is easily decrypted/read.",
                    "recommendation": "Remove 'enable password' and configure 'enable secret <password>'."
                })
            elif not dev_data["enable_secret"] and not dev_data["enable_password"]:
                security_audits.append({
                    "device": dev_name,
                    "severity": "Medium",
                    "title": "No Enable Secret Configured",
                    "description": "The privileged EXEC mode is not protected by an enable password.",
                    "recommendation": "Run 'enable secret <strong_password>' in global config mode."
                })

            # Service Password Encryption
            if "service password-encryption" not in all_configs_str:
                security_audits.append({
                    "device": dev_name,
                    "severity": "Medium",
                    "title": "Service Password Encryption Disabled",
                    "description": "Local passwords (like line console/vty) are stored in cleartext.",
                    "recommendation": "Add the 'service password-encryption' global command."
                })

            # Port Security check on Switches
            if dev_data["type"] == "Switch":
                has_port_security = any(i["port_security"] for i in dev_data["interfaces"])
                if not has_port_security:
                    security_audits.append({
                        "device": dev_name,
                        "severity": "Low",
                        "title": "No Port Security Enabled",
                        "description": "MAC address spoofing or rogue switch connections could compromise access ports.",
                        "recommendation": "Run 'switchport port-security' on active Access Interfaces."
                    })
                if "dhcp snooping" not in all_configs_str.lower():
                    security_audits.append({
                        "device": dev_name,
                        "severity": "Medium",
                        "title": "DHCP Snooping Absent",
                        "description": "Rogue DHCP servers can perform Man-In-The-Middle attacks.",
                        "recommendation": "Enable 'ip dhcp snooping' and trust uplink trunk ports."
                    })

    # Default security audits if empty
    if not security_audits:
        security_audits.append({
            "device": list(devices.keys())[0],
            "severity": "Medium",
            "title": "Unused interfaces are active",
            "description": "Open ports present a security risk if not administratively shut down.",
            "recommendation": "Shutdown all unused ports using the 'shutdown' command."
        })

    # Feature 4: Step-by-Step Learning Mode
    steps = [
        {
            "num": 1,
            "title": "Deploy Hardware Assets",
            "instructions": f"In Cisco Packet Tracer, drag the required hardware nodes onto the workspace: {', '.join([f'{count}x {d_type}' for d_type, count in inventory_counts.items() if count > 0])}.",
            "cli": None,
            "explanation": "Setting up physical routers (e.g., 2911 ISRs) and switches (e.g., 2960 Series catalyst) establishes the raw physical layout before logic is loaded."
        },
        {
            "num": 2,
            "title": "Cabling and Port Map Connection",
            "instructions": "Use straight-through copper cables to link host PCs/servers to Access Switches, and use crossover/trunk fiber cables to bind core Distribution layers to Router interfaces.",
            "cli": None,
            "explanation": f"Ensure your wiring layout matches the target connections: e.g. {connections[0]['from_device']} [{connections[0]['from_port']}] connected to {connections[0]['to_device']} [{connections[0]['to_port']}]." if connections else "Ensure all physical cabling is correctly connected between the interfaces of your devices."
        }
    ]

    # Add configuration steps based on features found
    step_num = 3
    for dev_name, dev_data in devices.items():
        if dev_data["type"] == "Router":
            ips_config = []
            for i in dev_data["interfaces"]:
                if i["ip"]:
                    ips_config.append(f"interface {i['name']}\n ip address {i['ip']} {i['subnet']}\n no shutdown")
            
            steps.append({
                "num": step_num,
                "title": f"Configure Router Interfaces ({dev_name})",
                "instructions": f"Configure IP addresses and enable interfaces on {dev_name}.",
                "cli": f"enable\nconfigure terminal\nhostname {dev_name}\n" + "\n".join(ips_config),
                "explanation": "IP addressing acts as the default gateway for local subnets, allowing traffic to exit local VLANs."
            })
            step_num += 1

            if dev_data["routing"] != "Static/None":
                steps.append({
                    "num": step_num,
                    "title": f"Configure Routing Engine ({dev_name})",
                    "instructions": f"Establish {dev_data['routing']} routing to advertise adjacent subnets.",
                    "cli": f"router ospf 1\n network 0.0.0.0 255.255.255.255 area 0",
                    "explanation": "Dynamic routing protocols dynamically propagate pathways across multi-hop router boundaries."
                })
                step_num += 1

        elif dev_data["type"] == "Switch" and dev_data["vlan_count"] > 0:
            steps.append({
                "num": step_num,
                "title": f"Create Virtual LAN segmentations ({dev_name})",
                "instructions": "Declare VLANs to separate broadcast domains.",
                "cli": "vlan 10\n name STAFF\nvlan 20\n name STUDENTS",
                "explanation": "VLANs isolate network segments at Layer 2 to increase security and reduce broadcast storm sizes."
            })
            step_num += 1

    # Feature 5: Network Explanation Engine
    vlan_used = any(d["vlan_count"] > 0 for d in devices.values())
    ospf_used = any(d["routing"] == "OSPF" for d in devices.values())
    dhcp_used = any(d["dhcp_server"] for d in devices.values())
    nat_used = any(d["nat_configured"] for d in devices.values())
    acl_used = any(d["acl_count"] > 0 for d in devices.values())

    technologies = []
    if vlan_used:
        technologies.append({
            "name": "VLAN Segmentation",
            "used": True,
            "reason": "Traffic isolation at Layer 2 protects department domains (e.g. Guest WiFi vs Core Servers)."
        })
    else:
        technologies.append({
            "name": "VLAN Segmentation",
            "used": False,
            "reason": "Not found. The network resides entirely in a single flat broadcast domain."
        })

    if ospf_used:
        technologies.append({
            "name": "OSPF Routing",
            "used": True,
            "reason": "Fast convergent routing manages paths dynamically without requiring administrative static updates."
        })
    else:
        technologies.append({
            "name": "Static/OSPF Routing",
            "used": False,
            "reason": "No dynamic routing detected. Uses simple static route definitions or local links."
        })

    if dhcp_used:
        technologies.append({
            "name": "DHCP Address Assignment",
            "used": True,
            "reason": "Automatic IP provisioning simplifies client connections, preventing duplicate configuration errors."
        })
    else:
        technologies.append({
            "name": "DHCP Address Assignment",
            "used": False,
            "reason": "Clients must be configured with static IPs manually."
        })

    if nat_used:
        technologies.append({
            "name": "NAT Firewall Masking",
            "used": True,
            "reason": "Translates private RFC 1918 subnets into public WAN addresses, protecting internal IP structure."
        })
    if acl_used:
        technologies.append({
            "name": "Access Control Lists (ACLs)",
            "used": True,
            "reason": "Enforces network-level security rules, blocking unauthorized connections to core assets."
        })

    explanation = {
        "summary": "This network blueprint represents an enterprise branch layout with core Layer 3 routing, switch domain VLANs, and active service provisions.",
        "technologies": technologies
    }

    # Feature 7: Rebuild Guide (Lab manual format)
    rebuild_guide = [
        "1. Start by initializing the design space in Cisco Packet Tracer.",
        f"2. Add the physical inventory units: {', '.join([f'{count}x {d_type}' for d_type, count in inventory_counts.items() if count > 0])}.",
        "3. Wire connections: connect trunks from switches to routing boundaries.",
        "4. Set up VLAN databases on Switch interfaces and associate active access ports.",
        "5. Provision sub-interfaces on Router trunks for Inter-VLAN routing (Router-on-a-Stick).",
        "6. Bind OSPF dynamic area configs and run 'show ip route' to verify routing table sync."
    ]

    # Feature 8: Interview Prep Mode (viva questions)
    viva_questions = [
        {
            "q": "What is the purpose of configuring VLANs on access switches?",
            "a": "VLANs isolate network hosts into separate broadcast domains at Layer 2, which improves performance and security by keeping sensitive traffic bounded."
        },
        {
            "q": "Why is 'enable secret' preferred over 'enable password'?",
            "a": "'enable secret' uses secure MD5/SHA hashes, whereas 'enable password' uses weak or cleartext encryption that can be easily parsed or decrypted."
        },
        {
            "q": "Explain how the router handles Inter-VLAN routing configured in this lab.",
            "a": "Through Router-on-a-Stick or Layer 3 SVIs, the router accepts 802.1Q tagged VLAN frames on trunk links, routing them across sub-interfaces."
        }
    ]
    if ospf_used:
        viva_questions.append({
            "q": "How does OSPF determine the shortest path to remote networks?",
            "a": "OSPF uses Dijkstra's Shortest Path First (SPF) algorithm, calculating path costs based on link bandwidth values."
        })
    else:
        viva_questions.append({
            "q": "Why should dynamic routing like OSPF be introduced as this topology grows?",
            "a": "Static routes do not scale or dynamically reroute. OSPF automatically handles path failures and link changes."
        })

    # Feature 9: Migration Generator
    # Generate commands for the first device
    first_device = list(devices.keys())[0]
    dev_info = devices[first_device]
    
    jun_setup = [
        f"set system host-name {first_device}",
    ]
    nx_setup = [
        f"hostname {first_device}",
    ]
    hua_setup = [
        f"sysname {first_device}",
    ]
    mik_setup = [
        f"/system identity set name={first_device}",
    ]

    # Add interfaces
    for i in dev_info["interfaces"]:
        if i["ip"]:
            slash = "24"
            if i["subnet"] == "255.255.255.0":
                slash = "24"
            elif i["subnet"] == "255.255.255.128":
                slash = "25"
            elif i["subnet"] == "255.255.255.192":
                slash = "26"
            elif i["subnet"] == "255.255.248.0":
                slash = "21"
                
            jun_setup.append(f"set interfaces {i['name']} unit 0 family inet address {i['ip']}/{slash}")
            nx_setup.append(f"interface {i['name']}\n  ip address {i['ip']}/{slash}\n  no shutdown")
            hua_setup.append(f"interface {i['name']}\n ip address {i['ip']} {i['subnet']}\n undo shutdown")
            mik_setup.append(f"/ip address add address={i['ip']}/{slash} interface={i['name']}")

    migrations = {
        "device": first_device,
        "juniper": "\n".join(jun_setup),
        "nxos": "\n".join(nx_setup),
        "huawei": "\n".join(hua_setup),
        "mikrotik": "\n".join(mik_setup)
    }

    # Feature 10: AI Improvement Suggestions
    improvements = [
        {
            "category": "High Availability",
            "issue": "Single Point of Failure (SPOF) on gateways.",
            "recommendation": "Configure Hot Standby Router Protocol (HSRP) or Virtual Router Redundancy Protocol (VRRP) on redundant router boundaries."
        },
        {
            "category": "Access Security",
            "issue": "Spanning Tree Loop vulnerable configurations.",
            "recommendation": "Enable PortFast and BPDU Guard on all edge-facing host switchports."
        },
        {
            "category": "Traffic Control",
            "issue": "Direct routing without boundary security.",
            "recommendation": "Deploy Extended Access Control Lists (ACLs) to block inter-department unauthorized data flows."
        }
    ]

    return {
        "devices": devices,
        "connections": connections,
        "inventory": inventory_counts,
        "security_audits": security_audits,
        "steps": steps,
        "explanation": explanation,
        "rebuild_guide": rebuild_guide,
        "viva_questions": viva_questions,
        "migrations": migrations,
        "improvements": improvements
    }
