import React from 'react';
import Card from '../../components/ui/Card.jsx';
import Alert from '../../components/ui/Alert.jsx';
import NoticeModal from '../../components/notice/NoticeModal.jsx';
import Phase1EligibilityBanner from '../../components/student/Phase1EligibilityBanner.jsx';
import NoticeItem from '../../components/notice/NoticeItem.jsx'; // Added import
import { apiRequest } from '../../utils/api.js';

export default function StudentDashboard({ user, isEligible, isPhase1 }) {
  const [showAlert, setShowAlert] = React.useState(true);
  const isProfileComplete = user.fatherName && user.section && user.dateOfBirth && user.profilePicture;

  // They are completely locked down if they are ineligible during Phase 1
  const isLocked = isPhase1 && !isEligible;

  const [notices, setNotices] = React.useState([]);
  const [loadingNotices, setLoadingNotices] = React.useState(true);

  React.useEffect(() => {
    const fetchNotices = async () => {
      try {
        const data = await apiRequest('/notices/my');
        if (data) setNotices(data);
      } catch (err) {
        console.error('Announcements Fetch Error:', err);
      } finally {
        setLoadingNotices(false);
      }
    };
    fetchNotices();
  }, []);

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
      <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Student Dashboard</h2>
          <p className="text-xs md:text-sm text-gray-500 font-medium mt-1">Institutional profile and academic overview at CUI Abbottabad.</p>
        </div>
      </div>

      <NoticeModal />

      {/* Phase 1 Eligibility Banner — only visible when registration phase is active */}
      <Phase1EligibilityBanner user={user} />

      {(!isProfileComplete && showAlert && !isLocked) && (
        <Alert type="error" className="mb-8" onClose={() => setShowAlert(false)}>
          <div className="flex items-center justify-between">
            <span><strong>Profile Incomplete:</strong> Please update your Father's Name, Section, Date of Birth, and Profile Picture to unlock all portal features.</span>
          </div>
        </Alert>
      )}

      {!isLocked && <ProfileTable />}

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-6">
          <Card className="border-l-4 border-l-blue-500 shadow-xl border-primary/10">
            <h3 className="text-sm font-black text-primary tracking-widest mb-6 flex items-center justify-between px-2">
              <span><i className="fas fa-bullhorn text-secondary mr-2"></i> Official Announcements</span>
              <span className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase font-black tracking-widest">
                {notices.length} New Feed
              </span>
            </h3>

            <div className="space-y-4">
              {loadingNotices ? (
                <div className="py-20 text-center">
                  <i className="fas fa-circle-notch fa-spin text-3xl text-primary/20 mb-4"></i>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Syncing Feed...</p>
                </div>
              ) : notices.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {notices.map(notice => (
                    <NoticeItem key={notice._id} notice={notice} />
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100 mx-2">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <i className="fas fa-check-double text-gray-200 text-2xl"></i>
                  </div>
                  <p className="text-sm font-bold text-gray-400">All caught up! No recent announcements.</p>
                  <p className="text-[10px] text-gray-300 uppercase tracking-widest mt-1">Check back later for updates</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

