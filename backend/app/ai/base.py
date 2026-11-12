from abc import ABC, abstractmethod

class LLMError(Exception):
    """Ошибка провайдера с понятным пользователю текстом."""
    def __init__(self, user_message: str, fatal: bool = False):
        super().__init__(user_message)
        self.user_message = user_message
        self.fatal = fatal  # fatal: ключ/квота/настройка — повторять бессмысленно

class LLMProvider(ABC):
    name = "base"
    def __init__(self, model: str):
        self.model = model

    @abstractmethod
    def configured(self) -> bool: ...

    @abstractmethod
    def generate(self, system: str, user: str, max_tokens: int, json_mode: bool = True) -> str:
        """Один запрос без повторов."""
