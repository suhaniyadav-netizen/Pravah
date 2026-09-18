from typing import Optional
from pydantic import BaseModel

class ComplaintCreate(BaseModel):
    """Payload for a new citizen complaint."""
    ward_id: str
    severity: str  # Expected: "Low" | "Medium" | "High"
    description: Optional[str] = None
    timestamp: Optional[str] = None
    image_url: Optional[str] = None

class DrainageUpdate(BaseModel):
    """Payload for an admin drainage update."""
    ward_id: str
    drainage_capacity: int
    is_cleaned: bool

class RiskSummary(BaseModel):
    """Top-level dashboard counts."""
    totalWards: int
    highRiskCount: int
    mediumRiskCount: int

class PredictionResponse(BaseModel):
    """Response for the prediction endpoint."""
    hours: int
    predictedFloods: int