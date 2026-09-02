from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import httpx
from app.core.dependencies import get_current_user
from app.models.user import User
from app.config import settings

router = APIRouter(prefix="/chatbot", tags=["chatbot"])

class ChatQuery(BaseModel):
    query: str
    session_id: str | None = None

@router.post("/query")
async def chatbot_query(body: ChatQuery, current_user: User = Depends(get_current_user)):
    """مساعد طبي — يرسل السؤال إلى Agent Server ويرجع الإجابة"""
    payload = {
        "message": body.query,
        "session_id": body.session_id or f"user_{current_user.id}",
        "user_id": str(current_user.id),
        "user_name": current_user.full_name,
        "role": str(current_user.role) if hasattr(current_user, "role") else "patient"
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(settings.AGENT_SERVICE_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            
            # استخراج الرسالة من رد الـ Agent Server
            reply = data.get("response") or data.get("message") or data.get("reply") or str(data)
            return {"message": reply, "data": data}
            
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"فشل الاتصال بخدمة الذكاء الاصطناعي (Agent Server): {str(exc)}"
        )

