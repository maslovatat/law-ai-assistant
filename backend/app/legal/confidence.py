"""Legal Confidence Engine: проверяемые критерии 0–100. Модель оценку не выставляет.
Это демонстрационная оценка качества подготовки, а не вероятность правильности ответа."""
import re
from datetime import date
from . import categories as C
from . import research

WEIGHTS = {"completeness": 30, "evidence": 20, "contradictions": 20, "norms": 10, "requirements": 10, "consistency": 10}
LABELS = {"completeness": "Полнота данных", "evidence": "Подтверждающие документы", "contradictions": "Отсутствие противоречий",
          "norms": "Актуальность норм", "requirements": "Корректность требований", "consistency": "Согласованность выводов"}
BIG_AMOUNT = 500_000  # демонстрационный порог

CRITICAL_PATTERNS = [
    (r"здоровь|травм|погиб|смерт|больниц|госпитал", "Упоминается вред жизни или здоровью"),
    (r"уголовн|мошеннич|угрожа|угроз|кража|украл|полици|прокуратур", "Возможны признаки уголовно наказуемых деяний"),
    (r"несовершеннолет|ребён|ребен", "В деле участвуют несовершеннолетние"),
    (r"выселен|право собственности|регистрац.{0,10}сделк|ипотек|наследств|раздел имущества", "Сложный вопрос о правах на недвижимость или имущество"),
    (r"банкрот|алимент|развод", "Семейный или банкротный вопрос — требуется юрист"),
]

def evaluate(profile: str | None, facts: dict[str, str], files: list[dict], contradictions: list[dict],
             free_text: str = "") -> dict:
    details, critical = {}, []
    req = C.required_fields(profile)
    prof = C.PROFILES.get(profile or "")

    # 1. полнота
    filled = [k for k in req if facts.get(k) and facts[k] != C.UNKNOWN]
    details["completeness"] = _d(100 * len(filled) / len(req) if req else 0,
                                 f"Заполнено {len(filled)} из {len(req)} обязательных сведений")
    # 2. доказательства
    if prof:
        ev = prof["evidence"]
        types = {f.get("doc_type"): f for f in files}
        pts = 0
        for kind, _ in ev:
            f = types.get(kind) or (files[0] if kind == "any" and files else None)
            if f:
                pts += 1.0 if f.get("verified") else 0.7
        details["evidence"] = _d(100 * pts / len(ev), f"Найдено подтверждений: {sum(1 for k,_ in ev if k in types or (k=='any' and files))} из {len(ev)}; "
                                 "непроверенные пользователем документы засчитываются частично")
    else:
        details["evidence"] = _d(0, "Категория не определена")
    # 3. противоречия
    firm = [c for c in contradictions if c.get("file_verified")]
    details["contradictions"] = _d(max(0, 100 - 50 * len(firm)),
                                   f"Противоречий с проверенными документами: {len(firm)}; "
                                   f"предварительных (по непроверенным файлам): {len(contradictions) - len(firm)}")
    if firm:
        critical.append("Данные пользователя противоречат проверенным документам")
    # 4. нормы
    norms = research.for_profile(profile, facts.get("requirement"))
    if not norms:
        details["norms"] = _d(0, "В демо-базе нет норм для этого дела")
        critical.append("Не найдено правовое обоснование в базе — вывод без юриста недопустим")
    else:
        ok = all(n.get("source") and n.get("actual_date") for n in norms)
        verified = all(n.get("verified") for n in norms)
        details["norms"] = _d(100 if (ok and verified) else 70 if ok else 30,
                              f"Норм найдено: {len(norms)}. " + ("" if verified else "Источник и дата указаны, но сверка с официальным текстом не проведена (максимум 70)"))
    # 5. требования
    r = facts.get("requirement")
    if r and prof and r in prof["allowed_req"]:
        s, note = 100, "Требование допустимо для этой категории"
        mk = prof["money"]
        if r in ("refund", "compensation") and not (facts.get(mk) and facts.get(mk) not in (C.UNKNOWN, "0")):
            s, note = 50, "Денежное требование без указанной суммы"
    elif r:
        s, note = 20, "Требование не типично для категории"
    else:
        s, note = 0, "Требование не сформулировано"
    details["requirements"] = _d(s, note)
    # 6. согласованность
    s, notes = 100, []
    if not profile:
        s, notes = 0, ["категория не определена"]
    d1 = facts.get(prof["date"]) if prof else None
    if d1 and d1 != C.UNKNOWN:
        try:
            if date.fromisoformat(d1) > date.today():
                s -= 50; notes.append("дата в будущем")
            elif (date.today() - date.fromisoformat(d1)).days > 3 * 365:
                critical.append("С момента событий прошло более 3 лет — возможен пропуск срока исковой давности")
        except ValueError:
            s -= 30; notes.append("некорректная дата")
    pd, dd = facts.get("purchase_date"), facts.get("defect_date")
    if pd and dd and C.UNKNOWN not in (pd, dd) and dd < pd:
        s -= 40; notes.append("недостаток обнаружен раньше покупки")
    if prof:
        v = facts.get(prof["money"])
        if v and v != C.UNKNOWN:
            try:
                if float(v) < 0:
                    s -= 40; notes.append("отрицательная сумма")
                if float(v) > BIG_AMOUNT:
                    critical.append(f"Крупная сумма (> {BIG_AMOUNT:,} руб.) — рекомендуется юрист".replace(",", " "))
            except ValueError:
                pass
    details["consistency"] = _d(max(0, s), "; ".join(notes) or "Явных несостыковок не найдено")

    blob = (free_text + " " + " ".join(v for v in facts.values() if v != C.UNKNOWN)).lower()
    for pat, msg in CRITICAL_PATTERNS:
        if re.search(pat, blob):
            critical.append(msg)
    if profile == "real_estate":
        critical.append("Категория «Недвижимость» в демо обрабатывается только с участием юриста")

    score = round(sum(details[k]["score"] * WEIGHTS[k] / 100 for k in WEIGHTS))
    critical = list(dict.fromkeys(critical))
    if critical or score < 65:
        level = "lawyer"
    elif score < 85:
        level = "review"
    else:
        level = "auto"
    return {"score": score, "level": level, "critical": critical, "details": details,
            "weights": WEIGHTS, "labels": LABELS,
            "disclaimer": "Демонстрационная оценка качества подготовки по проверяемым критериям. "
                          "Это не статистическая вероятность правильности вывода и не юридическое заключение.",
            "thresholds": {"auto": 85, "review": 65}}

def _d(score, note):
    return {"score": round(max(0, min(100, score))), "note": note}

LEVEL_TEXT = {
    "auto": "Данных достаточно, критических рисков не выявлено — можно переходить к подготовке документа.",
    "review": "Нужна дополнительная проверка: ответьте на уточняющие вопросы или добавьте документы.",
    "lawyer": "Рекомендуется передать дело юристу: слишком мало данных либо выявлены критические риски.",
}
