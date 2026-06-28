import random
import ipaddress

def generate_quiz_questions(count: int = 5):
    """
    Generates dynamic subnetting quiz questions with 4 choices.
    """
    questions = []
    question_types = [
        "network_address",
        "broadcast_address",
        "usable_hosts",
        "subnet_mask",
        "class_detector"
    ]
    
    # Sample private/public ranges to generate from
    base_networks = [
        "192.168.1.0/24", "192.168.10.0/24", "172.16.0.0/16", "10.0.0.0/8",
        "192.168.0.0/25", "10.10.10.0/26", "172.20.0.0/22", "192.168.5.0/27",
        "10.0.0.0/29", "172.30.0.0/30", "192.168.100.0/28"
    ]
    
    for i in range(count):
        q_type = random.choice(question_types)
        net_str = random.choice(base_networks)
        net = ipaddress.IPv4Network(net_str, strict=False)
        
        if q_type == "network_address":
            # Select a random host in this network
            hosts = list(net.hosts())
            if not hosts:
                ip_val = net.network_address
            else:
                ip_val = random.choice(hosts)
                
            correct = str(net.network_address)
            
            # Generate fake options (distractors)
            fake1 = str(ipaddress.IPv4Address(int(net.network_address) + 1))
            fake2 = str(ipaddress.IPv4Address(int(net.network_address) - 1)) if int(net.network_address) > 0 else "255.255.255.255"
            fake3 = str(net.broadcast_address)
            choices = list(set([correct, fake1, fake2, fake3]))
            while len(choices) < 4:
                choices.append(str(ipaddress.IPv4Address(random.randint(1, 4294967295))))
                choices = list(set(choices))
            random.shuffle(choices)
            
            questions.append({
                "id": i + 1,
                "type": q_type,
                "question": f"Given the IP address {ip_val} and prefix length /{net.prefixlen}, what is the network address?",
                "choices": choices,
                "correct": correct
            })
            
        elif q_type == "broadcast_address":
            correct = str(net.broadcast_address)
            fake1 = str(net.network_address)
            fake2 = str(ipaddress.IPv4Address(int(net.broadcast_address) - 1))
            fake3 = str(ipaddress.IPv4Address(int(net.broadcast_address) + 1)) if int(net.broadcast_address) < 4294967295 else "0.0.0.0"
            choices = list(set([correct, fake1, fake2, fake3]))
            while len(choices) < 4:
                choices.append(str(ipaddress.IPv4Address(random.randint(1, 4294967295))))
                choices = list(set(choices))
            random.shuffle(choices)
            
            questions.append({
                "id": i + 1,
                "type": q_type,
                "question": f"Find the broadcast address for the network {net.network_address}/{net.prefixlen}.",
                "choices": choices,
                "correct": correct
            })
            
        elif q_type == "usable_hosts":
            hosts = list(net.hosts())
            correct = str(len(hosts))
            fake1 = str(net.num_addresses)
            fake2 = str(len(hosts) + 2)
            fake3 = str(max(0, len(hosts) - 2))
            choices = list(set([correct, fake1, fake2, fake3]))
            while len(choices) < 4:
                choices.append(str(random.randint(2, 65536)))
                choices = list(set(choices))
            random.shuffle(choices)
            
            questions.append({
                "id": i + 1,
                "type": q_type,
                "question": f"How many usable host IP addresses are available in a /{net.prefixlen} network?",
                "choices": choices,
                "correct": correct
            })
            
        elif q_type == "subnet_mask":
            correct = str(net.netmask)
            # Generate fake masks
            fake1 = "255.255.255.0" if correct != "255.255.255.0" else "255.255.255.128"
            fake2 = "255.255.255.240" if correct != "255.255.255.240" else "255.255.255.192"
            fake3 = "255.255.0.0" if correct != "255.255.0.0" else "255.255.128.0"
            choices = list(set([correct, fake1, fake2, fake3]))
            random.shuffle(choices)
            
            questions.append({
                "id": i + 1,
                "type": q_type,
                "question": f"What is the subnet mask representation of a /{net.prefixlen} network?",
                "choices": choices,
                "correct": correct
            })
            
        elif q_type == "class_detector":
            first_octet = int(str(net.network_address).split('.')[0])
            if 1 <= first_octet <= 126:
                correct = "Class A"
            elif 128 <= first_octet <= 191:
                correct = "Class B"
            elif 192 <= first_octet <= 223:
                correct = "Class C"
            else:
                correct = "Class D/E"
                
            choices = ["Class A", "Class B", "Class C", "Class D/E"]
            
            questions.append({
                "id": i + 1,
                "type": q_type,
                "question": f"What network class does the IP address {net.network_address} belong to?",
                "choices": choices,
                "correct": correct
            })
            
    return questions
