from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from .database import engine, Base, get_db
from .models import QuizScore, SavedPlan
from .schemas import (
    IPv4Input, MaskInput, CIDRInput, VLSMInput, FLSMInput, IPv6Input,
    ACLInput, OSPFInput, AIInput, QuizScoreCreate, QuizScoreResponse,
    SavedPlanCreate, SavedPlanResponse, DesignerInput,
    ArchitectInput, TranslateInput, TroubleshootInput, HeatmapInput,
    AnalyzerInput
)
from .engine.ipv4 import parse_ipv4, cidr_to_mask, mask_to_cidr
from .engine.ipv6 import parse_ipv6
from .engine.vlsm import calculate_vlsm
from .engine.flsm import calculate_flsm
from .engine.generators import generate_cisco_acl, generate_ospf_statement, generate_wildcard
from .engine.designer import design_network_plan, generate_packet_tracer_lab, validate_network_design
from .quiz.questions import generate_quiz_questions
from .ai.planner import get_network_advice
from .engine.architect import (
    design_architect_plan, get_hld_lld_documents,
    calculate_wlan_heatmap, validate_architect_design, export_rzpkt_project
)
from .engine.vendors import translate_cisco_to_vendor
from .engine.troubleshooter import analyze_cli_logs
from .engine.analyzer import parse_cisco_config



# Create DB Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="NetCalc Pro API",
    description="Advanced Subnetting Engine, VLSM/FLSM Allocator, & Network Planning Assistant Suite",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- HOME/STATUS ---
@app.get("/")
def read_root():
    return {"message": "Welcome to NetCalc Pro API", "status": "online"}

# --- SUBNET ENGINE ENDPOINTS ---
@app.post("/api/calculate/ipv4")
def api_calculate_ipv4(data: IPv4Input):
    result = parse_ipv4(data.ip, data.cidr)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Invalid IP or CIDR"))
    return result

@app.post("/api/convert/cidr-to-mask")
def api_cidr_to_mask(data: CIDRInput):
    result = cidr_to_mask(data.cidr)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Invalid CIDR value"))
    return result

@app.post("/api/convert/mask-to-cidr")
def api_mask_to_cidr(data: MaskInput):
    result = mask_to_cidr(data.mask)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Invalid Subnet Mask"))
    return result

@app.post("/api/calculate/ipv6")
def api_calculate_ipv6(data: IPv6Input):
    result = parse_ipv6(data.ip, data.prefix_len or 64)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Invalid IPv6 address"))
    return result

@app.post("/api/calculate/vlsm")
def api_calculate_vlsm(data: VLSMInput):
    req_dicts = [{"name": r.name, "hosts": r.hosts} for r in data.requirements]
    result = calculate_vlsm(data.base_network, req_dicts)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "VLSM calculation error"))
    return result

@app.post("/api/calculate/flsm")
def api_calculate_flsm(data: FLSMInput):
    result = calculate_flsm(data.base_network, data.num_subnets, data.hosts_per_subnet)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "FLSM calculation error"))
    return result

# --- CISCO GENERATOR ENDPOINTS ---
@app.post("/api/generate/acl")
def api_generate_acl(data: ACLInput):
    result = generate_cisco_acl(data.network, data.acl_number, data.action)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "ACL generation error"))
    return result

@app.post("/api/generate/ospf")
def api_generate_ospf(data: OSPFInput):
    result = generate_ospf_statement(data.network, data.area, data.process_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "OSPF generation error"))
    return result

# --- QUIZ ENDPOINTS ---
@app.get("/api/quiz/questions")
def api_quiz_questions(count: int = 5):
    return generate_quiz_questions(count)

@app.post("/api/quiz/scores", response_model=QuizScoreResponse)
def api_save_score(data: QuizScoreCreate, db: Session = Depends(get_db)):
    percentage = (data.score / data.total) * 100 if data.total > 0 else 0.0
    db_score = QuizScore(
        username=data.username,
        score=data.score,
        total=data.total,
        percentage=round(percentage, 2)
    )
    db.add(db_score)
    db.commit()
    db.refresh(db_score)
    return db_score

