from typing import Optional
from pydantic import BaseModel, Field, field_validator
from .legal import categories as C

class RegisterIn(BaseModel):
    email: str = Field(min_length=5, max_length=120, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=6, max_length=200)

class LoginIn(BaseModel):
    email: str
    password: str

class ConversationIn(BaseModel):
    title: Optional[str] = Field(default=None, max_length=120)

class RenameIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)

class MessageIn(BaseModel):
    content: str = Field(min_length=1, max_length=4000)

    @field_validator("content")
    @classmethod
    def not_blank(cls, v):
        if not v.strip():
            raise ValueError("Сообщение не может быть пустым")
        return v.strip()

class FactIn(BaseModel):
    key: str
    value: str = Field(max_length=500)

class VerifyFileIn(BaseModel):
    verified: bool = True
    apply: list[str] = []

class VersionIn(BaseModel):
    content: str = Field(min_length=20, max_length=60000)
    note: Optional[str] = Field(default=None, max_length=200)

class DocumentIn(BaseModel):
    type: str = "claim"

class DispatchIn(BaseModel):
    document_version_id: int
    recipient_name: str = Field(min_length=2, max_length=200)
    recipient_address: str = Field(min_length=5, max_length=400)

class SettingsIn(BaseModel):
    provider: str
    model: Optional[str] = Field(default=None, max_length=100)

class AIResult(BaseModel):
    """Ответ модели: проверяется и очищается до применения."""
    reply: str = Field(min_length=1, max_length=3000)
    category: Optional[str] = None
    facts: dict[str, str] = {}

    @field_validator("category")
    @classmethod
    def known_category(cls, v):
        return v if v in C.PROFILES else None

    @field_validator("facts", mode="before")
    @classmethod
    def clean_facts(cls, v):
        out = {}
        if isinstance(v, dict):
            for k, val in v.items():
                if k in C.FIELDS and val not in (None, "", "null"):
                    out[k] = str(val)[:500]
        return out

class CaseStructured(BaseModel):
    category: Optional[str]
    problem: str
    facts: dict[str, str]
    requirements: list[str]
    missing_information: list[str]

class AIExtraction(BaseModel):
    """Сведения, извлечённые моделью из текста документа."""
    category: Optional[str] = None
    facts: dict[str, str] = {}

    @field_validator("category")
    @classmethod
    def known_category(cls, v):
        return v if v in C.PROFILES else None

    @field_validator("facts", mode="before")
    @classmethod
    def clean_facts(cls, v):
        out = {}
        if isinstance(v, dict):
            for k, val in v.items():
                if k in C.FIELDS and val not in (None, "", "null"):
                    out[k] = str(val)[:500]
        return out

class AIEditIn(BaseModel):
    instruction: Optional[str] = Field(default=None, max_length=1000)

class ApiKeyIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)

class ApiCaseIn(BaseModel):
    title: Optional[str] = Field(default=None, max_length=120)

class ApiMessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)

    @field_validator("message")
    @classmethod
    def not_blank(cls, v):
        if not v.strip():
            raise ValueError("Сообщение не может быть пустым")
        return v.strip()

class ApiDocIn(BaseModel):
    type: str = "claim"
