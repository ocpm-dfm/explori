from typing import List, Dict, Tuple

from pydantic import BaseModel


class FrontendFriendlyTraceThreshold(BaseModel):
    count: int
    threshold: float


class FrontendFriendlyTrace(BaseModel):
    actions: List[int]
    thresholds: Dict[str, FrontendFriendlyTraceThreshold]


FrontendFriendlyCounts = List[Tuple[float, int]]

class FrontendFriendlyNode(BaseModel):
    label: str
    counts: Dict[str, FrontendFriendlyCounts]
    ocel_counts: FrontendFriendlyCounts
    traces: List[int]


class FrontendFriendlyEdge(BaseModel):
    source: int
    target: int
    counts: FrontendFriendlyCounts
    traces: List[int]


class FrontendFriendlyDFM(BaseModel):
    thresholds: List[float]
    traces: List[FrontendFriendlyTrace]
    nodes: List[FrontendFriendlyNode]
    subgraphs: Dict[str, List[FrontendFriendlyEdge]]