@app.get("/api/quiz/leaderboard", response_model=List[QuizScoreResponse])
def api_get_leaderboard(limit: int = 10, db: Session = Depends(get_db)):
    return db.query(QuizScore).order_by(QuizScore.percentage.desc()).limit(limit).all()


# --- AI PLANNER ENDPOINT ---
@app.post("/api/ai/plan")
def api_ai_plan(data: AIInput):
    return get_network_advice(data.query, data.api_key)

# --- SAVED PLANS ENDPOINTS ---
@app.post("/api/plans", response_model=SavedPlanResponse)
def api_save_plan(data: SavedPlanCreate, db: Session = Depends(get_db)):
    db_plan = SavedPlan(
        name=data.name,
        description=data.description,
        base_network=data.base_network,
        plan_type=data.plan_type,
        plan_data=data.plan_data
    )
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@app.get("/api/plans", response_model=List[SavedPlanResponse])
def api_list_plans(db: Session = Depends(get_db)):
    return db.query(SavedPlan).order_by(SavedPlan.timestamp.desc()).all()

@app.delete("/api/plans/{plan_id}")
def api_delete_plan(plan_id: int, db: Session = Depends(get_db)):
    plan = db.query(SavedPlan).filter(SavedPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(plan)
    db.commit()
    return {"message": "Plan deleted successfully"}

# --- NETDESIGNER ENDPOINTS ---
@app.post("/api/designer/plan")
def api_designer_plan(data: DesignerInput):
    result = design_network_plan(data.model_dump())
    if not result["success"]:
        raise HTTPException(status_code=400, detail="Designer error")
    return result

@app.post("/api/designer/lab")
def api_designer_lab(data: DesignerInput):
    design = design_network_plan(data.model_dump())
    if not design["success"]:
        raise HTTPException(status_code=400, detail="Designer error")
    lab_text = generate_packet_tracer_lab(design)
    return {"success": True, "lab_guide": lab_text}

@app.post("/api/designer/validate")
def api_designer_validate(data: DesignerInput):
    result = validate_network_design(data.model_dump())
    if not result["success"]:
        raise HTTPException(status_code=400, detail="Validation engine error")
    return result

# --- ARCHITECT ENDPOINTS ---
@app.post("/api/architect/design")
def api_architect_design(data: ArchitectInput):
    design = design_architect_plan(data.model_dump())
    if not design["success"]:
        raise HTTPException(status_code=400, detail="Architect engine failed")
    docs = get_hld_lld_documents(data.model_dump(), design)
    return {**design, "docs": docs}

@app.post("/api/architect/translate")
def api_architect_translate(data: TranslateInput):
    result = translate_cisco_to_vendor(data.cisco_config, data.target_vendor)
    return {"success": True, "translated_config": result}

@app.post("/api/architect/troubleshoot")
def api_architect_troubleshoot(data: TroubleshootInput):
    result = analyze_cli_logs(data.cli_log)
    return result

@app.post("/api/architect/heatmap")
def api_architect_heatmap(data: HeatmapInput):
    result = calculate_wlan_heatmap(data.width, data.length, data.floors)
    return result

@app.post("/api/architect/validate-design")
def api_architect_validate_design(data: ArchitectInput):
    design = design_architect_plan(data.model_dump())
    if not design["success"]:
        raise HTTPException(status_code=400, detail="Architect engine failed")
    result = validate_architect_design(data.model_dump(), design)
    return result

@app.post("/api/architect/export-project")
def api_architect_export_project(data: ArchitectInput):
    design = design_architect_plan(data.model_dump())
    if not design["success"]:
        raise HTTPException(status_code=400, detail="Architect engine failed")
    result = export_rzpkt_project(data.model_dump(), design)
    return result

@app.post("/api/analyzer/analyze")
def api_analyzer_analyze(data: AnalyzerInput):
    try:
        result = parse_cisco_config(data.file_content)
        return {"success": True, "analysis": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Analyzer error: {str(e)}")


