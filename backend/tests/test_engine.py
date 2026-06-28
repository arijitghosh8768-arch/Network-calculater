import pytest
from app.engine.ipv4 import parse_ipv4, cidr_to_mask, mask_to_cidr
from app.engine.vlsm import calculate_vlsm
from app.engine.flsm import calculate_flsm

def test_parse_ipv4():
    res = parse_ipv4("192.168.1.50", 26)
    assert res["success"] is True
    assert res["network_address"] == "192.168.1.0"
    assert res["broadcast_address"] == "192.168.1.63"
    assert res["subnet_mask"] == "255.255.255.192"
    assert res["usable_hosts"] == 62
    assert res["ip_class"] == "C"
    assert res["ip_type"] == "Private"

def test_cidr_to_mask():
    res = cidr_to_mask(24)
    assert res["success"] is True
    assert res["mask"] == "255.255.255.0"

def test_mask_to_cidr():
    res = mask_to_cidr("255.255.255.240")
    assert res["success"] is True
    assert res["cidr"] == 28

def test_flsm_subnets():
    res = calculate_flsm("192.168.1.0/24", num_subnets=4)
    assert res["success"] is True
    assert res["new_cidr"] == 26
    assert len(res["subnets"]) == 4

def test_vlsm():
    reqs = [
        {"name": "Engineering", "hosts": 50},
        {"name": "Sales", "hosts": 25}
    ]
    res = calculate_vlsm("192.168.1.0/24", reqs)
    assert res["success"] is True
    subnets = res["allocated_subnets"]
    assert len(subnets) == 2
    # Sorted allocation validation
    assert subnets[0]["hosts_requested"] == 50
    assert subnets[0]["cidr"] == 26
    assert subnets[1]["hosts_requested"] == 25
    assert subnets[1]["cidr"] == 27
