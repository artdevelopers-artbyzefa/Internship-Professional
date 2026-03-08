import React from 'react';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';

export default function StudentCertificate() {
  return (
    <Card>
      <div className="flex items-center justify-between mb-5">
        <div className="text-sm font-bold text-primary">
          <i className="fas fa-award text-secondary mr-2"></i>Internship Certificate
        </div>
        <Button variant="primary" size="sm"><i className="fas fa-download"></i> Download</Button>
      </div>

      <div className="border-4 border-primary rounded-2xl p-10 text-center bg-gradient-to-br from-blue-50 to-lightbg">
        <div className="text-5xl text-primary mb-4"><i className="fas fa-medal"></i></div>
        <div className="text-xs tracking-[0.3rem] text-secondary font-bold mb-2">CERTIFICATE OF COMPLETION</div>
        <div className="text-sm text-gray-400 mb-4">This is to certify that</div>
        <div className="text-3xl font-extrabold text-primary mb-2">Ali Hassan</div>
        <div className="text-sm text-gray-400 mb-4">Registration: 2021-CUI-ATD-001</div>
        <div className="text-sm text-gray-700 max-w-md mx-auto mb-8">
          has successfully completed the internship program at{' '}
          <strong>TechSoft Pvt Ltd, Islamabad</strong> from February 1, 2025 to March 29, 2025.
        </div>
        <div className="flex justify-around flex-wrap gap-4 mt-4">
          {['HOD Signature', 'Internship Coordinator', 'University Stamp'].map(s => (
            <div key={s} className="text-center">
              <div className="w-28 border-t-2 border-primary pt-2 text-xs text-gray-400">{s}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
