import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { shipmentService } from "../lib/shipmentService";
import { useStore } from "../app/ShipmentStore";
import { WizardStepper } from "../components/shipment/WizardStepper";
import { DocumentUploader } from "../components/shipment/DocumentUploader";
import { DocumentPreview } from "../components/shipment/DocumentPreview";
import { SenderForm } from "../components/shipment/SenderForm";
import { RecipientForm } from "../components/shipment/RecipientForm";
import { ShipmentSummary } from "../components/shipment/ShipmentSummary";
import { StatusBadge } from "../components/shipment/StatusBadge";
import { PrototypeNotice, DemoResultNotice } from "../components/shipment/PrototypeNotice";
import { mockDisclaimer } from "../types/labels";
import { formatDisplayDate } from "../lib/mock/clock";
import {
  type DocumentAttachment,
  type Sender,
  type Recipient,
  type ShipmentDraft,
  type Shipment,
  WIZARD_STEPS,
} from "../types/domain";
import type { ActionOutcome } from "../lib/shipmentService";

type SendingPhase = "idle" | "preparing" | "processing" | "completed";

const MAX_FILE_SIZE_MB = 5;

/** Страница мастера создания отправления (docs/prototype2.md §5, §12). */
export function CreateShipmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get("draft");
  const { state, dispatch, getDraft } = useStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [document, setDocument] = useState<DocumentAttachment | undefined>(undefined);
  const [sender, setSender] = useState<Partial<Sender>>({});
  const [recipient, setRecipient] = useState<Partial<Recipient>>({});
  const [verificationChecked, setVerificationChecked] = useState(false);
  const [sendingPhase, setSendingPhase] = useState<SendingPhase>("idle");
  const [submissionResult, setSubmissionResult] = useState<ActionOutcome<Shipment> | null>(null);

  const profile = state.senderProfile;

  useEffect(() => {
    if (draftId) {
      const draft = getDraft(draftId);
      if (draft) {
        setCurrentStep(draft.currentStep);
        if (draft.document) setDocument(draft.document);
        if (draft.sender) setSender(draft.sender);
        if (draft.recipient) setRecipient(draft.recipient);
        dispatch({ type: "dismissNotice" });
      }
    }
  }, [draftId, getDraft, dispatch]);

  const saveDraft = useCallback(() => {
    dispatch({
      type: "saveDraft",
      draft: {
        currentStep,
        completedSteps: Array.from({ length: currentStep }, (_, i) => i),
        document,
        sender: sender.name ? (sender as Sender) : undefined,
        recipient: recipient.type ? (recipient as Recipient) : undefined,
      },
    });
  }, [dispatch, currentStep, document, sender, recipient]);

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      saveDraft();
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      saveDraft();
      setCurrentStep(currentStep - 1);
    }
  };

  function canProceed(): boolean {
    switch (currentStep) {
      case 0:
        return Boolean(document);
      case 1:
        return Boolean(sender.name && recipient.type && recipient.addressString);
      case 2:
        return verificationChecked;
      default:
        return false;
    }
  }

  const handleSend = async () => {
    setSendingPhase("preparing");
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSendingPhase("processing");

    const draft: ShipmentDraft = {
      id: draftId ?? `draft-temp-${Date.now()}`,
      createdAt: formatDisplayDate(new Date().toISOString().slice(0, 10)),
      updatedAt: formatDisplayDate(new Date().toISOString().slice(0, 10)),
      currentStep,
      completedSteps: [0, 1, 2, 3],
      document: document!,
      sender: sender as Sender,
      recipient: recipient as Recipient,
    };

    const result = await shipmentService.submitShipment(draft);
    setSubmissionResult(result);
    setSendingPhase("completed");
  };

  const handleViewResult = () => {
    if (submissionResult?.data?.id) {
      navigate(`/shipments/${submissionResult.data.id}`);
    }
  };

  if (sendingPhase === "completed" && submissionResult?.data) {
    return (
      <div className="stack">
        <DemoResultNotice>Демонстрационная операция завершена. Письмо не отправлено.</DemoResultNotice>

        <div className="card">
          <div className="card__header">
            <div>
              <div className="card__title">Демонстрационный номер отправления (ШПИ)</div>
              <div className="card__meta">Синтетический идентификатор</div>
            </div>
            <StatusBadge status={submissionResult.data.status} />
          </div>

          <div className="kv-list">
            <div className="kv-list__key">Идентификатор запроса</div>
            <div className="kv-list__value mono-num">{submissionResult.data.requestCode}</div>
            <div className="kv-list__key">ШПИ</div>
            <div className="kv-list__value mono-num">{submissionResult.data.mailId ?? "—"}</div>
            <div className="kv-list__key">Дата создания</div>
            <div className="kv-list__value">{formatDisplayDate(submissionResult.data.createdAt)}</div>
          </div>

          {submissionResult.notice ? (
            <div className="notice" style={{ marginTop: "var(--space-4)" }}>
              <span className="notice__marker">i</span>
              <div>
                <strong>{submissionResult.notice.title}</strong>
                <br />
                {submissionResult.notice.message}
              </div>
            </div>
          ) : null}
        </div>

        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={handleViewResult}>
            Перейти к карточке отправления
          </button>
          <Link to="/" className="btn">
            На главную
          </Link>
        </div>

        <PrototypeNotice variant="inline" />
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div className="page-header__row">
          <div>
            <h1>Новое отправление</h1>
            <p className="page-header__subtitle">
              Загрузите PDF, укажите отправителя и получателя, проверьте данные и отправьте демонстрационную копию.
            </p>
          </div>
          <PrototypeNotice variant="inline" />
        </div>
      </div>

      <WizardStepper
        steps={WIZARD_STEPS.length}
        currentStep={currentStep}
        completedSteps={Array.from({ length: currentStep }, (_, i) => i)}
      />

      {state.notice ? (
        <div className="notice notice--success" role="status">
          <span className="notice__marker">✓</span>
          <div>
            <strong>{state.notice.title}</strong>
            <br />
            {state.notice.message}
          </div>
        </div>
      ) : null}

      {renderStep(currentStep)}

      <div className="btn-row">
        <button type="button" className="btn" onClick={handleBack} disabled={currentStep === 0}>
          Назад
        </button>
        {currentStep < WIZARD_STEPS.length - 1 ? (
          <button type="button" className="btn btn--primary" onClick={handleNext} disabled={!canProceed()}>
            Далее
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={handleSend} disabled={!canProceed()}>
            Отправить демонстрационно
          </button>
        )}
      </div>
    </div>
  );

  function renderStep(step: number): ReactNode {
    switch (WIZARD_STEPS[step]) {
      case "document":
        return renderDocumentStep();
      case "sender_recipient":
        return renderSenderStep();
      case "verification":
        return renderVerificationStep();
      case "sending":
        return renderSendingStep();
      default:
        return <></>;
    }
  }

  function renderDocumentStep(): ReactNode {
    return (
      <div className="stack stack--tight">
        <DocumentUploader
          document={document}
          onUpload={setDocument}
          onRemove={() => setDocument(undefined)}
        />
        {document ? (
          <DocumentPreview document={document} available />
        ) : (
          <p className="subtle small">
            Поддерживается формат PDF (PDF/A-1), максимум {MAX_FILE_SIZE_MB} МБ.
            Реальная обработка не выполняется.
          </p>
        )}
      </div>
    );
  }

  function renderSenderStep(): ReactNode {
    return (
      <div className="grid grid--two" style={{ gap: "var(--space-4)" }}>
        <SenderForm
          sender={sender}
          onChange={setSender}
          profileSource={sender.name === profile?.name && Boolean(profile)}
        />
        <RecipientForm recipient={recipient} onChange={setRecipient} />
      </div>
    );
  }

  function renderVerificationStep(): ReactNode {
    const isReady = Boolean(sender.name && recipient.type && recipient.addressString);
    return (
      <ShipmentSummary
        data={{ document, sender: sender as Sender, recipient: recipient as Recipient }}
        profile={profile}
        verificationChecked={verificationChecked}
        onVerificationChange={setVerificationChecked}
        actions={
          isReady ? (
            <button type="button" className="btn btn--primary" onClick={handleNext} disabled={!verificationChecked}>
              Далее к отправке
            </button>
          ) : (
            <Link to="/create" className="btn btn--primary">
              Заполнить данные
            </Link>
          )
        }
      />
    );
  }

  function renderSendingStep(): ReactNode {
    if (sendingPhase === "idle") {
      return (
        <div className="stack stack--tight">
          <p>Нажмите кнопку ниже, чтобы начать демонстрационную отправку.</p>
          <button type="button" className="btn btn--primary" onClick={handleSend} disabled={!verificationChecked}>
            Отправить демонстрационно
          </button>
        </div>
      );
    }

    return (
      <div className="card">
        <div className="card__header">
          <div>
            <div className="card__title">Демонстрация отправки через ИС ЭПС</div>
            <div className="card__meta">{sendingPhaseLabel()}</div>
          </div>
        </div>
        <div className="stack stack--tight">
          <p>{sendingPhaseMessage()}</p>
          {sendingPhase === "completed" && submissionResult?.data ? (
            <div className="notice notice--success">
              <span className="notice__marker">✓</span>
              <div>
                <strong>Демонстрационная операция завершена</strong>
                <br />
                Синтетический номер:{" "}
                <span className="mono-num">{submissionResult.data.mailId ?? submissionResult.data.requestCode}</span>
                <br />
                {mockDisclaimer}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
}

function sendingPhaseLabel(): string {
  return "Демонстрационная операция";
}

function sendingPhaseMessage(): string {
  return "Демонстрационный режим. Письмо не отправлено. Симулируется последовательность статусов ИС ЭПС.";
}
