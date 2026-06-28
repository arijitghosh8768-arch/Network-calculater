from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# IPv4 Calculate
class IPv4Input(BaseModel):
    ip: str = Field(..., examples=["192.168.1.0"])
    cidr: int = Field(..., ge=0, le=32, examples=[24])

# CIDR/Mask convert
class MaskInput(BaseModel):
    mask: str

class CIDRInput(BaseModel):
    cidr: int

# VLSM
class SubnetRequirement(BaseModel):
    name: str
    hosts: int

class VLSMInput(BaseModel):
    base_network: str = Field(..., examples=["192.168.1.0/24"])
    requirements: List[SubnetRequirement]

# FLSM
class FLSMInput(BaseModel):
    base_network: str = Field(..., examples=["192.168.1.0/24"])
    num_subnets: Optional[int] = None
    hosts_per_subnet: Optional[int] = None

# IPv6
class IPv6Input(BaseModel):
    ip: str = Field(..., examples=["2001:db8::"])
    prefix_len: Optional[int] = Field(64, ge=0, le=128)

# Generators
class ACLInput(BaseModel):
    network: str
    acl_number: int = 10
    action: str = "permit"

class OSPFInput(BaseModel):
    network: str
    area: int = 0
    process_id: int = 1

# AI
class AIInput(BaseModel):
    query: str
    api_key: Optional[str] = None

# Quiz
class QuizScoreCreate(BaseModel):
    username: str
    score: int
    total: int

class QuizScoreResponse(BaseModel):
    id: int
    username: str
    score: int
    total: int
    percentage: float
    timestamp: datetime

    class Config:
        from_attributes = True

# Saved Plans
class SavedPlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    base_network: str
    plan_type: str
    plan_data: str

class SavedPlanResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    base_network: str
    plan_type: str
    plan_data: str
    timestamp: datetime

    class Config:
        from_attributes = True

# NetDesigner
class DesignerInput(BaseModel):
    network_type: str = "School"
    labs_count: int = 2
    server_room: bool = True
    admin_office: bool = True
    student_count: int = 100
    teacher_count: int = 20
    need_wifi: bool = True
    need_cctv: bool = True
    base_ip: str = "192.168.0.0/16"
    simulate_overlap: bool = False
    simulate_missing_trunk: bool = False
    simulate_missing_gateway: bool = False


# NetArchitect X
class ArchitectInput(BaseModel):
    company_type: str = "Hospital"
    floors: int = 3
    users: int = 500
    branches: int = 2
    need_wifi: bool = True
    need_voip: bool = True
    need_cctv: bool = True
    need_servers: bool = True
    need_guest: bool = True
    base_ip: str = "172.16.0.0/16"
    architecture_style: str = "Three-Tier"

class TranslateInput(BaseModel):
    cisco_config: str
    target_vendor: str

class TroubleshootInput(BaseModel):
    cli_log: str

class HeatmapInput(BaseModel):
    width: int = 80
    length: int = 120
    floors: int = 3


# Packet Tracer Analyzer
class AnalyzerInput(BaseModel):
    file_name: str
    file_content: str




