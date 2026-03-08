import React from 'react';
import Card from '../../components/ui/Card.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import UploadArea from '../../components/ui/UploadArea.jsx';

export default function AgreementPage() {
  return (
    <Card>
      <div className="text-sm font-bold text-primary mb-5">Agreement Form</div>
      <Alert type="info">Download the agreement, sign it, and upload a scanned copy.</Alert>
      <div className="flex gap-2 flex-wrap">
        <Button variant="primary" size="sm"><i className="fas fa-download"></i> Download Template</Button>
        <Button variant="outline" size="sm"><i className="fas fa-cloud-arrow-up"></i> Upload Signed Copy</Button>
      </div>
      <UploadArea label="Drop your signed agreement here" hint="PDF only · max 5MB" />
    </Card>
  );
}
