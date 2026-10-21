import Button from '../ui/Button';
import Modal from '../ui/Modal';

/**
 * Small confirmation dialog with Cancel / confirm actions.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.message
 * @param {boolean} [props.loading]
 * @param {string} [props.title]
 * @param {string} [props.confirmLabel]
 * @param {'primary'|'ghost'|'danger'|'link-danger'} [props.confirmVariant]
 */
export default function ConfirmDialog({
  open,
  message,
  onCancel,
  onConfirm,
  loading = false,
  title = 'Are you sure?',
  confirmLabel = 'Delete',
  confirmVariant = 'danger',
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={confirmVariant} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[13px] text-muted">{message}</p>
    </Modal>
  );
}
