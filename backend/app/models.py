from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from datetime import datetime
from .database import Base

class QuizScore(Base):
    __tablename__ = "quiz_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True, default="Anonymous")
    score = Column(Integer)
    total = Column(Integer)
    percentage = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

class SavedPlan(Base):
    __tablename__ = "saved_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    base_network = Column(String)
    plan_type = Column(String)  # 'VLSM' or 'FLSM'
    plan_data = Column(Text)     # JSON encoded string of allocation details
    timestamp = Column(DateTime, default=datetime.utcnow)
