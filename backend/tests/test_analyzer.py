from app.engine.analyzer import parse_cisco_config

def test_parse_cisco_config_text():
    mock_config = """
    hostname R1
    interface GigabitEthernet0/0
     description Link to Switch-Core
     ip address 192.168.1.1 255.255.255.0
     no shutdown
    !
    router ospf 1
     network 192.168.1.0 0.0.0.255 area 0
    !
    line vty 0 4
     transport input telnet
    """
    
    result = parse_cisco_config(mock_config)
    
    assert "R1" in result["devices"]
    r1 = result["devices"]["R1"]
    assert r1["type"] == "Router"
    assert r1["routing"] == "OSPF"
    assert len(r1["interfaces"]) == 1
    assert r1["interfaces"][0]["ip"] == "192.168.1.1"
    
    # Inventory check
    assert result["inventory"]["Router"] >= 1
    
    # Security audits check (Telnet should be flagged)
    telnet_audits = [a for a in result["security_audits"] if "Telnet" in a["title"]]
    assert len(telnet_audits) > 0
    
    # Migration checks
    assert "juniper" in result["migrations"]
    assert "R1" in result["migrations"]["device"]
