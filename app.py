import streamlit as st
from datetime import datetime

st.set_page_config(
    page_title="Legal Case",
    page_icon="⚖️",
    layout="wide"
)

# --- Хранилище данных ---
if "cases" not in st.session_state:
    st.session_state.cases = []


# --- Слова-маркеры сложности ---
# Если пользователь упомянул их в описании — дело уходит юристу.
COMPLEX_KEYWORDS = [
    "суд", "судебн", "иск", "спор", "обман", "мошенн",
    "отказ", "отказал", "угроз", "травм", "ущерб",
    "авари", "дтп", "наследств", "недвижим",
]


def log_event(case, what, who="Система"):
    """Добавляет запись в журнал событий дела."""
    case["events"].append({
        "when": datetime.now(),
        "what": what,
        "who": who,
    })


def create_case(description):
    """Создаёт новое дело."""
    case_id = len(st.session_state.cases) + 1
    case = {
        "id": case_id,
        "number": f"LC-{datetime.now().strftime('%Y%m%d')}-{case_id:04d}",
        "created_at": datetime.now(),
        "description": description,
        "status": "Сбор информации",
        "next_action": "Уточнить факты и получить недостающие материалы",
        "responsible": "Пользователь",
        "facts": [],
        "documents": [],
        "events": [],
        "requires_lawyer": False,
        "lawyer_reasons": [],
    }
    return case


def check_if_lawyer_needed(case):
    """
    Проверяет дело на признаки сложности.
    Возвращает список причин, почему нужен юрист.
    Если список пуст — дело типовое.
    """
    reasons = []

    # 1. Описание слишком короткое
    if len(case["description"].strip()) < 15:
        reasons.append("Слишком краткое описание — не хватает данных")

    # 2. Слова-маркеры сложности в описании
    text = case["description"].lower()
    for word in COMPLEX_KEYWORDS:
        if word in text:
            reasons.append(f"В описании упомянуто: «{word}»")
            break

    # 3. Нет фактов (пользователь не заполнил анкету)
    if len(case["facts"]) == 0:
        reasons.append("Не заполнена анкета с фактами")

    # 4. Нет документов
    if len(case["documents"]) == 0:
        reasons.append("Не приложено ни одного документа")

    return reasons


def run_auto_check(case):
    """
    Запускает автопроверку и, если нужно,
    переводит дело к юристу.
    """
    reasons = check_if_lawyer_needed(case)

    if reasons:
        case["requires_lawyer"] = True
        case["responsible"] = "Юрист"
        case["status"] = "Требуется юрист"
        case["next_action"] = "Проверить правовую позицию и материалы"
        case["lawyer_reasons"] = reasons
        log_event(
            case,
            "Система передала дело юристу: " + "; ".join(reasons),
            who="Система",
        )
    else:
        case["requires_lawyer"] = False
        case["responsible"] = "Пользователь"
        case["status"] = "Проверка материалов"
        case["next_action"] = (
            "Устранить противоречия и подтвердить достаточность документов"
        )
        case["lawyer_reasons"] = []
        log_event(
            case,
            "Система подтвердила типовой маршрут (юрист не требуется)",
            who="Система",
        )

    return reasons


def render_interview(case):
    """Анкета уточняющих вопросов."""
    st.markdown("#### Уточняющие вопросы")

    with st.form(key=f"interview_form_{case['id']}"):
        purchase_date = st.date_input("Когда был куплен товар?")
        defect = st.text_input(
            "В чём дефект товара?",
            placeholder="Например: перестал включаться через 2 недели"
        )
        seller = st.text_input(
            "Кто продавец?",
            placeholder="Название магазина или ИП"
        )
        prior_contacts = st.text_area(
            "Были ли предыдущие обращения к продавцу?",
            placeholder="Например: писал в чат поддержки, ответа не было"
        )
        desired_result = st.text_input(
            "Какой результат вы хотите?",
            placeholder="Например: возврат денег или замена товара"
        )

        submitted = st.form_submit_button(
            "Сохранить ответы",
            type="primary"
        )

        if submitted:
            case["facts"].append({
                "name": "Дата покупки",
                "value": str(purchase_date),
                "source": "Пользователь",
            })
            case["facts"].append({
                "name": "Дефект",
                "value": defect,
                "source": "Пользователь",
            })
            case["facts"].append({
                "name": "Продавец",
                "value": seller,
                "source": "Пользователь",
            })
            case["facts"].append({
                "name": "Предыдущие обращения",
                "value": prior_contacts,
                "source": "Пользователь",
            })
            case["facts"].append({
                "name": "Желаемый результат",
                "value": desired_result,
                "source": "Пользователь",
            })

            log_event(
                case,
                "Пользователь ответил на уточняющие вопросы",
                who="Пользователь",
            )

            # Автопроверка после заполнения анкеты
            run_auto_check(case)

            st.success("Ответы сохранены. Система проверила дело.")
            st.rerun()


