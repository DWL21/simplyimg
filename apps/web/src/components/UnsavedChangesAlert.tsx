interface UnsavedChangesAlertProps {
  className?: string;
}

export default function UnsavedChangesAlert({ className = '' }: UnsavedChangesAlertProps) {
  const mergedClassName = ['unsaved-alert', className].filter(Boolean).join(' ');

  return (
    <div className={mergedClassName} role="alert">
      <strong>임시 작업 안내</strong>
      <span>현재 작업은 브라우저에만 임시로 유지됩니다. 새로고침하거나 탭을 닫으면 업로드한 파일과 변경사항이 사라집니다.</span>
    </div>
  );
}
