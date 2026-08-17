from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import ReputationLog, Farmer, Buyer, ActorTypeEnum
from app.schemas import ReputationSummary, ReputationLogOut

router = APIRouter(prefix="/reputation", tags=["Reputation & Trust"])


@router.get("/{actor_type}/{id}", response_model=ReputationSummary)
async def get_reputation_profile(
    actor_type: ActorTypeEnum,
    id: int,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve reputation score and complete transaction event history for a Farmer or Buyer."""
    name = "Unknown"
    score = 0

    if actor_type == ActorTypeEnum.FARMER:
        res = await db.execute(select(Farmer).where(Farmer.id == id))
        farmer = res.scalar_one_or_none()
        if not farmer:
            raise HTTPException(status_code=404, detail="Farmer not found")
        name = farmer.name
        score = farmer.reputation_score
    elif actor_type == ActorTypeEnum.BUYER:
        res = await db.execute(select(Buyer).where(Buyer.id == id))
        buyer = res.scalar_one_or_none()
        if not buyer:
            raise HTTPException(status_code=404, detail="Buyer not found")
        name = buyer.name
        score = buyer.reputation_score

    # Fetch logs
    logs_res = await db.execute(
        select(ReputationLog)
        .where(
            ReputationLog.actor_type == actor_type,
            ReputationLog.actor_id == id
        )
        .order_by(ReputationLog.created_at.desc())
    )
    logs = logs_res.scalars().all()

    return ReputationSummary(
        actor_type=actor_type,
        actor_id=id,
        name=name,
        score=score,
        history=[
            ReputationLogOut(
                id=l.id,
                actor_type=l.actor_type,
                actor_id=l.actor_id,
                event=l.event,
                score_delta=l.score_delta,
                created_at=l.created_at
            ) for l in logs
        ]
    )
