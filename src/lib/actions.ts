import type { ActionId, CaseAction } from "../types/domain";

/**
 * Каталог действий дела. Кнопки явно описывают действие, а не «продолжение»
 * (docs/prototype.md §24).
 */
export const actionCatalogue: Record<ActionId, CaseAction> = {
  START_INTERVIEW: {
    id: "START_INTERVIEW",
    label: "Начать AI-интервью",
    description: "AI задаст уточняющие вопросы и зафиксирует факты дела с источниками.",
    variant: "primary",
    roles: ["user"],
  },
  RESTART_INTERVIEW: {
    id: "RESTART_INTERVIEW",
    label: "Пройти интервью заново",
    description: "Интервью можно пройти повторно, чтобы дополнить или изменить сведения.",
    variant: "secondary",
    roles: ["user"],
  },
  VIEW_FACTS: {
    id: "VIEW_FACTS",
    label: "Посмотреть факты и источники",
    variant: "secondary",
    roles: ["user", "lawyer"],
  },
  CHOOSE_PEACEFUL: {
    id: "CHOOSE_PEACEFUL",
    label: "Попробовать мирное решение",
    description: "Будет создана задача связаться с продавцом.",
    variant: "primary",
    roles: ["user"],
  },
  CHOOSE_CLAIM: {
    id: "CHOOSE_CLAIM",
    label: "Подготовить претензию",
    description: "Перед подготовкой документа система проверит наличие необходимых данных.",
    variant: "primary",
    roles: ["user"],
  },
  CHOOSE_LAWYER: {
    id: "CHOOSE_LAWYER",
    label: "Обратиться к юристу",
    description: "Материалы дела будут переданы юристу для профессиональной проверки.",
    variant: "primary",
    roles: ["user"],
  },
  START_CLAIM: {
    id: "START_CLAIM",
    label: "Сформировать проект претензии",
    description: "Документ будет подготовлен на основе фактов дела.",
    variant: "primary",
    roles: ["user"],
  },
  CONFIRM_CLAIM: {
    id: "CONFIRM_CLAIM",
    label: "Подтвердить документ",
    description: "Документ станет готов к отправке. Проверьте адресата, содержание и приложения.",
    variant: "primary",
    roles: ["user"],
  },
  MOCK_SEND: {
    id: "MOCK_SEND",
    label: "Имитировать отправку",
    description:
      "Демонстрационная отправка. В реальной системе документ передаётся через согласованный юридически значимый канал связи.",
    variant: "primary",
    roles: ["user"],
    confirm: {
      title: "Демонстрация отправки",
      message:
        "В реальной системе документ будет передан через согласованный юридически значимый канал связи. В прототипе отправка имитируется: реального документа отправлено не было.",
      confirmLabel: "Имитировать отправку",
    },
  },
  REPORT_PEACEFUL_RESULT: {
    id: "REPORT_PEACEFUL_RESULT",
    label: "Сообщить результат обращения к продавцу",
    description: "Укажите, чем закончилось обращение. От этого зависит следующий шаг дела.",
    variant: "primary",
    roles: ["user"],
    form: {
      title: "Что произошло?",
      description: "Выберите вариант, соответствующий результату обращения.",
      fields: [
        {
          id: "result",
          label: "Результат обращения",
          type: "choice",
          options: [
            { value: "seller_agreed", label: "Продавец согласился решить проблему" },
            { value: "seller_refused", label: "Продавец отказался" },
            { value: "no_response", label: "Ответ не получен" },
            { value: "no_agreement", label: "Договориться не удалось" },
            { value: "other_way", label: "Хочу продолжить другим способом" },
          ],
        },
      ],
    },
  },
  REPORT_COUNTERPARTY_RESPONSE: {
    id: "REPORT_COUNTERPARTY_RESPONSE",
    label: "Сообщить о полученном ответе",
    description: "Сообщите, получен ли ответ контрагента.",
    variant: "primary",
    roles: ["user"],
    form: {
      title: "Что произошло с ожиданием ответа?",
      fields: [
        {
          id: "response",
          label: "Результат ожидания",
          type: "choice",
          options: [
            { value: "reply_received", label: "Получен ответ продавца" },
            { value: "deadline_expired", label: "Срок истёк, ответа нет" },
          ],
        },
      ],
    },
  },
  REVIEW_COUNTERPARTY_REPLY: {
    id: "REVIEW_COUNTERPARTY_REPLY",
    label: "Открыть ответ продавца",
    variant: "primary",
    roles: ["user", "lawyer"],
  },
  CLAIM_NOT_SATISFIED: {
    id: "CLAIM_NOT_SATISFIED",
    label: "Ответ не удовлетворяет, продолжить дело",
    description: "Дело вернётся к подготовке следующего этапа.",
    variant: "primary",
    roles: ["user"],
  },
  START_COURT_PREP: {
    id: "START_COURT_PREP",
    label: "Начать подготовку следующего этапа",
    description: "Система покажет, какие данные ещё нужно получить.",
    variant: "primary",
    roles: ["user"],
  },
  TRANSFER_TO_LAWYER: {
    id: "TRANSFER_TO_LAWYER",
    label: "Передать дело юристу",
    description: "Материалы дела будут переданы юристу для профессиональной проверки.",
    variant: "primary",
    roles: ["user"],
  },
  SEND_MOCK_CONTRADICTION_CLARIFICATION: {
    id: "SEND_MOCK_CONTRADICTION_CLARIFICATION",
    label: "Уточнить дату покупки",
    description:
      "Источники расходятся. Система не выбирает значение самостоятельно: выбор делает человек.",
    variant: "primary",
    roles: ["user"],
    form: {
      title: "Уточните противоречие в данных",
      description:
        "Выберите значение, которому вы доверяете, или передайте дело юристу для проверки. Система не определит правильную дату самостоятельно.",
      fields: [
        {
          id: "value",
          label: "Какая дата покупки верна?",
          type: "choice",
          options: [
            { value: "__variant_user", label: "10.08.2026 — по моему сообщению" },
            { value: "__variant_receipt", label: "12.08.2026 — по чеку" },
          ],
        },
        {
          id: "comment",
          label: "Комментарий (необязательно)",
          type: "text",
          placeholder: "Например: помню, что покупала в среду, чек могли пробить позже",
        },
      ],
    },
  },
  ANSWER_LAWYER: {
    id: "ANSWER_LAWYER",
    label: "Ответить юристу",
    description: "Ответ попадёт в переписку и будет зафиксирован в истории дела.",
    variant: "primary",
    roles: ["user"],
    form: {
      title: "Ответ юристу",
      description: "Ответ будет добавлен в переписку по делу и в историю.",
      fields: [
        {
          id: "answer",
          label: "Ваш ответ",
          type: "text",
          placeholder: "Например: 20 сентября",
        },
      ],
    },
  },
  SEND_LAWYER_MESSAGE: {
    id: "SEND_LAWYER_MESSAGE",
    label: "Отправить сообщение пользователю",
    variant: "primary",
    roles: ["lawyer"],
    form: {
      title: "Новое сообщение пользователю",
      description: "Сообщение появится в карточке дела у пользователя.",
      fields: [
        {
          id: "text",
          label: "Текст сообщения",
          type: "text",
          placeholder: "Например: уточните, пожалуйста, дату обращения к продавцу",
        },
      ],
    },
  },
  APPLY_LAWYER_DECISION: {
    id: "APPLY_LAWYER_DECISION",
    label: "Зафиксировать решение юриста",
    description: "Решение юриста отображается отдельно от предложения AI.",
    variant: "primary",
    roles: ["lawyer"],
    form: {
      title: "Решение по делу",
      description:
        "Решение фиксируется как отдельная сущность дела и не изменяет предложения AI.",
      fields: [
        {
          id: "type",
          label: "Вариант решения",
          type: "choice",
          options: [
            { value: "approve_continuation", label: "Одобрить дальнейшее продолжение" },
            { value: "request_data", label: "Запросить дополнительные данные" },
            { value: "return_to_user", label: "Вернуть пользователю на уточнение" },
            { value: "close_case", label: "Закрыть дело" },
            { value: "other", label: "Выбрать другое действие" },
          ],
        },
        {
          id: "comment",
          label: "Комментарий юриста",
          type: "text",
          placeholder: "Например: прошу подтвердить дату обращения и приложить чек",
        },
      ],
    },
  },
  CLOSE_CASE: {
    id: "CLOSE_CASE",
    label: "Закрыть дело",
    description: "Дело будет помечено как завершённое, история сохранится.",
    variant: "danger",
    roles: ["user"],
    confirm: {
      title: "Прекратить сопровождение дела?",
      message:
        "Вы действительно хотите прекратить сопровождение дела? История и собранные материалы останутся в деле.",
      confirmLabel: "Закрыть дело",
    },
  },
};

export function getAction(id: ActionId): CaseAction {
  return actionCatalogue[id];
}