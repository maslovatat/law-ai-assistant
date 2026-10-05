import type { CaseUser } from "../types/domain";

/** Синтетические mock-пользователи. Реальных персональных данных в проекте нет. */
export const users: CaseUser[] = [
  {
    id: "u-001",
    name: "Ирина Соколова",
    role: "user",
    title: "Пользователь",
    email: "i.sokolova@example-mail.demo",
    phone: "+7 900 000-00-01",
    note: "Демонстрационные контакты",
  },
  {
    id: "l-001",
    name: "Анна Верещагина",
    role: "lawyer",
    title: "Юрист по защите прав потребителей",
    organization: "Партнёрская юридическая практика (демо)",
    email: "a.vereshchagina@example-law.demo",
    phone: "+7 900 000-00-02",
    note: "Демонстрационные контакты",
  },
];

export const demoUser = users[0];
export const demoLawyer = users[1];

export function getUserById(id: string | undefined): CaseUser | undefined {
  if (!id) return undefined;
  return users.find((u) => u.id === id);
}

export function getDemoUserByRole(role: "user" | "lawyer"): CaseUser {
  return role === "user" ? demoUser : demoLawyer;
}
