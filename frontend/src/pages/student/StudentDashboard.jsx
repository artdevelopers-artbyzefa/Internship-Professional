import React from 'react';
import Card from '../../components/ui/Card.jsx';
import Alert from '../../components/ui/Alert.jsx';
import NoticeModal from '../../components/notice/NoticeModal.jsx';
import Phase1EligibilityBanner from '../../components/student/Phase1EligibilityBanner.jsx';

export default function StudentDashboard({ user }) {
  const [showAlert, setShowAlert] = React.useState(true);
  const isProfileComplete = user.fatherName && user.section && user.dateOfBirth && user.profilePicture;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const extractProgram = (reg) => {
    if (!reg) return 'N/A';
    const parts = reg.split('-');
    if (parts.length >= 2) return parts[1];
    return 'N/A';
  };

  const InfoItem = ({ label, value, grow = 0 }) => (
    <div className={`p-3.5 border-b border-r last:border-r-0 flex flex-col justify-center min-h-[60px] ${grow ? 'md:col-span-2' : ''}`}>
      <span className="text-[10px] font-black text-gray-400 tracking-widest leading-none mb-1.5">{label} :</span>
      <span className="font-bold text-gray-700 truncate">{value || 'N/A'}</span>
    </div>
  );

  const ProfileTable = () => (
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm text-[13px] mb-8">
      <div className="flex flex-col lg:flex-row">
        {/* Profile Image Section */}
        <div className="lg:w-40 bg-gray-50 flex items-center justify-center p-4 border-r">
          <div className="w-32 h-32 rounded-xl bg-white border shadow-sm overflow-hidden flex items-center justify-center group relative">
            {user.profilePicture ? (
              <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <i className="fas fa-user text-4xl text-gray-200"></i>
            )}
          </div>
        </div>

        {/* Info Grid Section */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 border-t lg:border-t-0">
          <InfoItem label="Name" value={user.name} grow={1} />
          <InfoItem label="Roll No" value={user.reg} />

          <InfoItem label="Father Name" value={user.fatherName} />
          <InfoItem label="Registered Course" value={user.registeredCourse || 'Internship'} />

          <InfoItem label="Program" value={extractProgram(user.reg)} />
          <InfoItem label="Current Section" value={user.section} />

          <InfoItem label="Date of Birth" value={formatDate(user.dateOfBirth)} />
          <InfoItem label="Faculty Supervisor" value={user.assignedFaculty?.name || user.internshipAgreement?.officeFacultySupervisor || 'N/A'} />

          <InfoItem label="Site Supervisor" value={user.assignedCompanySupervisor || user.internshipAgreement?.officeSiteSupervisor || 'N/A'} />
          <InfoItem label="Company Name" value={user.assignedCompany || user.internshipRequest?.companyName || 'N/A'} grow={1} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Student Dashboard</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Institutional profile and academic overview at CUI Abbottabad.</p>
        </div>
      </div>

      <NoticeModal />

      {/* Phase 1 Eligibility Banner — only visible when registration phase is active */}
      <Phase1EligibilityBanner user={user} />

      {(!isProfileComplete && showAlert) && (
        <Alert type="error" className="mb-8" onClose={() => setShowAlert(false)}>
          <div className="flex items-center justify-between">
            <span><strong>Profile Incomplete:</strong> Please update your Father's Name, Section, Date of Birth, and Profile Picture to unlock all portal features.</span>
          </div>
        </Alert>
      )}

      <ProfileTable />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-l-4 border-l-blue-500">
            <h3 className="text-sm font-black text-primary tracking-widest mb-4 flex items-center justify-between">
              <span><i className="fas fa-bullhorn text-secondary mr-2"></i> Announcements</span>
              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Recent</span>
            </h3>
            <div className="py-10 text-center text-gray-400 italic text-sm">
              No recent announcements from the Internship Office.
            </div>
          </Card>
        </div>

        <Card title="Portal Quick Links" className="h-full">
          <div className="space-y-2">
            <QuickLink icon="fa-user-pen" label="Update My Profile" path="/student/profile" color="blue" />
            <QuickLink icon="fa-file-signature" label="Internship Approval" path="/student/request" color="green" />
            <QuickLink icon="fa-file-contract" label="Student Agreement" path="/student/agreement" color="amber" />
            <QuickLink icon="fa-chart-pie" label="Academic Results" path="/student/results" color="purple" />
          </div>
        </Card>
      </div>
    </div>
  );
}

const QuickLink = ({ icon, label, path, color }) => (
  <a href={path} className={`flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-gray-100 hover:bg-gray-50 transition-all group`}>
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shadow-sm bg-white border group-hover:scale-110 transition-transform`}>
      <i className={`fas ${icon} text-${color}-500`}></i>
    </div>
    <span className="text-sm font-bold text-gray-600 group-hover:text-primary transition-colors">{label}</span>
    <i className="fas fa-chevron-right ml-auto text-[10px] text-gray-300"></i>
  </a>
);