def render_documents(case):
    """Блок загрузки и списка документов дела."""
    st.markdown("#### Документы по делу")

    st.write(
        "Приложите подтверждающие документы: чек, гарантийный талон, "
        "переписку с продавцом и т.п."
    )

    uploaded_files = st.file_uploader(
        "Загрузите документы",
        accept_multiple_files=True,
        type=["pdf", "jpg", "jpeg", "png", "docx"],
        key=f"uploader_{case['id']}",
    )

    if uploaded_files:
        for f in uploaded_files:
            already = any(
                d["name"] == f.name for d in case["documents"]
            )
            if already:
                continue

            case["documents"].append({
                "name": f.name,
                "size_kb": round(f.size / 1024, 1),
                "uploaded_at": datetime.now(),
            })
            log_event(
                case,
                f"Загружен документ: {f.name}",
                who="Пользователь",
            )

        st.success("Документы добавлены в дело.")
        # После загрузки документов — снова автопроверка
        run_auto_check(case)
        st.rerun()

    if case["documents"]:
        st.markdown("**Загруженные документы:**")
        for d in case["documents"]:
            st.write(
                f"📎 **{d['name']}** — "
                f"{d['size_kb']} КБ, "
                f"загружен {d['uploaded_at']:%d.%m.%Y %H:%M}"
            )
    else:
        st.info("Пока не загружено ни одного документа.")


def render_lawyer_status(case):
    """
    Показывает статус проверки и причины передачи юристу.
    Никаких кнопок «Передать юристу» — система делает это сама.
    """
    st.markdown("#### Проверка системой")

    if case["requires_lawyer"]:
        st.error(
            "🔴 Система передала дело юристу.\n\n"
            "**Причины:**"
        )
        for r in case["lawyer_reasons"]:
            st.write(f"- {r}")

        st.write(f"**Ответственный:** {case['responsible']}")

        # Кнопка возврата — доступна, как если бы ей пользовался юрист
        if st.button(
            "Вернуть пользователю (действие юриста)",
            key=f"return_{case['id']}"
        ):
            case["requires_lawyer"] = False
            case["responsible"] = "Пользователь"
            case["status"] = "Проверка материалов"
            case["next_action"] = (
                "Дополнить материалы по замечаниям юриста"
            )
            case["lawyer_reasons"] = []
            log_event(
                case,
                "Юрист вернул дело пользователю",
                who="Юрист",
            )
            st.success("Дело возвращено пользователю.")
            st.rerun()
    else:
        st.success(
            "✅ Система считает дело типовым. "
            "Юрист не требуется на этом этапе."
        )
        st.write(
            "Система проверяет: описание, факты, документы, "
            "ключевые слова. Если появится признак сложности — "
            "дело автоматически уйдёт юристу."
        )


# --- Заголовок ---
st.title("⚖️ Legal Case")
st.subheader("Платформа ведения юридических дел")
st.write(
    "Помогаем пользователю пройти путь "
    "от описания проблемы до результата по делу."
)
st.divider()

# --- Две вкладки ---
tab_new, tab_cases = st.tabs(["➕ Новое дело", "📂 Мои дела"])

# ---------- Вкладка 1: создание дела ----------
with tab_new:
    st.header("Создать новое дело")

    problem = st.text_area(
        "Опишите вашу ситуацию",
        placeholder=(
            "Например: я купил смартфон, "
            "но через две недели он перестал включаться..."
        )
    )

    if st.button("Создать дело", type="primary"):
        if problem.strip():
            case = create_case(problem)
            log_event(case, "Дело создано пользователем", who="Пользователь")
            st.session_state.cases.append(case)
            st.success(f"Дело {case['number']} создано.")
            st.write(f"**Статус:** {case['status']}")
            st.write(f"**Следующий шаг:** {case['next_action']}")
        else:
            st.warning("Сначала опишите вашу ситуацию.")

# ---------- Вкладка 2: список дел ----------
with tab_cases:
    st.header("Мои дела")

    if not st.session_state.cases:
        st.info("Пока нет ни одного дела.")
    else:
        for case in st.session_state.cases:
            st.subheader(f"Дело {case['number']}")
            st.write(f"**Статус:** {case['status']}")
            st.write(f"**Следующий шаг:** {case['next_action']}")
            st.write(f"**Ответственный:** {case['responsible']}")

            if case["requires_lawyer"]:
                st.error("🔴 Требуется юрист")

            with st.expander("Описание ситуации"):
                st.write(case["description"])

            if case["status"] == "Сбор информации":
                render_interview(case)

            with st.expander("Документы", expanded=True):
                render_documents(case)

            with st.expander("Проверка системой", expanded=True):
                render_lawyer_status(case)

            with st.expander("Факты по делу"):
                if not case["facts"]:
                    st.write("Пока нет сохранённых фактов.")
                else:
                    for f in case["facts"]:
                        st.write(
                            f"**{f['name']}:** {f['value']} "
                            f"_(источник: {f['source']})_"
                        )

            with st.expander("Журнал событий"):
                for e in case["events"]:
                    st.write(
                        f"{e['when']:%d.%m.%Y %H:%M} — {e['what']} ({e['who']})"
                    )

            st.divider()