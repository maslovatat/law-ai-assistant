import type { SenderProfile } from "../types/domain";

/**
 * Демонстрационный профиль отправителя.
 * Локальные настройки, сохраняются в localStorage и используются при создании новых
 * черновиков. Используются синтетические данные (docs/prototype2.md §26).
 */
export const defaultSenderProfile: SenderProfile = {
  type: "ul",
  name: "ООО «Юридическая Фирма «Защита Прав»»",
  email: "claims@ur-firm-zashchita.ru",
  organization: {
    name: "ООО «Юридическая Фирма «Защита Прав»»",
    inn: "7700000001",
    kpp: "770001001",
    ogrn: "1027700132195",
  },
  addressString: "125009, г. Москва, ул. Тверская, д. 7",
  address: {
    postalCode: "125009",
    region: "Московская область",
    city: "Москва",
    street: "Тверская",
    houseNumber: "7",
  },
  notificiations: "all",
  isDemo: true,
};
