import { useState } from "react";
import { useStore } from "../app/ShipmentStore";
import { SenderForm } from "../components/shipment/SenderForm";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { PrototypeNotice } from "../components/shipment/PrototypeNotice";
import { type SenderProfile, type NotificationSetting } from "../types/domain";

const notificationOptions: Array<{ value: NotificationSetting; label: string }> = [
  { value: "all", label: "Все уведомления" },
  { value: "important", label: "Только важные" },
  { value: "none", label: "Не отправлять уведомления" },
];

/** Страница профиля отправителя (docs/prototype2.md §11). */
export function ProfilePage() {
  const { state, dispatch } = useStore();
  const [profile, setProfile] = useState<SenderProfile>(() => ({ ...state.senderProfile }));
  const [hasChanges, setHasChanges] = useState(false);

  const handleFieldChange = (field: keyof SenderProfile, value: unknown) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Build a Sender from the profile for the form
  const senderFromProfile: Partial<import("../types/domain").Sender> = {
    type: profile.type,
    name: profile.name,
    email: profile.email,
    code: profile.organization ? undefined : undefined,
    organization: profile.organization,
    individual: profile.individual,
    address: profile.address,
    addressString: profile.addressString,
  };

  const handleSave = () => {
    dispatch({ type: "saveProfile", profile });
    setHasChanges(false);
  };

  const handleCancel = () => {
    setProfile({ ...state.senderProfile });
    setHasChanges(false);
  };

  return (
    <div className="stack">
      <div className="page-header">
        <h1>Профиль отправителя</h1>
        <p className="page-header__subtitle">
          Настройки профиля используются при создании новых отправлений. Данные сохраняются локально.
        </p>
      </div>

      <Card title="Данные отправителя">
        <SenderForm
          sender={senderFromProfile}
          onChange={(s) => {
            handleFieldChange("name", s.name ?? "");
            if (s.email !== undefined) handleFieldChange("email", s.email);
            if (s.organization !== undefined) handleFieldChange("organization", s.organization);
            if (s.individual !== undefined) handleFieldChange("individual", s.individual);
            if (s.address !== undefined) handleFieldChange("address", s.address);
            if (s.addressString !== undefined) handleFieldChange("addressString", s.addressString);
            if (s.type !== undefined) handleFieldChange("type", s.type);
            setHasChanges(true);
          }}
          profileSource={true}
        />

        <div className="field">
          <label className="field__label" htmlFor="notifications">Уведомления</label>
          <select
            id="notifications"
            className="select"
            value={profile.notificiations}
            onChange={(e) => handleFieldChange("notificiations", e.target.value as NotificationSetting)}
          >
            {notificationOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </Card>

      <div className="card">
        <div className="card__header">
          <div>
            <div className="card__title">Демонстрационный профиль</div>
            <div className="card__meta">Все данные синтетические</div>
          </div>
        </div>
        <PrototypeNotice variant="inline" />
      </div>

      <div className="btn-row">
        <Button variant="primary" onClick={handleSave} disabled={!hasChanges}>
          Сохранить
        </Button>
        <Button onClick={handleCancel} disabled={!hasChanges}>
          Отмена
        </Button>
      </div>

      {state.notice ? (
        <div className="notice" role="status">
          <span className="notice__marker">i</span>
          <div>
            <strong>{state.notice.title}</strong>
            <br />
            {state.notice.message}
          </div>
        </div>
      ) : null}
    </div>
  );
}
