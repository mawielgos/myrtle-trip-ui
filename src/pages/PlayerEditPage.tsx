import { buttonStyle, dangerButtonStyle, errorBoxStyle, successBoxStyle, pageContainerWideStyle } from "../styles/uiStyles";
import PageHeader from "../components/common/PageHeader";
import { formatPlayerValue } from "./playerEditLogic";
import { usePlayerEditController } from "./usePlayerEditController";
import PlayerEditInfoForm from "./PlayerEditInfoForm";
import PlayerEditSummary from "./PlayerEditSummary";

export default function PlayerEditPage() {
  const {
    isNew, form, playerDetail, loading, saving, error, saveMessage,
    computedDisplayName, navigateIfConfirmed, updateField, handleSave, handleToggleActive,
  } = usePlayerEditController();

  if (loading) {
    return (
      <div style={{ padding: "16px" }}>
        <p>Loading player...</p>
      </div>
    );
  }

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title={isNew ? "Add Player" : "Edit Player"}
        subtitle={
          isNew || !playerDetail
            ? "Create the player record and save."
            : `${playerDetail.active ? "Active" : "Inactive"} • GHIN ${formatPlayerValue(playerDetail.ghinNumber)}`
        }
        actions={
          <>
            <button style={buttonStyle} onClick={() => void navigateIfConfirmed("/admin/players")}>
              Player Master
            </button>
            {!isNew && playerDetail ? (
              <button
                style={playerDetail.active ? dangerButtonStyle : buttonStyle}
                onClick={() => void handleToggleActive()}
              >
                {playerDetail.active ? "Deactivate" : "Activate"}
              </button>
            ) : null}
          </>
        }
      />

      {error && <div style={errorBoxStyle}>{error}</div>}
      {saveMessage ? <div style={successBoxStyle}>{saveMessage}</div> : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)",
          gap: "16px",
          alignItems: "start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <PlayerEditInfoForm form={form} computedDisplayName={computedDisplayName} saving={saving} updateField={updateField} onSave={() => void handleSave()} onCancel={() => void navigateIfConfirmed("/admin/players")} />
        </div>

        <div style={{ minWidth: 0 }}>
          <PlayerEditSummary isNew={isNew} playerDetail={playerDetail} form={form} computedDisplayName={computedDisplayName} />
        </div>
      </div>
    </div>
  );
}